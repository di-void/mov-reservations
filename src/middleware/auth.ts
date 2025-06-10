import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../../env";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      role: string;
    };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      reply.code(401).send({ error: "No token provided" });
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
