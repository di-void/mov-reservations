import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { reservations, reservedSeats, SeatMeta } from "../db/schema";
import { checkSeatsAvailabilityByShowTime } from "../modules/reservations/data";
import { getTotalAmountFromSeats } from "../utils";

async function tryInitReservedSeats(data: {
  seats: number[];
  showTime: { hallId: number; startTime: Date };
}) {
  const values = data.seats.map((sId) => ({
    seatId: sId,
    expiresAt: null,
    hallId: data.showTime.hallId,
    startTime: data.showTime.startTime,
  }));

  // check if requested seats have already been initialized
  // early return if they are already initialized
  // if not, initialize the seats with null expiry
  await db
    .insert(reservedSeats)
    .values(values)
    .onConflictDoNothing({
      target: [
        reservedSeats.hallId,
        reservedSeats.seatId,
        reservedSeats.startTime,
      ],
    });
}

async function createReservation(data: {
  seats: SeatMeta[];
  totalAmount: number;
  movieId: number;
  userId: number;
  showTime: { hallId: number; startTime: Date; endTime: Date };
  holdExpiry: Date;
}) {
  const { seats, showTime, holdExpiry, userId, movieId, totalAmount } = data;
  return await db.transaction(
    async (tx) => {
      // reserve seats and create reservation
      await tx
        .update(reservedSeats)
        .set({ expiresAt: holdExpiry })
        .where(
          and(
            eq(reservedSeats.hallId, showTime.hallId),
            eq(reservedSeats.startTime, showTime.startTime),
            inArray(
              reservedSeats.seatId,
              seats.map((s) => s.seatId)
            )
          )
        );

      // then return the created reservation
      return await tx
        .insert(reservations)
        .values({
          status: "pending",
          seats,
          startTime: showTime.startTime,
          endTime: showTime.endTime,
          userId,
          totalAmount,
          hallId: showTime.hallId,
          movieId,
        })
        .returning()
        .then((r) => r.at(0));
    },
    { behavior: "immediate" }
  );
}

export async function atomicallyCreateReservation(data: {
  startTime: Date;
  endTime: Date;
  hallId: number;
  seats: number[];
  userId: number;
  movieId: number;
}) {
  // lazily initialize requested seats
  await tryInitReservedSeats({
    seats: data.seats,
    showTime: { startTime: data.startTime, hallId: data.hallId },
  });

  const available = await checkSeatsAvailabilityByShowTime(
    { hallId: data.hallId, startTime: data.startTime },
    { seats: data.seats }
  );
  const availableSeatIds = available.map((a) => a.seatId);

  if (availableSeatIds.length === 0) {
    // if available rows are 0, then all requested seats
    // are definitely not available; return early with error info
    return { success: false, available: availableSeatIds };
  }

  if (availableSeatIds.length < data.seats.length) {
    // if available rows are less than requested seats length
    // then return early with error info as we can't fulfill the request atomically
    return { success: false, available: availableSeatIds };
  }

  // if available rows length is equal to requested seats length
  // proceed to hold the seats for a short time and create the pending reservation
  const HOLD_MS = 5 * 60 * 1000; // 5 minutes hold for in-flight reservation
  const now = Date.now();
  const holdExpiry = new Date(now + HOLD_MS);
  const seats = available.map((a) => ({
    seatId: a.seatId,
    price: {
      id: a.priceId,
      price: a.price,
    },
  }));

  const reservation = await createReservation({
    seats,
    holdExpiry,
    showTime: {
      hallId: data.hallId,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    movieId: data.movieId,
    totalAmount: getTotalAmountFromSeats(seats),
    userId: data.userId,
  });

  return { success: true, reservation };
}

export async function rollbackReservation(data: {
  reservationId: number;
  showTime: { hallId: number; startTime: Date };
  seats: number[];
}) {
  const { reservationId, seats, showTime } = data;

  await db.transaction(async (tx) => {
    // release seat holds
    await tx
      .update(reservedSeats)
      .set({ expiresAt: null })
      .where(
        and(
          eq(reservedSeats.hallId, showTime.hallId),
          eq(reservedSeats.startTime, showTime.startTime),
          inArray(reservedSeats.seatId, seats)
        )
      );

    // delete pending reservation
    await tx
      .delete(reservations)
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.status, "pending")
        )
      );
  });
}
