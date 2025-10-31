import { FastifyReply, FastifyRequest } from "fastify";
import { CreateReservationBody, createReservationSchema } from "./schema";
import {
  findSeatsByHallId,
  findReservedSeatsByShowTime,
  findShowTimeByHallIdAndTime,
  insertReservedSeats,
  insertReservation,
} from "./data";
import { db } from "../../db";
import { and, eq, inArray } from "drizzle-orm";
import {
  reservations,
  reservedSeats,
  retryLog,
  type LogData,
} from "../../db/schema";

export async function createReservation(
  request: FastifyRequest<{ Body: CreateReservationBody }>,
  reply: FastifyReply
) {
  try {
    // when reservation request comes in
    // - example: {movieId: "mv-123", seats: ["a1","a2"], hallId: "hall-2", showTime: "12:00"}
    // load hall configs from database
    // check that requested seats are within hall configs to ensure it's not garbage
    // validate availability of seats for that movie showtime and hall
    // - check reserved_seats for reserved seats for partcular showtime and hall
    // - check the hold expiry time of requested seats
    // - if the hold has not expired, the seat is still reserved
    // - reject the request with error info
    // - if the hold has expired, the seat is free; set a short hold time for the in-flight reservation
    // - this is in case the current client abandons
    // - we create a pending reservation record
    // - initiate payment checkout session and redirect user to checkout url
    // - pass metadata about the reservation to the checkout session to propery identify the client request
    // - once payment has succeeded and we get a callback, extract metadata from webhook request
    // - if the notification comes after the hold has expired, we set the reservation to cancelled and issue a refund
    // - if the notification comes within the hold window, we extend the seat expiry by the movie duration
    // - and set the reservation status to confirmed
    const result = createReservationSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({ errors: result.error.format() });
    }

    const {
      seats: requestedSeats,
      hallId,
      movieId,
      time,
      sessionKey,
    } = result.data;
    const userId = request.user!.id;

    // validate showtime
    const isShowTimeValid = await validateShowTime(hallId, time);
    if (!isShowTimeValid) {
      return reply.status(400).send({
        message: "Can't make reservation - showtime is invalid",
        errors: { hallId, time },
      });
    }

    // validate seats
    const isSeatsValid = await validateRequestedSeats(requestedSeats, hallId);
    if (!isSeatsValid) {
      return reply.status(400).send({
        message: "Invalid seats",
        errors: { requested: requestedSeats },
      });
    }

    // check whether seats are reserved or available
    const reserved = await checkAndMaybeReserve({
      time,
      hallId,
      seats: requestedSeats,
      movieId,
      sessionKey,
      userId,
    });
    if (!reserved.success) {
      return reply.status(422).send({
        message: "Couldn't create reservation for requested seats",
        requested: requestedSeats,
        available: reserved.available,
      });
    }

    // create a pending reservation record with seat details
    const r = await insertReservation({
      seatIds: reserved.reserved?.map((r) => r.seatId)!,
      hallId,
      movieId,
      time,
      userId,
    });

    // initiate checkout session
  } catch (error) {
    console.log("Error:", { error });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function retryCreateReservation() {
  //
}

async function validateShowTime(hallId: number, time: Date) {
  const res = await findShowTimeByHallIdAndTime({ hallId, time });
  if (!res) {
    return null;
  }

  const now = Date.now();
  if (time.getMilliseconds() < now) return null;

  return res;
}

async function checkAndMaybeReserve(data: {
  time: Date;
  hallId: number;
  seats: number[];
  userId: number;
  sessionKey: string;
  movieId: number;
}) {
  const reserved = await findReservedSeatsByShowTime(
    {
      hallId: data.hallId,
      time: data.time,
    },
    { seats: data.seats }
  );
  // Implementation:
  // - If no reserved rows exist for any requested seat: insert reserved rows for all requested seats and
  //   set a short hold expiry (HOLD_MS) for the current request and return success + reserved rows.
  // - Otherwise, ensure there are reserved rows for every requested seat (insert with expiresAt = null for missing ones),
  //   then compute which seats are "available" (expiresAt is null or has passed). If all requested seats are available,
  //   atomically set their expiry to HOLD_MS (a short hold) and return success. If not all are available, return success=false
  //   and include the list of currently available seats for error reporting.

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
    await atomicUpdateReservedSeats({
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

async function atomicUpdateReservedSeats(data: {
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

async function validateRequestedSeats(seats: number[], hallId: number) {
  const res = await findSeatsByHallId({ seats, hallId });
  if (res.length < seats.length) {
    return false;
  }

  return true;
}

export async function getReservations(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // fetch all user reseravations
}

export async function cancelReservation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  //
}
