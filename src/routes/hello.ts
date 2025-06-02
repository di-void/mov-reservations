import { FastifyInstance } from "fastify";

export function routes(fastify: FastifyInstance, opts: any) {
  fastify.get("/", (request, reply) => {
    reply.send({ hello: "world" });
  });
}
