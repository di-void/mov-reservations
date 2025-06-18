import { FastifyInstance } from "fastify";
import {
  listMovies,
  listMoviesOpts,
  createMovie,
  createMovieOpts,
  createShowTime,
  createShowTimeOpts,
  getMovieShowTimes,
  getShowTimesOpts,
  updateMovieHandler,
  updateMovieOpts,
  deleteMovieHandler,
  deleteMovieOpts,
} from "../modules/movies/handlers";
import {
  CreateMovieInput,
  CreateShowTimeInput,
  UpdateMovieInput,
} from "../modules/movies/schema";
import { authenticate, isAdmin } from "../middleware/auth";

export async function routes(fastify: FastifyInstance, _options: any) {
  fastify.addHook("preHandler", authenticate);

  // Public routes
  fastify.get("/", listMoviesOpts, listMovies);
  fastify.get("/:movieId/showtimes", getShowTimesOpts, getMovieShowTimes);

  // Admin routes
  const adminRouteConfig = {
    preHandler: isAdmin,
  };

  fastify.post<{ Body: CreateMovieInput }>(
    "/",
    { ...adminRouteConfig, ...createMovieOpts },
    createMovie
  );

  fastify.post<{ Body: CreateShowTimeInput }>(
    "/showtimes",
    { ...adminRouteConfig, ...createShowTimeOpts },
    createShowTime
  );

  fastify.patch<{ Body: UpdateMovieInput; Params: { id: number } }>(
    "/:id",
    { ...adminRouteConfig, ...updateMovieOpts },
    updateMovieHandler
  );

  fastify.delete<{ Params: { id: number } }>(
    "/:id",
    { ...adminRouteConfig, ...deleteMovieOpts },
    deleteMovieHandler
  );
}
