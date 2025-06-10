import { z } from "zod";

export const queryParamSchema = z.object({
  genre: z.string().optional(),
  rating: z.number().positive().lt(6).optional(),
});

export type QueryParams = z.infer<typeof queryParamSchema>;
