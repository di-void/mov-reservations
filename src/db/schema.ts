import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const ROLES = ["admin", "user"] as const;

export const users = sqliteTable("users", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: text({ enum: ROLES }).notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const movies = sqliteTable("movies", {
  id: integer().primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  releaseDate: integer({ mode: "timestamp" }).notNull(),
  duration: integer().notNull(),
  rating: integer().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});
