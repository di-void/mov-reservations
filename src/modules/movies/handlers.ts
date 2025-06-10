import { FastifyReply, FastifyRequest } from "fastify";
import { type QueryParams } from "./schema";

export const listMoviesOpts = {
  schema: {
    querystring: {
      type: "object",
      properties: {
        genre: { type: "string" },
        rating: { type: "number", minimum: 1, maximum: 5 },
      },
    },
  },
};

export async function listMovies(
  request: FastifyRequest<{ Querystring: QueryParams }>,
  reply: FastifyReply
) {
  const { genre, rating } = request.query;
  // do work

  reply.send({ genre, rating });
}
