import { FastifyInstance } from "fastify";
import { listMovies, listMoviesOpts } from "../modules/movies/handlers";
import { authenticate, isAdmin } from "../middleware/auth";

export async function routes(fastify: FastifyInstance, _options: any) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", listMoviesOpts, listMovies);

  // Admin routes
  const adminRouteConfig = {
    preHandler: isAdmin,
  };

  fastify.post("/", adminRouteConfig, (request, reply) => {
    reply.send({ hello: "world" });
  });
  fastify.patch("/:id", adminRouteConfig, (request, reply) => {
    reply.send({ hello: "world" });
  });
  fastify.delete("/:id", adminRouteConfig, (request, reply) => {
    reply.send({ hello: "world" });
  });
}
