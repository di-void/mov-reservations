import { FastifyReply, FastifyRequest } from "fastify";
import {
  type QueryParams,
  type CreateMovieInput,
  type CreateShowTimeInput,
  type UpdateMovieInput,
  queryParamSchema,
  createMovieSchema,
  createShowTimeSchema,
  updateMovieSchema,
} from "./schema";
import {
  addMovie,
  addShowTime,
  listAllMovies,
  getShowTimesForMovie,
  updateMovie,
  deleteMovie,
} from "./data";
import { z } from "zod";

// Schema options for Fastify routes - keeping these for route registration
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

export const createMovieOpts = {
  schema: {
    body: {
      type: "object",
      required: ["title", "description", "releaseDate", "duration", "rating"],
      properties: {
        title: { type: "string" },
        genre: { type: "string" },
        description: { type: "string" },
        releaseDate: { type: "string", format: "date-time" },
        duration: { type: "number" },
        rating: { type: "number", minimum: 1, maximum: 5 },
      },
    },
  },
};

export const createShowTimeOpts = {
  schema: {
    body: {
      type: "object",
      required: ["hallId", "movieId", "time"],
      properties: {
        hallId: { type: "number" },
        movieId: { type: "number" },
        time: { type: "string", format: "date-time" },
      },
    },
  },
};

export const getShowTimesOpts = {
  schema: {
    params: {
      type: "object",
      required: ["movieId"],
      properties: {
        movieId: { type: "number" },
      },
    },
  },
};

export const updateMovieOpts = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
      },
    },
    body: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        releaseDate: { type: "string", format: "date-time" },
        duration: { type: "number" },
        rating: { type: "number", minimum: 1, maximum: 5 },
        genre: { type: "string" },
      },
      minProperties: 1,
    },
  },
};

export const deleteMovieOpts = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
      },
    },
  },
};

export async function listMovies(
  request: FastifyRequest<{ Querystring: QueryParams }>,
  reply: FastifyReply
) {
  const result = queryParamSchema.safeParse(request.query);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const { genre, rating } = result.data;
  const movies = await listAllMovies({ genre, rating });
  reply.send(movies);
}

export async function createMovie(
  request: FastifyRequest<{ Body: CreateMovieInput }>,
  reply: FastifyReply
) {
  const result = createMovieSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const movieData = result.data;
  await addMovie(movieData);
  reply.code(201).send({ message: "Movie created successfully" });
}

export async function createShowTime(
  request: FastifyRequest<{ Body: CreateShowTimeInput }>,
  reply: FastifyReply
) {
  const result = createShowTimeSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const showTimeData = result.data;
  await addShowTime(showTimeData);
  reply.code(201).send({ message: "Show time added successfully" });
}

export async function getMovieShowTimes(
  request: FastifyRequest<{ Params: { movieId: number } }>,
  reply: FastifyReply
) {
  const result = z
    .object({
      movieId: z.coerce.number().positive(),
    })
    .safeParse(request.params);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const { movieId } = result.data;
  const showTimes = await getShowTimesForMovie(movieId);
  reply.send(showTimes);
}

export async function updateMovieHandler(
  request: FastifyRequest<{
    Params: { id: number };
    Body: UpdateMovieInput;
  }>,
  reply: FastifyReply
) {
  const paramsResult = z
    .object({
      id: z.coerce.number().positive(),
    })
    .safeParse(request.params);

  if (!paramsResult.success) {
    return reply.status(400).send({ errors: paramsResult.error.format() });
  }

  const bodyResult = updateMovieSchema.safeParse(request.body);

  if (!bodyResult.success) {
    return reply.status(400).send({ errors: bodyResult.error.format() });
  }

  const { id } = paramsResult.data;
  const movieData = bodyResult.data;
  await updateMovie(id, movieData);
  reply.send({ message: "Movie updated successfully" });
}

export async function deleteMovieHandler(
  request: FastifyRequest<{
    Params: { id: number };
  }>,
  reply: FastifyReply
) {
  const result = z
    .object({
      id: z.coerce.number().positive(),
    })
    .safeParse(request.params);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const { id } = result.data;
  await deleteMovie(id);
  reply.send({ message: "Movie deleted successfully" });
}
