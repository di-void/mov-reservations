import { createNewTicket, updateTicketByReservationId } from ".";
import { type NewTicket } from "../../../db/schema";
import logger from "../../../lib/logger";

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
