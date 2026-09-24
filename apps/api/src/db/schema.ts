import {
  pgTable,
  integer,
  text,
  serial,
  timestamp,
  jsonb,
  primaryKey,
  foreignKey,
  unique,
} from "drizzle-orm/pg-core";
import { generateTicketId } from "../utils";

export const ROLES = ["admin", "user"] as const;

export const users = pgTable("users", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: text({ enum: ROLES }).notNull(),
  createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const movies = pgTable("movies", {
  id: serial().primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  releaseDate: timestamp({ withTimezone: true, precision: 3 }).notNull(),
  duration: integer().notNull(), // seconds
  rating: integer().notNull(),
  genre: text().notNull(),
  createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
export type Movie = typeof movies.$inferSelect;

export const showTimes = pgTable(
  "show_times",
  {
    hallId: integer()
      .notNull()
      .references(() => halls.id),
    movieId: integer()
      .notNull()
      .references(() => movies.id),
    startTime: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    endTime: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.hallId, table.startTime] })]
);

export const halls = pgTable("halls", {
  id: serial().primaryKey(),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
export type Hall = typeof halls.$inferSelect;

export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: serial().primaryKey(),
    hallId: integer().references(() => halls.id, { onDelete: "cascade" }), // nullable to allow for category override
    category: text().notNull(),
    price: integer().notNull(), // in cents
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

export const hallLayouts = pgTable("hall_layouts", {
  id: serial().primaryKey(),
  config: jsonb().$type<Config>().notNull(),
  hallId: integer()
    .references(() => halls.id)
    .notNull(),
  rowCount: integer().notNull(),
  seatsPerRow: integer().notNull(),
  createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const seats = pgTable(
  "seats",
  {
    id: integer().notNull(),
    priceId: integer()
      .references(() => pricingRules.id)
      .notNull(),
    hallId: integer()
      .references(() => halls.id)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.id, table.hallId],
    }),
  ]
);

export const reservedSeats = pgTable(
  "reserved_seats",
  {
    hallId: integer().notNull(),
    seatId: integer().notNull(),
    startTime: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    reservedAt: timestamp({ withTimezone: true, precision: 3 }),
    expiresAt: timestamp({ withTimezone: true, precision: 3 }),
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
export const reservations = pgTable(
  "reservations",
  {
    id: serial().primaryKey(),
    seats: jsonb().$type<SeatMeta[]>().notNull(),
    userId: integer()
      .notNull()
      .references(() => users.id),
    hallId: integer().notNull(),
    movieId: integer().notNull(),
    checkoutId: text(),
    startTime: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    endTime: timestamp({ withTimezone: true, precision: 3 }).notNull(),
    status: text({
      enum: ["pending", "confirmed", "cancelled"],
    }).notNull(),
    totalAmount: integer().notNull(),
    createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
    cancelledAt: timestamp({ withTimezone: true, precision: 3 }),
    updatedAt: timestamp({ withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow()
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

export type TicketMeta = {
  refund?: { initiator: "system" | "user"; [x: string]: any };
  [x: string]: any;
};
export const tickets = pgTable("tickets", {
  id: text()
    .$defaultFn(() => generateTicketId())
    .primaryKey(),
  reservationId: integer()
    .notNull()
    .references(() => reservations.id)
    .unique(),
  paymentStatus: text({
    enum: ["pending", "processing", "failed", "paid", "refunded"],
  }).notNull(),
  totalAmount: integer().notNull(), // in cents
  metadata: jsonb().$type<TicketMeta>(),
  createdAt: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
export type NewTicket = typeof tickets.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;

export const refundRequests = pgTable("refund_requests", {
  id: serial().primaryKey(),
  userId: integer()
    .references(() => users.id)
    .notNull(),
  reason: text(),
  initiator: text({ enum: ["system", "user"] })
    .default("system")
    .notNull(),
  status: text({ enum: ["pending", "fulfilled", "declined"] })
    .notNull()
    .default("pending"),
  reservationId: integer()
    .references(() => reservations.id)
    .notNull(),
});

export type NewRefundRequest = typeof refundRequests.$inferInsert;
export type RefundRequest = typeof refundRequests.$inferSelect;
