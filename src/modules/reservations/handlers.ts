import { FastifyReply, FastifyRequest } from "fastify";
import { CreateReservationBody, createReservationSchema } from "./schema";
import {
  findReservationByIdAndUserId,
  findReservationById,
  findReservationsByUserId,
  insertReservation,
  updateReservation,
} from "./data";
import { startCheckoutSession } from "../payments/handlers/checkout";
import { checkAndMaybeReserve } from "../../lib/reservations";
import logger from "../../lib/logger";
import { validateRequestedSeats, validateShowTime } from "./validators";
import * as z from "zod";
import { mapReservation } from "./mappers";
import { getTotalAmountFromSeats } from "../../utils";

export async function createReservation(
  request: FastifyRequest<{
    Body: CreateReservationBody;
    Params: { hallId: number };
  }>,
  reply: FastifyReply
) {
  try {
    const hallId = request.params.hallId;
    const result = createReservationSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(422).send({
        message: "Failed to parse body",
        errors: z.treeifyError(result.error),
      });
    }

    const { seats: requestedSeats, movieId, time, sessionKey } = result.data;
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

    const { startTime, endTime } = showTime;
    // check whether seats are reserved or available
    const reserved = await checkAndMaybeReserve({
      startTime,
      endTime,
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

    const seats = reserved.reserved?.map((r) => ({
      seatId: r.seatId,
      price: {
        id: r.priceId,
        price: r.price,
      },
    }))!;
    // create a pending reservation record with seat details
    const reservation = await insertReservation({
      seats,
      totalAmount: getTotalAmountFromSeats(seats),
      hallId,
      movieId,
      startTime,
      endTime,
      userId,
    });

    if (!reservation) {
      // log: we should not normally enter this branch
      const errMsg =
        "Failed to insert reservation after seats were reserved. Insert returned falsy.";
      logger.error("reservations", errMsg, {
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
      });

      throw new Error(errMsg);
    }

    // create checkout session
    const checkoutSession = await startCheckoutSession(reservation);
    return reply.status(201).send({
      message: "Reservation created successfully. It is now in pending state",
      checkoutSession, // client will handle redirect
    });
  } catch (error) {
    console.log("Error:", { error });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function retryCreateReservation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  //
}

export async function getAllUserReservations(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.user?.id!;
    const reservations = await findReservationsByUserId({ userId });
    return reply.status(200).send({
      items: reservations.map((r) => mapReservation(r)),
      page: 1,
    });
  } catch (error) {
    console.log("Error:", { error });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function getReservation(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  try {
    const reservationId = request.params.id;
    const userId = request.user?.id!;

    const [r] = await findReservationByIdAndUserId({
      userId,
      id: reservationId,
    });

    if (!r) {
      return reply.status(404).send({
        message: "Reservation not found",
        errors: { id: reservationId },
      });
    }

    const { reservation, movie, hall } = r;

    return reply.status(200).send({
      reservation: mapReservation({ reservation, movie, hall }),
    });
  } catch (error) {
    console.log("Error:", { error });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function confirmReservation(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  try {
    const reservationId = request.params.id;
    // Find the reservation first
    const [r] = await findReservationById(reservationId);

    if (!r) {
      return reply.status(404).send({
        message: "Reservation not found",
        errors: { id: reservationId },
      });
    }

    const { reservation, movie, hall } = r;

    // If reservation is already confirmed, return it as is
    if (reservation.status === "confirmed") {
      return reply.status(200).send({
        message: "Reservation is already confirmed",
        reservation: mapReservation({ reservation, movie, hall }),
      });
    }

    if (reservation.status === "active") {
      return reply.status(200).send({
        message: "Reservation is already confirmed",
        reservation: mapReservation({ reservation, movie, hall }),
      });
    }

    // Update reservation status to confirmed if it's in pending state
    if (reservation.status === "pending") {
      const [updatedReservation] = await updateReservation(reservationId, {
        status: "confirmed",
      });

      if (!updatedReservation) {
        logger.error("reservations", "Could not update reservation", {
          operation: "confirmReservation",
          context: { reservationId },
        });
        throw new Error("Could not update reservation");
      }

      return reply.status(200).send({
        message: "Reservation confirmed successfully",
        reservation: mapReservation({
          reservation: updatedReservation,
          movie,
          hall,
        }),
      });
    }

    // If reservation is cancelled, we can't confirm it
    if (reservation.status === "cancelled") {
      return reply.status(400).send({
        message: "Cannot confirm a cancelled reservation",
        errors: { id: reservationId, status: reservation.status },
      });
    }

    // This should not happen as we have handled all statuses
    return reply.status(400).send({
      message: "Invalid reservation status",
      errors: { id: reservationId, status: reservation.status },
    });
  } catch (error) {
    console.log("Error:", { error });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function cancelReservation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // check reservation status
  // if status is cancelled, return with info that request is already cancelled
  // if status is pending, check the hold expiry time
  // if the time has passed, just set the reservation status to "cancelled"
  // if the time has not yet passed, reset the seat hold (setting it to the current time or null)
  // and set the reservation status to "cancelled"
  // return from the request with a 200
  // if the status is confirmed, we first check if the startTime is within
  // 1 hour away from the current time
  // if it is, reject the cancel request with info
  // if it is not within (i.e before that), reset the reserved seat holds
  // then call the payment processor with metadata about the ticket
  // start a refund and set the ticket's state to "processing"
  // return with info
}

// https://orm.drizzle.team/docs/overview
// https://fastify.dev/docs/latest/Reference/Errors/
