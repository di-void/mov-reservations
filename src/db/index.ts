import { drizzle } from "drizzle-orm/libsql";
import { env } from "../../env";

// reuse db instance in a global variable
declare global {
  var __db__: ReturnType<typeof drizzle> | undefined;
}

export const db =
  global.__db__ ||
  (global.__db__ = drizzle({
    connection: { url: env.DATABASE_URL },
    logger: true,
    casing: "snake_case",
  }));
