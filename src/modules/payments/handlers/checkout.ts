import { type Reservation } from "../../../db/schema";
import { env } from "../../../../env";
import { polar } from "../../../lib/polar";
import {
  serializeCheckoutMetaData,
  stringifySeatsMeta,
  transformUserIdToExternalCustomerId,
} from "../../../utils";

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
      seats: stringifySeatsMeta(seats),
      totalAmount,
      status,
    },
  });

  const session = await polar.checkouts.create({
    products: [env.POLAR_PRODUCT_ID],
    externalCustomerId: transformUserIdToExternalCustomerId(userId),
    amount: totalAmount,
    metadata: {
      meta,
    },
  });

  const safeUrl = new URL(session.url);
  return { redirectUrl: safeUrl.toString() };
}
