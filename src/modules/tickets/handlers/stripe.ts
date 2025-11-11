import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { reservations, reservedSeats, tickets } from "../../../db/schema";
import logger from "../../../lib/logger";
import { type CheckoutMetaData } from "../../../utils";
import { findReservationById } from "../../reservations/data";

const allowedEvents = [
  "checkout.session.completed",
  "checkout.session.expired",
] as const;

type EventTypes = (typeof allowedEvents)[number];

export async function handleCompletedCheckoutSession(data: {
  checkoutId: string;
  reservation: CheckoutMetaData["reservation"];
  eventType: EventTypes;
  logContext: Record<string, unknown>;
}) {
  const { checkoutId, reservation, eventType, logContext } = data;
  try {
    const r = await findReservationById(reservation.id);

    if (!r) {
      return logger.error("stripe/webhooks", "Couldn't find reservation", {
        operation: eventType,
        context: logContext,
      });
    }

    const { reservation: modifiedReservation, movie, hall } = r;

    if (
      modifiedReservation.status === "pending" ||
      modifiedReservation.status === "confirmed"
    ) {
      const heldSeats = reservation.seats;
      const result = await db.transaction(async (tx) => {
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
          transactionId: checkoutId,
        });

        const res = await tx
          .update(reservations)
          .set({ status: "active" })
          .where(eq(reservations.id, reservation.id))
          .returning({
            id: reservations.id,
            status: reservations.status,
            showTime: {
              startTime: reservations.startTime,
              endTime: reservations.endTime,
            },
            totalAmount: reservations.totalAmount,
          });

        return { reservation: res.at(0)!, movie, hall };
      });

      logger.info("stripe/webhooks", "Successfully activated reservation", {
        operation: eventType,
        context: { ...logContext, reservation: result },
      });
    }
  } catch (error) {
    logger.error(
      "stripe/webhooks",
      "Error handling completed checkout session",
      { operation: eventType, context: logContext, error }
    );
  }
}
