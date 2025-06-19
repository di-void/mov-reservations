import { FastifyReply, FastifyRequest } from "fastify";
import {
  type QueryParams,
  type CreateMovieBody,
  type CreateShowTimeBody,
  type UpdateMovieBody,
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
  request: FastifyRequest<{ Body: CreateMovieBody }>,
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
  request: FastifyRequest<{ Body: CreateShowTimeBody }>,
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
    Body: UpdateMovieBody;
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
