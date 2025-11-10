import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export function routes(fastify: FastifyInstance, opts: any) {
  fastify.post(
    "/webhooks",
    async function (request: FastifyRequest, reply: FastifyReply) {
      // listen for the "paid" event
      // parse the received metadata
      // to handle, create a new ticket record with the 'paid' status
      // then change the status of the reservation id to 'active'
    }
  );
}

// https://docs.stripe.com/webhooks
// https://docs.stripe.com/metadata
// https://github.com/t3dotgg/stripe-recommendations
