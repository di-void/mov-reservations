import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../../env";
import * as z from "zod";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      role: string;
    };
    clientType?: ClientType;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: number;
      email: string;
      role: string;
    };

    request.user = decoded;
  } catch (error) {
    reply.code(401).send({ error: "Invalid token" });
    return;
  }
}

export async function isAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    reply.code(401).send({ error: "Authentication required" });
    return;
  }

  if (request.user.role !== "admin") {
    reply.code(403).send({ error: "Insufficient permissions" });
    return;
  }
}

const querySchema = z.object({
  client: z.enum(["web", "mobile"]).optional().default("web"),
});

type ClientType = z.infer<typeof querySchema>["client"];

export async function attachClientType(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // attach the client type to the request
  const data = querySchema.safeParse(request.query);
  if (!data.success) {
    reply.send(400).send({ error: "Invalid client type" });
    return;
  }

  const {
    data: { client },
  } = data;
  request.clientType = client;
}
