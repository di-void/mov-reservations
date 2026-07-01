import { type NewTicket } from "../../../db/schema";
import {
  findTicketByReservationId,
  insertNewTicket,
  updateTicketByReservationId as modifyTicketByReservationId,
} from "../data";

export async function createNewTicket(newTicket: NewTicket) {
  return await insertNewTicket([newTicket]);
}

export async function updateTicketByReservationId(
  reservationId: number,
  data: Partial<NewTicket>
) {
  const res = await findTicketByReservationId(reservationId);
  if (!res) {
    throw new Error("Could not find ticket");
  }

  return await modifyTicketByReservationId(reservationId, data);
}
