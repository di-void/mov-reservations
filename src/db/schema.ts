import {
  sqliteTable,
  integer,
  text,
  primaryKey,
  foreignKey,
} from "drizzle-orm/sqlite-core";

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

export const showTimes = sqliteTable(
  "show_times",
  {
    hallId: integer()
      .notNull()
      .references(() => halls.id),
    movieId: integer()
      .notNull()
      .references(() => movies.id),
    time: integer({ mode: "timestamp" }).notNull(),
    createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
    updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  },
  (table) => [primaryKey({ columns: [table.hallId, table.movieId] })]
);

export const halls = sqliteTable("halls", {
  id: integer().primaryKey(),
  name: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

type Config = {
  disabledSeats: string[];
  vipSeats: string[];
  gaps: string[];
  notes: string;
  pricing: {
    regular: number;
    vip: number;
  };
};

export const hallLayouts = sqliteTable("hall_layouts", {
  id: integer().primaryKey(),
  config: text({ mode: "json" }).$type<Config>().notNull(),
  hallId: integer()
    .references(() => halls.id)
    .notNull(),
  rowCount: integer().notNull(),
  seatsPerRow: integer().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
});

// chart will be a chain of these delimited by newlines
export const seatingCharts = sqliteTable(
  "seating_charts",
  {
    id: integer().primaryKey(),
    chart: text({ mode: "json" }).$type<string>().notNull(), // available = o, disabled = x
    hallId: integer()
      .notNull()
      .references(() => halls.id),
    movieId: integer()
      .notNull()
      .references(() => movies.id),
  },
  (table) => [
    foreignKey({
      columns: [table.hallId, table.movieId],
      foreignColumns: [showTimes.hallId, showTimes.movieId],
      name: "show_time_fk",
    }),
  ]
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: integer().primaryKey(),
    seat: text({ mode: "json" })
      .$type<{ row: string; number: number }>()
      .notNull(),
    seatLayoutId: integer()
      .notNull()
      .references(() => hallLayouts.id),
    userId: integer() // Add these fields
      .notNull()
      .references(() => users.id),
    hallId: integer()
      .notNull()
      .references(() => halls.id),
    movieId: integer()
      .notNull()
      .references(() => movies.id),
    status: text({ enum: ["pending", "confirmed", "cancelled"] }).notNull(),
    createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
    updatedAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.hallId, table.movieId],
      foreignColumns: [showTimes.hallId, showTimes.movieId],
      name: "show_time_fk",
    }),
  ]
);
