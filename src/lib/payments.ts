import { and, inArray, eq } from "drizzle-orm";
import { env } from "../../env";
import { db } from "../db";
import {
  Reservation,
  reservations,
  reservedSeats,
  tickets,
} from "../db/schema";
import {
  findReservationById,
  updateReservationById,
} from "../modules/reservations/data";
import { CheckoutMetaData, serializeCheckoutMetaData } from "../utils";
import { STRIPE_SUCCESS_URL } from "./constants";
import logger from "./logger";
import { stripe } from "./stripe";

export async function startCheckoutSession(
  reservation: Reservation
): Promise<{ redirectUrl: string }> {
  const userId = reservation.userId;

  const {
    id,
    hallId,
    movieId,
    startTime,
    endTime,
    seats,
    status,
    totalAmount,
  } = reservation;
  const meta = serializeCheckoutMetaData({
    userId,
    reservation: {
      id,
      startTime,
      endTime,
      hallId,
      movieId,
      seats: seats.map((s) => s.seatId),
      totalAmount,
      status,
    },
  });

  const session = await stripe.checkout.sessions.create({
    success_url: STRIPE_SUCCESS_URL,
    line_items: [
      {
        price_data: {
          currency: "USD",
          product: env.STRIPE_PRODUCT_ID,
          unit_amount: totalAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      meta,
    },
  });

  await updateReservationById(reservation.id, {
    checkoutId: session.id,
  });

  const safeUrl = new URL(session.url!); // unsafe: url is nullable
  return { redirectUrl: safeUrl.toString() };
}

const allowedEvents = [
  "checkout.session.completed",
  "checkout.session.expired",
] as const;

type EventTypes = (typeof allowedEvents)[number];

export async function handleCompletedCheckoutSession(data: {
  moduleName: string;
  checkoutId: string;
  reservation: CheckoutMetaData["reservation"];
  eventType: EventTypes;
  logContext: Record<string, unknown>;
}) {
  const { reservation, eventType, logContext, moduleName } = data;
  try {
    const r = await findReservationById(reservation.id);

    if (!r) {
      return logger.error(moduleName, "Couldn't find reservation", {
        operation: eventType,
        context: logContext,
      });
    }

    const { reservation: modifiedReservation, movie, hall } = r;

    if (modifiedReservation.status === "pending") {
      const result = await atomicallyConfirmReservation({
        reservation: modifiedReservation,
        movie,
        hall,
      });

      logger.info(moduleName, "Successfully activated reservation", {
        operation: eventType,
        context: { ...logContext, reservation: result },
      });
    }
  } catch (error) {
    logger.error(moduleName, "Error handling completed checkout session", {
      operation: eventType,
      context: logContext,
      error,
    });
  }
}

export async function atomicallyConfirmReservation(data: {
  reservation: Reservation;
  movie: { title: string; duration: number } | null;
  hall: { name: string } | null;
}) {
  const { reservation, movie, hall } = data;

  const heldSeats = reservation.seats.map((s) => s.seatId);
  return await db.transaction(async (tx) => {
    await tx
      .update(reservedSeats)
      .set({
        expiresAt: reservation.endTime,
      })
      .where(
        and(
          inArray(reservedSeats.seatId, heldSeats),
          eq(reservedSeats.hallId, reservation.hallId)
        )
      );

    await tx.insert(tickets).values({
      reservationId: reservation.id,
      paymentStatus: "paid",
      totalAmount: reservation.totalAmount,
    });

    const res = await tx
      .update(reservations)
      .set({ status: "confirmed" })
      .where(eq(reservations.id, reservation.id))
      .returning();

    return {
      reservation: res.at(0)!,
      movie,
      hall,
    };
  });
}

export async function getCheckoutSession(checkoutId: string) {
  return stripe.checkout.sessions.retrieve(checkoutId);
}

export async function expireCheckoutSession(checkoutId: string) {
  return stripe.checkout.sessions.expire(checkoutId);
}
