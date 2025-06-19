import { FastifyInstance } from "fastify";
import {
  listMovies,
  createMovie,
  createShowTime,
  getMovieShowTimes,
  updateMovieHandler,
  deleteMovieHandler,
} from "../modules/movies/handlers";
import {
  CreateMovieBody,
  CreateShowTimeBody,
  UpdateMovieBody,
  QueryParams,
} from "../modules/movies/schema";
import { authenticate, isAdmin } from "../middleware/auth";

export async function routes(fastify: FastifyInstance, _options: any) {
  fastify.addHook("preHandler", authenticate);

  // Public routes
  fastify.get<{
    Querystring: QueryParams;
  }>("/", listMovies);

  fastify.get<{
    Params: { movieId: number };
  }>("/:movieId/showtimes", getMovieShowTimes);

  // Admin routes
  const adminRouteConfig = {
    preHandler: isAdmin,
  };

  fastify.post<{
    Body: CreateMovieBody;
  }>("/", adminRouteConfig, createMovie);

  fastify.post<{
    Body: CreateShowTimeBody;
  }>("/showtimes", adminRouteConfig, createShowTime);

  fastify.patch<{
    Body: UpdateMovieBody;
    Params: { id: number };
  }>("/:id", adminRouteConfig, updateMovieHandler);

  fastify.delete<{
    Params: { id: number };
  }>("/:id", adminRouteConfig, deleteMovieHandler);
}
