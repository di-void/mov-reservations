import { FastifyInstance } from "fastify";

export async function routes(fastify: FastifyInstance, _options: any) {
  fastify.post("/list", (request, reply) => {
    reply.send({ hello: "world" });
  });
}
