import { FastifyInstance } from "fastify";
import {
  listHallsHandler,
  createHallHandler,
  createHallLayoutHandler,
  getHallLayoutHandler,
  getHallSeatChartHandler,
} from "../modules/halls/handlers";
import { CreateHallBody, CreateHallLayoutBody } from "../modules/halls/schema";
import { authenticate, isAdmin } from "../middleware/auth";

export async function routes(fastify: FastifyInstance, _options: any) {
  // Public routes
  fastify.get("/", listHallsHandler);
  fastify.get("/:hallId/layout", getHallLayoutHandler);
  fastify.get("/:hallId/seat-chart", getHallSeatChartHandler);

  // Admin routes
  const adminRouteConfig = {
    preHandler: [authenticate, isAdmin],
  };

  fastify.post<{
    Body: CreateHallBody;
  }>("/", adminRouteConfig, createHallHandler);

  fastify.post<{
    Body: CreateHallLayoutBody;
  }>("/layout", adminRouteConfig, createHallLayoutHandler);
}
