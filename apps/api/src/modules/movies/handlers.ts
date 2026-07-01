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
import * as z from "zod";

export async function listMovies(
  request: FastifyRequest<{ Querystring: QueryParams }>,
  reply: FastifyReply
) {
  const result = queryParamSchema.safeParse(request.query);

  if (!result.success) {
    return reply.status(400).send({ errors: z.treeifyError(result.error) });
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
    return reply.status(400).send({ errors: z.treeifyError(result.error) });
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
    return reply.status(400).send({ errors: z.treeifyError(result.error) });
  }

  const showTimeData = result.data;
  await addShowTime(showTimeData);

  // generate seats based on hall layout
  reply.code(201).send({ message: "Show time added successfully" });
}

export async function getMovieShowTimes(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = z
    .object({
      movieId: z.coerce.number().positive(),
    })
    .safeParse(request.params);

  if (!result.success) {
    return reply.status(400).send({ errors: z.treeifyError(result.error) });
  }

  const { movieId } = result.data;
  const showTimes = await getShowTimesForMovie(movieId);
  reply.send(showTimes);
}

export async function updateMovieHandler(
  request: FastifyRequest<{
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
    return reply
      .status(400)
      .send({ errors: z.treeifyError(paramsResult.error) });
  }

  const bodyResult = updateMovieSchema.safeParse(request.body);

  if (!bodyResult.success) {
    return reply.status(400).send({ errors: z.treeifyError(bodyResult.error) });
  }

  const { id } = paramsResult.data;
  const movieData = bodyResult.data;
  await updateMovie(id, movieData);
  reply.send({ message: "Movie updated successfully" });
}

export async function deleteMovieHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = z
    .object({
      id: z.coerce.number().positive(),
    })
    .safeParse(request.params);

  if (!result.success) {
    return reply.status(400).send({ errors: z.treeifyError(result.error) });
  }

  const { id } = result.data;
  await deleteMovie(id);
  reply.send({ message: "Movie deleted successfully" });
}
