import { z } from "zod";

export const createHallSchema = z.object({
  name: z.string().min(1),
});

export const createHallLayoutSchema = z.object({
  hallId: z.number().positive(),
  rowCount: z.number().positive(),
  seatsPerRow: z.number().positive(),
  config: z.object({
    disabledSeats: z.array(z.string()),
    vipSeats: z.array(z.string()),
    gaps: z.array(z.string()),
    notes: z.string(),
    pricing: z.object({
      regular: z.number().positive(),
      vip: z.number().positive(),
    }),
  }),
});

export type CreateHallBody = z.infer<typeof createHallSchema>;
export type CreateHallLayoutBody = z.infer<typeof createHallLayoutSchema>;
