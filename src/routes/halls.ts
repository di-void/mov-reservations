import { FastifyInstance } from "fastify";
import {
  listHallsHandler,
  createHallHandler,
  createHallLayoutHandler,
  getHallLayoutHandler,
} from "../modules/halls/handlers";
import { CreateHallBody, CreateHallLayoutBody } from "../modules/halls/schema";
import { authenticate, isAdmin } from "../middleware/auth";

export async function routes(fastify: FastifyInstance, _options: any) {
  fastify.addHook("preHandler", authenticate);

  // Public routes
  fastify.get("/", listHallsHandler);
  fastify.get("/:hallId/layout", getHallLayoutHandler);

  // Admin routes
  const adminRouteConfig = {
    preHandler: isAdmin,
  };

  fastify.post<{
    Body: CreateHallBody;
  }>("/", adminRouteConfig, createHallHandler);

  fastify.post<{
    Body: CreateHallLayoutBody;
  }>("/layout", adminRouteConfig, createHallLayoutHandler);
}
