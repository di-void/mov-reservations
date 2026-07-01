import { users, type User, type NewUser } from "../../db/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export async function findUserByEmail(email: string) {
  const res = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return res[0];
}

export async function insertUser(data: Omit<NewUser, "role">) {
  const res = await db
    .insert(users)
    .values({ ...data, role: "user" })
    .returning();

  return res[0];
}
