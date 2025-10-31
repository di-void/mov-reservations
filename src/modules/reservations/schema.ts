import * as z from "zod";

export const createReservationSchema = z.object({
  seats: z.array(z.number().positive()).min(1),
  hallId: z.number().positive(),
  movieId: z.number().positive(),
  time: z.coerce.date(),
  sessionKey: z.string().min(1),
});

export type CreateReservationBody = z.infer<typeof createReservationSchema>;
