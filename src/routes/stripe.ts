import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../lib/stripe";
import { env } from "../../env";
import { parseCheckoutMetaData } from "../utils";
import logger from "../lib/logger";
import { handleCompletedCheckoutSession } from "../modules/tickets/handlers/stripe";

export function routes(fastify: FastifyInstance, opts: any) {
  fastify.removeContentTypeParser(["application/json"]); // disable body parsing

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    function (req, body, done) {
      done(null, body); // let body fallthrough
    }
  );

  fastify.post(
    "/webhooks",
    async function (request: FastifyRequest, reply: FastifyReply) {
      const rawRequestBody = request.body as any;
      const signature = request.headers["stripe-signature"] ?? "";

      try {
        const event = stripe.webhooks.constructEvent(
          rawRequestBody,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );

        switch (event.type) {
          case "checkout.session.completed": {
            const checkoutEventObject = event.data.object;
            const metadata = parseCheckoutMetaData(
              checkoutEventObject.metadata?.meta
            );

            if (!metadata) {
              logger.error("stripe/webhooks", "Failed to parse metadata", {
                operation: event.type,
                context: {
                  metadata: checkoutEventObject.metadata,
                },
              });
              break;
            }

            const reservation = metadata.reservation;
            handleCompletedCheckoutSession({
              checkoutId: checkoutEventObject.id,
              reservation,
              eventType: event.type,
              logContext: {
                eventType: event.type,
                objectType: checkoutEventObject.object,
                metadata,
              },
            });
            break;
          }
          default: {
            logger.warn("stripe/webhooks", "Unhandled event type", {
              operation: event.type,
              context: {
                object: event.data.object,
              },
            });
            break;
          }
        }

        return reply.status(200).send({ received: true });
      } catch (error) {
        logger.error("stripe/webhooks", "Error processing event", {
          error,
        });
        return reply.status(400).send({ error: "Couldn't process event" });
      }
    }
  );
}

// https://docs.stripe.com/webhooks
// https://docs.stripe.com/metadata
// https://github.com/t3dotgg/stripe-recommendations
