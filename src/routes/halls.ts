import { FastifyInstance } from "fastify";
import {
  listHallsHandler,
  listHallsOpts,
  createHallHandler,
  createHallOpts,
  createHallLayoutHandler,
  createHallLayoutOpts,
  getHallLayoutHandler,
  getHallLayoutOpts,
} from "../modules/halls/handlers";
import {
  CreateHallInput,
  CreateHallLayoutInput,
} from "../modules/halls/schema";
import { authenticate, isAdmin } from "../middleware/auth";

export async function routes(fastify: FastifyInstance, _options: any) {
  fastify.addHook("preHandler", authenticate);

  // Public routes
  fastify.get("/", listHallsOpts, listHallsHandler);
  fastify.get("/:hallId/layout", getHallLayoutOpts, getHallLayoutHandler);

  // Admin routes
  const adminRouteConfig = {
    preHandler: isAdmin,
  };

  fastify.post<{ Body: CreateHallInput }>(
    "/",
    { ...adminRouteConfig, ...createHallOpts },
    createHallHandler
  );

  fastify.post<{ Body: CreateHallLayoutInput }>(
    "/layout",
    { ...adminRouteConfig, ...createHallLayoutOpts },
    createHallLayoutHandler
  );
}
