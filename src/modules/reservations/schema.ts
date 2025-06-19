import { z } from "zod";

export const createReservationSchema = z.object({
  seats: z.array(z.string()),
  hallId: z.number().positive(),
  movieId: z.number().positive(),
  time: z.coerce.date(),
});

export type CreateReservationBody = z.infer<typeof createReservationSchema>;
