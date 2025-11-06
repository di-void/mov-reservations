import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import {
  createReservation,
  getReservations,
} from "../modules/reservations/handlers";

export function routes(fastify: FastifyInstance, opts: any) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", getReservations);
  fastify.post(
    "/:hallId",
    {
      schema: {
        params: {
          type: "object",
          required: ["hallId"],
          properties: {
            hallId: { type: "number" },
          },
        },
      },
    },
    createReservation
  );
}
