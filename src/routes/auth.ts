import { FastifyInstance } from "fastify";

export async function routes(fastify: FastifyInstance, options: any) {
  fastify.post("/login", async (request, reply) => {
    //
  });

  fastify.post("/register", async (request, reply) => {
    //
  });
}
