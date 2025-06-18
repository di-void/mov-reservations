import { z } from "zod";

export const queryParamSchema = z.object({
  genre: z.string().optional(),
  rating: z.number().positive().lt(6).optional(),
});

export const createMovieSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  releaseDate: z.coerce.date(),
  duration: z.number().positive(),
  rating: z.number().positive().lt(6),
  genre: z.string(),
});

export const createShowTimeSchema = z.object({
  hallId: z.number().positive(),
  movieId: z.number().positive(),
  time: z.coerce.date(),
});

// Schema for route parameters that require an ID
export const idParamSchema = z.object({
  id: z.coerce.number().positive(),
});

export const updateMovieSchema = createMovieSchema.partial();

export type QueryParams = z.infer<typeof queryParamSchema>;
export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type CreateShowTimeInput = z.infer<typeof createShowTimeSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
