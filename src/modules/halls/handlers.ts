import { FastifyReply, FastifyRequest } from "fastify";
import {
  type CreateHallInput,
  type CreateHallLayoutInput,
  createHallSchema,
  createHallLayoutSchema,
} from "./schema";
import {
  addHall,
  addHallLayout,
  listHalls,
  getHall,
  getHallLayout,
} from "./data";
import { z } from "zod";

export async function listHallsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const halls = await listHalls();
  reply.send(halls);
}

export async function createHallHandler(
  request: FastifyRequest<{ Body: CreateHallInput }>,
  reply: FastifyReply
) {
  const result = createHallSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const [hall] = await addHall(result.data);
  reply.code(201).send(hall);
}

export async function createHallLayoutHandler(
  request: FastifyRequest<{ Body: CreateHallLayoutInput }>,
  reply: FastifyReply
) {
  const result = createHallLayoutSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  // Verify hall exists
  const hall = await getHall(result.data.hallId);
  if (!hall) {
    return reply.status(404).send({ message: "Hall not found" });
  }

  // Check if hall already has a layout
  const existingLayout = await getHallLayout(result.data.hallId);
  if (existingLayout) {
    return reply.status(400).send({ message: "Hall already has a layout" });
  }

  await addHallLayout(result.data);
  reply.code(201).send({ message: "Hall layout created successfully" });
}

export async function getHallLayoutHandler(
  request: FastifyRequest<{ Params: { hallId: number } }>,
  reply: FastifyReply
) {
  const result = z
    .object({
      hallId: z.coerce.number().positive(),
    })
    .safeParse(request.params);

  if (!result.success) {
    return reply.status(400).send({ errors: result.error.format() });
  }

  const layout = await getHallLayout(result.data.hallId);
  if (!layout) {
    return reply.status(404).send({ message: "Hall layout not found" });
  }

  reply.send(layout);
}
