import { and, eq, inArray } from "drizzle-orm";
import { createNewTicket, updateTicketByReservationId } from ".";
import { db } from "../../../db";
import {
  type NewTicket,
  reservations,
  reservedSeats,
} from "../../../db/schema";
import logger from "../../../lib/logger";
import type { CheckoutMetaData } from "../../../utils";

type WebHookEvent = "onCheckoutUpdated" | "onOrderUpdated";
const moduleName = "polar/webhooks";

export async function createNewTicketFromPolarWebhook(
  data: NewTicket,
  webHookEvent: WebHookEvent,
  context: Record<string, unknown>
) {
  try {
    const newTicket = await createNewTicket(data);
    if (!newTicket) {
      throw new Error("Couldn't retrieve newly created ticket");
    }
    logger.info(moduleName, "Created new pending ticket successfully", {
      operation: webHookEvent,
      context: {
        ...context,
        newTicket,
      },
    });
  } catch (error) {
    logger.error(moduleName, "Failed to create new ticket", {
      operation: webHookEvent,
      context: {
        ...context,
        error,
      },
    });
  }
}

export async function updateTicketByReservationIdFromPolarWebhook(
  reservationId: number,
  data: Partial<NewTicket>,
  webHookEvent: WebHookEvent,
  context: Record<string, unknown>
) {
  try {
    const updatedTicket = await updateTicketByReservationId(
      reservationId,
      data
    );
    if (!updatedTicket) {
      throw new Error("Couldn't retrieve updated ticket info");
    }

    logger.info(moduleName, "Updated ticket paymet status successfully", {
      operation: webHookEvent,
      context: {
        ...context,
        updatedTicket,
      },
    });
  } catch (error) {
    logger.error(moduleName, "Failed to update ticket payment status", {
      operation: webHookEvent,
      context: {
        ...context,
        error,
      },
    });
  }
}

export async function updateReservedSeatHoldsFromPolarWebhook(
  reservation: CheckoutMetaData["reservation"],
  webHookEvent: WebHookEvent,
  context: Record<string, unknown>
) {
  try {
    const seats = reservation.seats;
    await db.transaction(async (tx) => {
      await tx
        .update(reservedSeats)
        .set({
          expiresAt: reservation.endTime,
        })
        .where(
          and(
            inArray(reservedSeats.seatId, seats),
            eq(reservedSeats.hallId, reservation.hallId)
          )
        );

      await tx
        .update(reservations)
        .set({
          status: "confirmed",
        })
        .where(eq(reservations.id, reservation.id));
    });
  } catch (error) {
    logger.error(moduleName, "Failed to update ticket payment status", {
      operation: webHookEvent,
      context: {
        ...context,
        error,
      },
    });
  }
}
