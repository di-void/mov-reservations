import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../env";

// reuse db instance in a global variable
declare global {
  var __db__: ReturnType<typeof drizzle> | undefined;
}

export const db =
  global.__db__ ||
  (global.__db__ = drizzle({
    client: new Pool({ connectionString: env.DATABASE_URL }),
    logger: env.NODE_ENV !== "test",
    casing: "snake_case",
  }));

export type DB = typeof db;
export type DBTransaction = Parameters<Parameters<DB["transaction"]>[0]>[0];
