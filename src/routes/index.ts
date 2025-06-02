// mount all routes
import * as auth from "./auth";
import * as hello from "./hello";

import { FastifyInstance } from "fastify";

export function mountRoutes(fastify: FastifyInstance, opts: any) {
  fastify.register(auth.routes, { prefix: "/auth" });
  fastify.register(hello.routes, { prefix: "/hello" });
}
