import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import {
  cancelReservation,
  confirmReservation,
  createReservation,
  getAllUserReservations,
  getReservation,
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

  fastify.get("/", getAllUserReservations);
  fastify.get("/:id", IdParamJsonSchema, getReservation);
  fastify.patch("/:id/confirm", confirmReservation);
  fastify.patch("/:id/cancel", IdParamJsonSchema, cancelReservation);

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
