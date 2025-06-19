import { FastifyReply, FastifyRequest } from "fastify";
import { CreateReservationBody, createReservationSchema } from "./schema";
import { getShowTimeSeats } from "./data";
import { db } from "../../db";
import { reservations, seats } from "../../db/schema";
import { and, eq } from "drizzle-orm";

export async function createReservation(
  request: FastifyRequest<{ Body: CreateReservationBody }>,
  reply: FastifyReply
) {
  const result = createReservationSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }
  const { seats: requestedSeats, hallId, movieId, time } = result.data;
  const userId = request.user!.id;
  const res = await getShowTimeSeats({ hallId, movieId, time });
  if (!res) {
    return reply
      .status(400)
      .send({ message: "Could not find seats for this show time" });
  }

  const { available, requested } = getSeatsAvailability(
    requestedSeats,
    res.reservedSeats
  );

  if (!requested.every((seat) => available.includes(seat))) {
    return reply.status(400).send({
      message: "Could not reserve requested seats",
      seats: {
        requested,
        available,
      },
    });
  }

  await db.transaction(async function (tx) {
    tx.update(seats)
      .set({
        reserved: Array.from(new Set([...requested, ...res.reservedSeats])),
      })
      .where(
        and(
          eq(seats.movieId, movieId),
          eq(seats.hallId, hallId),
          eq(seats.time, time)
        )
      );

    tx.insert(reservations).values({
      hallId,
      status: "pending",
      movieId,
      time,
      seats: expandSeats(requested),
      userId,
    });

    // kick-off payment flow
    // create ticket record and update witih payment flow
    // change reservation status to confirmed once payment is made
  });
}

function expandSeats(seats: string[]) {
  return seats.map((seat) =>
    seat.split("").reduce((acc, curr, idx) => {
      if (idx === 0) {
        acc.row = curr;
      } else {
        acc.number = Number(curr);
      }

      return acc;
    }, {} as { row: string; number: number })
  );
}

function validateSeat(seat: string) {
  // get hall layout
  // validate seat per hall layout and config
  return true;
}

function getSeatsAvailability(
  requestedSeats: string[],
  reservedSeats: string[]
) {
  const available = [];
  for (const seat of requestedSeats) {
    if (!reservedSeats.includes(seat)) available.push(seat);
  }

  return { requested: requestedSeats, available };
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
