import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import {
  cancelReservationHandler,
  confirmReservationHandler,
  createReservationHandler,
  getAllUserReservationsHandler,
  getReservationHandler,
} from "../modules/reservations/handlers";

const IdParamJsonSchema = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "number" } },
    },
  },
};

export function routes(fastify: FastifyInstance, opts: any) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", getAllUserReservationsHandler);
  fastify.get("/:id", IdParamJsonSchema, getReservationHandler);
  fastify.patch("/:id/confirm", confirmReservationHandler);
  fastify.patch("/:id/cancel", IdParamJsonSchema, cancelReservationHandler);

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
    createReservationHandler
  );
}
