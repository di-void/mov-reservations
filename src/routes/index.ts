// mount all routes
import * as auth from "./auth";
import * as movies from "./movies";
import * as halls from "./halls";
import * as reservations from "./reservations";

import { FastifyInstance } from "fastify";

export function mountRoutes(fastify: FastifyInstance, opts: any) {
  fastify.register(auth.routes, { prefix: "/auth" });
  fastify.register(movies.routes, { prefix: "/movies" });
  fastify.register(halls.routes, { prefix: "/halls" });
  fastify.register(reservations.routes, { prefix: "/reservations" });
}
