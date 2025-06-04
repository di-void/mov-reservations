import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../../env";
import { FastifyReply, FastifyRequest } from "fastify";
import { LoginBody, RegisterBody, loginSchema, registerSchema } from "./schema";
import { findUserByEmail, insertUser } from "./data";

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    reply.code(400).send({ error: "Invalid request" });
  }
  const { email, password } = result.data!;

  const user = await findUserByEmail(email).catch((error) => {
    console.error("Something went wrong", { error });
  });

  if (!user) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1d" });

  return {
    token,
    user: payload,
  };
}

export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    reply.code(400).send({ error: "Invalid request" });
  }
  const { email, password, name } = result.data!;

  const exisitingUser = await findUserByEmail(email);
  if (exisitingUser) {
    return reply.code(400).send({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await insertUser({ name, email, password: hashedPassword });

    if (!user) {
      return reply.code(500).send({ error: "Something went wrong" });
    }

    const payload = { id: user.id, email: user.email, role: user.role };

    return { message: "User registered successfully", user: payload };
  } catch (error) {
    console.error("Something went wrong", { error });
  }
}
