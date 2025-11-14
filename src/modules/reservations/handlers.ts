import { FastifyReply, FastifyRequest } from "fastify";
import { CreateReservationBody, createReservationSchema } from "./schema";
import {
  findConfirmedReservationByIdAndUserId,
  findReservationByIdAndUserId,
  findReservationsByUserId,
  updateReservationById,
} from "./data";
import {
  atomicallyCreateReservation,
  cancelReservation,
  rollbackReservation,
} from "../../lib/reservations";
import logger from "../../lib/logger";
import {
  atomicallyConfirmReservation,
  expireCheckoutSession,
  getCheckoutSession,
  startCheckoutSession,
} from "../../lib/payments";
import { validateRequestedSeats, validateShowTime } from "./validators";
import * as z from "zod";
import { mapReservation } from "./mappers";
import { tryCatch } from "../../utils";
import { insertNewRefundRequest } from "../refunds/data";

export async function createReservationHandler(
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

    const { seats: requestedSeats, movieId, time } = result.data;
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

    const res = await atomicallyCreateReservation({
      hallId,
      seats: requestedSeats,
      movieId,
      userId,
      endTime,
      startTime,
    });

    if (!res.success) {
      return reply.status(422).send({
        message: "Could not reserve requested seats",
        requested: requestedSeats,
        available: res.available,
      });
    }

    if (!res.reservation) {
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
          requestedSeats,
          res,
        },
      });

      throw new Error(errMsg);
    }

    // create checkout session
    const { error, data: checkoutSession } = await tryCatch(
      startCheckoutSession(res.reservation)
    );
    if (error) {
      logger.error("reservations", "Failed to start checkout session", {
        operation: "createReservation:startCheckoutSession",
        error,
      });

      await rollbackReservation({
        reservationId: res.reservation.id,
        seats: res.reservation.seats.map((s) => s.seatId),
        showTime: {
          startTime: res.reservation.startTime,
          hallId: res.reservation.hallId,
        },
      });

      return reply
        .status(500)
        .send({ message: "Failed to start checkout session" });
    }

    return reply.status(201).send({
      message: "Reservation created successfully. It is now in pending state",
      checkoutSession, // client will handle redirect
    });
  } catch (error) {
    logger.error("reservations", "Error creating reservation", {
      operation: "createReservation",
      error,
    });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function getAllUserReservationsHandler(
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
    logger.error("reservations", "Error getting all reservations", {
      operation: "getAllUserReservations",
      error,
    });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function getReservationHandler(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  try {
    const reservationId = request.params.id;
    const userId = request.user?.id!;

    const r = await findReservationByIdAndUserId({
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
    logger.error("reservations", "Error getting reservation", {
      operation: "getReservation",
      error,
    });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function confirmReservationHandler(
  request: FastifyRequest<{
    Params: { id: number };
  }>,
  reply: FastifyReply
) {
  const reservationId = request.params.id;
  const userId = request.user?.id!;

  try {
    // Find the reservation first
    const r = await findReservationByIdAndUserId({ id: reservationId, userId });

    if (!r) {
      return reply.status(404).send({
        message: "Reservation not found",
        errors: { id: reservationId },
      });
    }

    const { reservation, movie, hall } = r;

    switch (reservation.status) {
      case "confirmed":
        return reply.status(200).send({
          message: "Reservation is already confirmed",
          reservation: mapReservation({ reservation, movie, hall }),
        });
      case "cancelled":
        return reply.status(400).send({
          message: "Cannot confirm a cancelled reservation",
          errors: { id: reservationId, status: reservation.status },
        });
      case "pending":
        const checkoutId = reservation.checkoutId ?? "";
        const { data: checkoutSession, error } = await tryCatch(
          getCheckoutSession(checkoutId)
        );

        if (error) {
          logger.error("reservations", "Failed getting checkout session", {
            operation: "getCheckoutSession",
            context: { checkoutId, reservationId: reservation.id },
            error,
          });

          return reply.status(500).send({ message: "An error occurred" });
        }

        if (
          checkoutSession.status === "complete" &&
          checkoutSession.payment_status === "paid"
        ) {
          const result = await atomicallyConfirmReservation({
            reservation,
            movie,
            hall,
          });

          return reply.status(200).send({
            message: "Reservation confirmed successfully",
            reservation: mapReservation({
              reservation: result.reservation,
              movie: result.movie,
              hall: result.hall,
            }),
          });
        }

        logger.debug("reservations", "Reservation can't be confirmed", {
          operation: "confirmReservation",
          context: {
            checkoutSession,
            reservationId,
          },
        });

        return reply.status(422).send({
          message: "Couldn't confirm reservation",
        });
      default:
        logger.debug("reservations", "Invalid reservation status received", {
          operation: "confirmReservation",
          context: {
            reservation,
          },
        });
        return reply
          .status(400)
          .send({ message: "Invalid reservation status" });
    }
  } catch (error) {
    logger.error("reservations", "Error confirming reservation", {
      operation: "confirmReservation",
      context: { reservationId },
      error,
    });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

export async function cancelReservationHandler(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  const reservationId = request.params.id;
  const userId = request.user?.id!;

  try {
    const res = await findReservationByIdAndUserId({
      id: reservationId,
      userId,
    });

    if (!res) {
      return reply.status(404).send({
        message: "Reservation not found",
        errors: { id: reservationId },
      });
    }

    const { reservation } = res;

    switch (reservation.status) {
      case "cancelled":
        return reply.status(400).send({
          message: "Reservation is already cancelled",
          errors: { id: reservationId, status: reservation.status },
        });
      case "pending":
        await cancelReservation(reservation);

        const { error } = await tryCatch(
          expireCheckoutSession(reservation.checkoutId ?? "")
        );

        if (error) {
          logger.error("reservations", "Failed to expire checkout session", {
            operation: "cancelReservation",
            error,
            context: {
              checkoutId: reservation.checkoutId,
            },
          });
        }

        return reply
          .status(200)
          .send({ message: "Reservation cancelled successfully" });
      case "confirmed":
        const now = Date.now();
        const startTime = reservation.startTime;
        const latest = startTime.getTime() - 60 * 60 * 1000; // 1 hour

        if (now >= latest) {
          return reply.status(400).send({
            message: "Can't cancel this reservation",
            errors: {
              startTime,
              msg: "Grace period has passed",
            },
          });
        }

        await cancelReservation(reservation);

        const refundRequest = await insertNewRefundRequest({
          reservationId: reservation.id,
          userId,
          reason: "Cancelled reservation",
        });
        return reply.status(200).send({
          message: "Resevation cancelled succesfully",
          refundRequest: {
            message:
              "A refund request has been created for you. Follow up here.",
            id: refundRequest?.id,
          },
        });
      default:
        logger.debug("reservations", "Invalid reservation status received", {
          operation: "cancelReservation",
          context: {
            reservation,
          },
        });
        return reply
          .status(400)
          .send({ message: "Invalid reservation status" });
    }
  } catch (error) {
    logger.error("reservations", "Error cancelling reservation", {
      operation: "cancelReservation",
      context: { reservationId },
      error,
    });
    return reply.status(500).send({ message: "Something went wrong" });
  }
}

// https://orm.drizzle.team/docs/overview
// https://fastify.dev/docs/latest/Reference/Errors/
