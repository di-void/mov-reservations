import type { SeatMeta } from "./db/schema";
import superjson from "superjson";
import * as z from "zod";

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

export type StringedSeatMeta = `${number}-${number}`;
export function stringifySeatsMeta(seats: SeatMeta[]) {
  return seats.map((seat) => `${seat.seatId}-${seat.price.price}`).join(":");
}

export const checkoutMetadataSchema = z.object({
  userId: z.number().positive(),
  reservation: z.object({
    id: z.number().positive(),
    hallId: z.number().positive(),
    movieId: z.number().positive(),
    totalAmount: z.number().positive(),
    status: z.string().refine((arg) => arg === "pending"),
    seats: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  }),
});
export type CheckoutMetaData = z.infer<typeof checkoutMetadataSchema>;

export function serializeCheckoutMetaData(meta: CheckoutMetaData) {
  return superjson.stringify(meta);
}

export function parseCheckoutMetaData(meta: unknown) {
  const result = z.string().min(1).safeParse(meta);
  if (!result.success) {
    return null;
  }
  const parsed = superjson.parse(result.data);
  const res = checkoutMetadataSchema.safeParse(parsed);
  if (!res.success) {
    // throw new Error("Failed to parse checkout session");
    return null;
  }

  const { data } = res;
  return data;
}
