import {
  sqliteTable,
  integer,
  text,
  primaryKey,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { generateTicketId } from "../utils";

export const ROLES = ["admin", "user"] as const;

export const users = sqliteTable("users", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: text({ enum: ROLES }).notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
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
  genre: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
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
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.hallId, table.movieId, table.time] }),
  ]
);

export const halls = sqliteTable("halls", {
  id: integer().primaryKey(),
  name: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
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
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
});

// chart will be a chain of these delimited by newlines
export const seats = sqliteTable(
  "seats",
  {
    id: integer().primaryKey(),
    chart: text({ mode: "json" }).$type<string>().notNull(), // available = o, disabled = x
    reserved: text({ mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    hallId: integer().notNull(),
    movieId: integer().notNull(),
    time: integer({ mode: "timestamp" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hallId, table.movieId, table.time],
      foreignColumns: [showTimes.hallId, showTimes.movieId, showTimes.time],
      name: "show_time_fk",
    }),
  ]
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: integer().primaryKey(),
    seats: text({ mode: "json" })
      .$type<{ row: string; number: number }[]>()
      .notNull(),
    userId: integer()
      .notNull()
      .references(() => users.id),
    hallId: integer().notNull(),
    movieId: integer().notNull(),
    time: integer({ mode: "timestamp" }).notNull(),
    status: text({ enum: ["pending", "confirmed", "cancelled"] }).notNull(),
    createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.hallId, table.movieId, table.time],
      foreignColumns: [showTimes.hallId, showTimes.movieId, showTimes.time],
      name: "show_time_fk",
    }),
  ]
);

export const tickets = sqliteTable("tickets", {
  id: text().$defaultFn(() => generateTicketId()),
  reservationId: integer()
    .notNull()
    .references(() => reservations.id),
  paymentStatus: text({
    enum: ["pending", "processing", "failed", "paid", "refunded"],
  }).notNull(),
  paymentMethod: text({
    enum: ["credit_card", "debit_card", "bank_transfer"],
  }).notNull(),
  refundReason: text(),
  totalAmount: integer().notNull(),
  metadata: text({ mode: "json" }),
  transactionId: text(), // from payment provider
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
});

export type Reservation = typeof reservations.$inferSelect;
export type Seat = Reservation["seats"][number];
