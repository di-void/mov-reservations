import { eq } from "drizzle-orm";
import { db } from "../../db";
import { tickets, type NewTicket, type Ticket } from "../../db/schema";

export async function insertNewTicket(data: NewTicket[]) {
  return db
    .insert(tickets)
    .values([...data])
    .returning()
    .then((r) => r.at(0));
}

export async function findTicketById(id: string) {
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .then((r) => r.at(0));
}

export async function findTicketByReservationId(id: number) {
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.reservationId, id))
    .then((r) => r.at(0));
}

export async function updateTicketById(id: string, data: Partial<Ticket>) {
  return db
    .update(tickets)
    .set({ ...data })
    .where(eq(tickets.id, id))
    .returning()
    .then((r) => r.at(0));
}

export async function updateTicketByReservationId(
  reservationId: number,
  data: Partial<Ticket>
) {
  return db
    .update(tickets)
    .set({ ...data })
    .where(eq(tickets.reservationId, reservationId))
    .returning()
    .then((r) => r.at(0));
}
