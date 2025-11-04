import { type Reservation } from "../../../db/schema";
import { env } from "../../../../env";
import { polar } from "../../../lib/polar";
import {
  getTotalAmountFromSeats,
  serializeSeatsMeta,
  transformUserIdToExternalCustomerId,
} from "../../../utils";

export async function startCheckoutSession(
  reservation: Reservation
): Promise<{ redirectUrl: string }> {
  const userId = reservation.userId;
  const totalAmount = getTotalAmountFromSeats(reservation.seats);
  const {
    createdAt,
    updatedAt,
    cancelledAt,
    startTime,
    endTime,
    seats,
    ...rest
  } = reservation;

  const meta = {
    ...rest,
    seats: serializeSeatsMeta(seats),
    startTime: startTime.toDateString(),
    endTime: endTime.toDateString(),
  };

  const session = await polar.checkouts.create({
    products: [env.POLAR_PRODUCT_ID],
    externalCustomerId: transformUserIdToExternalCustomerId(userId),
    amount: totalAmount,
    metadata: meta,
  });

  const safeUrl = new URL(session.url);
  return { redirectUrl: safeUrl.toString() };
}
