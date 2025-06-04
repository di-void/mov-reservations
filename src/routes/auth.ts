import { FastifyInstance } from "fastify";
import { registerHandler, loginHandler } from "../modules/auth/handlers";
import { LoginBody, RegisterBody } from "../modules/auth/schema";

export async function routes(fastify: FastifyInstance, _options: any) {
  // login
  fastify.post<{ Body: LoginBody }>("/login", loginHandler);
  // register
  fastify.post<{ Body: RegisterBody }>("/register", registerHandler);
}
