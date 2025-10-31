import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { LogData, reservedSeats, retryLog } from "../db/schema";
import {
  findReservedSeatsByShowTime,
  insertReservedSeats,
} from "../modules/reservations/data";

export async function checkAndMaybeReserve(data: {
  time: Date;
  hallId: number;
  seats: number[];
  userId: number;
  sessionKey: string;
  movieId: number;
}) {
  // Implementation:
  // - If no reserved rows exist for any requested seat: insert reserved rows for all requested seats and
  //   set a short hold expiry (HOLD_MS) for the current request and return success + reserved rows.
  // - Otherwise, ensure there are reserved rows for every requested seat (insert with expiresAt = null for missing ones),
  //   then compute which seats are "available" (expiresAt is null or has passed). If all requested seats are available,
  //   atomically set their expiry to HOLD_MS (a short hold) and return success. If not all are available, return success=false
  //   and include the list of currently available seats for error reporting.

  const reserved = await findReservedSeatsByShowTime(
    {
      hallId: data.hallId,
      time: data.time,
    },
    { seats: data.seats }
  );
  const HOLD_MS = 5 * 60 * 1000; // 5 minutes hold for in-flight reservation
  const now = Date.now();
  const holdExpiry = new Date(now + HOLD_MS);

  // No reserved rows at all -> initialize and hold them
  if (reserved.length === 0) {
    const toInsert = data.seats.map((seatId) => ({
      hallId: data.hallId,
      seatId,
      time: data.time,
      expiresAt: holdExpiry,
    }));

    await insertReservedSeats(toInsert);

    return { success: true, reserved: toInsert };
  }

  // If some reserved rows exist, ensure all requested seats have a reserved_seats row (create missing with expiresAt=null)
  const reservedMap = new Map(reserved.map((r) => [r.seatId, r]));
  const missingSeatIds = data.seats.filter((s) => !reservedMap.has(s));

  if (missingSeatIds.length > 0) {
    const toInit = missingSeatIds.map((seatId) => ({
      hallId: data.hallId,
      seatId,
      time: data.time,
      expiresAt: null,
    }));
    // initialize missing reserved seat rows with no expiry
    await db
      .insert(reservedSeats)
      .values([...toInit])
      .onConflictDoNothing({
        target: [
          reservedSeats.hallId,
          reservedSeats.seatId,
          reservedSeats.time,
        ],
      });
  }

  // Re-read current rows for the requested seats (some may have been inserted above)
  const allReserved = await findReservedSeatsByShowTime(
    { hallId: data.hallId, time: data.time },
    { seats: data.seats }
  );

  const availableSeatIds = allReserved
    .filter((r) => {
      if (!r.expiresAt) return true; // null/undefined expiry -> available
      const expiresAt = new Date(r.expiresAt).getTime();
      return expiresAt <= now; // expired -> available
    })
    .map((r) => r.seatId);

  // if all requested seats are available, set expiry to hold for this request
  if (availableSeatIds.length === data.seats.length) {
    const { hallId, movieId, sessionKey, userId, time } = data;
    await atomicallyUpdateReservedSeats({
      availableSeatIds,
      hallId,
      holdExpiry,
      movieId,
      time,
      userId,
      sessionKey,
    });

    const updated = await findReservedSeatsByShowTime(
      { hallId: data.hallId, time: data.time },
      { seats: data.seats }
    );

    return { success: true, reserved: updated };
  }

  // not all seats are available; return which seats are available for error reporting
  return { success: false, available: availableSeatIds };
}

async function atomicallyUpdateReservedSeats(data: {
  holdExpiry: Date;
  hallId: number;
  availableSeatIds: number[];
  time: Date;
  movieId: number;
  userId: number;
  sessionKey: string;
}) {
  db.transaction(async (tx) => {
    await tx
      .update(reservedSeats)
      .set({ expiresAt: data.holdExpiry })
      .where(
        and(
          eq(reservedSeats.hallId, data.hallId),
          eq(reservedSeats.time, data.time),
          inArray(reservedSeats.seatId, data.availableSeatIds)
        )
      );

    const log: LogData = {
      hallId: data.hallId,
      seatIds: data.availableSeatIds,
      time: data.time,
      status: "pending",
      movieId: data.movieId,
      userId: data.userId,
    };

    await tx.insert(retryLog).values({
      data: log,
      userId: data.userId,
      sessionKey: data.sessionKey,
    });
  });
}
