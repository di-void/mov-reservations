import {
  sqliteTable,
  integer,
  text,
  primaryKey,
  foreignKey,
  unique,
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
  duration: integer({ mode: "number" }).notNull(), // seconds
  rating: integer().notNull(),
  genre: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
});
export type Movie = typeof movies.$inferSelect;

export const showTimes = sqliteTable(
  "show_times",
  {
    hallId: integer()
      .notNull()
      .references(() => halls.id),
    movieId: integer()
      .notNull()
      .references(() => movies.id),
    startTime: integer({ mode: "timestamp" }).notNull(),
    endTime: integer({ mode: "timestamp" }).notNull(),
    createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.hallId, table.startTime] })]
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
export type Hall = typeof halls.$inferSelect;

export const pricingRules = sqliteTable(
  "pricing_rules",
  {
    id: integer({ mode: "number" }).primaryKey(),
    hallId: integer().references(() => halls.id, { onDelete: "cascade" }), // nullable to allow for category override
    category: text().notNull(),
    price: integer({ mode: "number" }).notNull(), // in cents
    // externalProductId: text().notNull(), // product id
  },
  (table) => [unique().on(table.hallId, table.category)]
);
export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;

type Config = {
  disabledSeats: string[];
  vipSeats: string[];
  gaps: string[];
  notes: string;
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

export const seats = sqliteTable(
  "seats",
  {
    id: integer().notNull(),
    priceId: integer()
      .references(() => pricingRules.id)
      .notNull(),
    hallId: integer({ mode: "number" })
      .references(() => halls.id)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.id, table.hallId],
    }),
  ]
);

export const reservedSeats = sqliteTable(
  "reserved_seats",
  {
    hallId: integer().notNull(),
    seatId: integer().notNull(),
    startTime: integer({ mode: "timestamp" }),
    expiresAt: integer({ mode: "timestamp" }),
  },
  (table) => [
    primaryKey({
      columns: [table.hallId, table.seatId, table.startTime],
    }),
    foreignKey({
      columns: [table.hallId, table.startTime],
      foreignColumns: [showTimes.hallId, showTimes.startTime],
    }),
    foreignKey({
      columns: [table.hallId, table.seatId],
      foreignColumns: [seats.hallId, seats.id],
    }),
  ]
);
export type NewReservedSeat = typeof reservedSeats.$inferInsert;
export type ReservedSeat = typeof reservedSeats.$inferSelect;

export type PriceMeta = { id: number; price: number };
export type SeatMeta = {
  seatId: number;
  price: PriceMeta;
};
export const reservations = sqliteTable(
  "reservations",
  {
    id: integer().primaryKey(),
    seats: text({ mode: "json" }).$type<SeatMeta[]>().notNull(),
    userId: integer()
      .notNull()
      .references(() => users.id),
    hallId: integer({ mode: "number" }).notNull(),
    movieId: integer({ mode: "number" }).notNull(),
    startTime: integer({ mode: "timestamp" }).notNull(),
    endTime: integer({ mode: "timestamp" }).notNull(),
    status: text({
      enum: ["pending", "confirmed", "active", "cancelled"],
    }).notNull(),
    totalAmount: integer({ mode: "number" }).notNull(),
    createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
    cancelledAt: integer({ mode: "timestamp" }),
    updatedAt: integer({ mode: "timestamp" })
      .notNull()
      .default(new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.hallId, table.startTime],
      foreignColumns: [showTimes.hallId, showTimes.startTime],
      name: "show_time_fk",
    }),
  ]
);

export type Reservation = typeof reservations.$inferSelect;

export type LogData = {
  seatIds: number[];
  hallId: number;
  userId: number;
  startTime: Date;
  status: "pending";
  movieId: number;
};

export const retryLog = sqliteTable("retry_log", {
  id: integer({ mode: "number" }).primaryKey(),
  sessionKey: text().notNull(),
  userId: integer()
    .notNull()
    .references(() => users.id),
  data: text({ mode: "json" }).$type<LogData>().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
});

export type TicketMeta = {
  refund?: { initiator: "system" | "user"; [x: string]: any };
  [x: string]: any;
};
export const tickets = sqliteTable("tickets", {
  id: text()
    .$defaultFn(() => generateTicketId())
    .primaryKey(),
  reservationId: integer()
    .notNull()
    .references(() => reservations.id),
  paymentStatus: text({
    enum: ["pending", "processing", "failed", "paid", "refunded"],
  }).notNull(),
  // paymentMethod: text({
  //   enum: ["credit_card", "debit_card", "bank_transfer"],
  // }).notNull(),
  refundReason: text(),
  totalAmount: integer({ mode: "number" }).notNull(), // in cents
  metadata: text({ mode: "json" }).$type<TicketMeta>(),
  transactionId: text(), // from payment provider
  createdAt: integer({ mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .notNull()
    .default(new Date())
    .$onUpdateFn(() => new Date()),
});
export type NewTicket = typeof tickets.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
