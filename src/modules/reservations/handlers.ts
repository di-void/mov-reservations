import { FastifyReply, FastifyRequest } from "fastify";
import { CreateReservationBody, createReservationSchema } from "./schema";
import { insertReservation } from "./data";
import { startCheckoutSession } from "../payments/handlers/checkout";
import { checkAndMaybeReserve } from "../../lib/reservations";
import { CustomError } from "../../lib/errors";
import { validateRequestedSeats, validateShowTime } from "./validators";
import * as z from "zod";

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
      return reply.status(400).send({ errors: z.treeifyError(result.error) });
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
    const showTime = await validateShowTime(hallId, time);
    if (!showTime) {
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
    const reservation = await insertReservation({
      seatIds: reserved.reserved?.map((r) => r.seatId)!,
      hallId,
      movieId,
      time,
      userId,
    });

    if (!reservation) {
      // log: we should not normally enter this branch
      throw new CustomError(
        "reservations",
        "Failed to insert reservation after seats were reserved. Insert returned falsy.",
        {
          operation: "createReservation",
          context: {
            movieId,
            hallId,
            time,
            userId,
            sessionKey,
            requestedSeats,
            reservedCount: reserved.reserved?.length ?? 0,
          },
        }
      );
    }

    // create checkout session
    const checkoutSession = await startCheckoutSession(reservation);
    return reply.status(201).send({
      message: "Pending reservation created successfully",
      checkoutSession, // client will handle redirect
    });
  } catch (error) {
    console.log("Error:", { error });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function retryCreateReservation() {
  //
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
  // cancel upcoming reservations
  // free up reserved seats
  // issue refund?
}

// https://orm.drizzle.team/docs/overview
// https://fastify.dev/docs/latest/Reference/Errors/
