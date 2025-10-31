import { type Reservation } from "../../../db/schema";

export async function startCheckoutSession(
  reservation: Reservation
): Promise<{ redirectUrl: string }> {
  // get the priceIds for the reserved seats
  // and use this to fetch their product ids
  // extract product ids from reservation record
  // also construct metadata info for callback
  // it should contain virtually all the keys inside the reservation record with
  // our user id as the "external_customer_id" for the payment processor
  // then we call payment processor with product ids and all required info
  // if this is successful, we will get back a url for the checkout session
  // sanitize and encode url before returning it to the caller
  return { redirectUrl: "" };
}
