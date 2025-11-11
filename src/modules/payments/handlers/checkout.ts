import { type Reservation } from "../../../db/schema";
import { env } from "../../../../env";
import { stripe } from "../../../lib/stripe";
import { serializeCheckoutMetaData } from "../../../utils";
import { STRIPE_SUCCESS_URL } from "../../../lib/constants";

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

  const safeUrl = new URL(session.url!); // unsafe: url is nullable
  return { redirectUrl: safeUrl.toString() };
}

// https://docs.stripe.com/products-prices/manage-prices
// https://docs.stripe.com/api/checkout/sessions/create?lang=node
