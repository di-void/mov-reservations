import type { SeatMeta } from "./db/schema";

export function generateTicketId(): string {
  const timestamp = Date.now().toString(36); // Convert timestamp to base36
  const randomStr = Math.random().toString(36).substring(2, 7); // 5 random chars
  return `TKT-${timestamp}-${randomStr}`.toUpperCase();
}

export function transformUserIdToExternalCustomerId(id: number) {
  return String(id);
}

export function getTotalAmountFromSeats(seats: SeatMeta[]) {
  return seats.reduce((acc, curr) => (acc += curr.price.price), 0);
}

export type SerializedSeat = `${number}-${number}`;
export function serializeSeatsMeta(seats: SeatMeta[]) {
  return seats.map((seat) => `${seat.seatId}-${seat.price.price}`).join(":");
}
