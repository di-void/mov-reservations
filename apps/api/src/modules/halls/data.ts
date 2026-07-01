import { and, eq, gt, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { halls, hallLayouts, pricingRules, reservedSeats, seats } from "../../db/schema";

export async function listHalls() {
  return db.select().from(halls);
}

export async function getHall(id: number) {
  return db
    .select()
    .from(halls)
    .where(eq(halls.id, id))
    .then((res) => res[0]);
}

export async function addHall(data: { name: string }) {
  return db.insert(halls).values(data).returning();
}

export async function addHallLayout(data: {
  hallId: number;
  rowCount: number;
  seatsPerRow: number;
  config: {
    disabledSeats: string[];
    vipSeats: string[];
    gaps: string[];
    notes: string;
    pricing: {
      regular: number;
      vip: number;
    };
  };
}) {
  return db.insert(hallLayouts).values(data);
}

export async function getHallLayout(hallId: number) {
  return db
    .select()
    .from(hallLayouts)
    .where(eq(hallLayouts.hallId, hallId))
    .then((res) => res[0]);
}

export async function getSeatChart(hallId: number, time?: Date) {
  const [layout, hallSeats, reserved] = await Promise.all([
    getHallLayout(hallId),
    db
      .select({
        id: seats.id,
        category: pricingRules.category,
        price: pricingRules.price,
      })
      .from(seats)
      .innerJoin(pricingRules, eq(seats.priceId, pricingRules.id))
      .where(eq(seats.hallId, hallId)),
    time
      ? db
          .select({ seatId: reservedSeats.seatId })
          .from(reservedSeats)
          .where(
            and(
              eq(reservedSeats.hallId, hallId),
              eq(reservedSeats.startTime, time),
              isNotNull(reservedSeats.expiresAt),
              gt(reservedSeats.expiresAt, new Date()),
            ),
          )
      : [],
  ]);

  const taken = new Set(reserved.map((s) => s.seatId));
  const seatsPerRow = layout?.seatsPerRow ?? 10;

  return {
    hallId,
    seats: hallSeats.map((seat) => {
      const row = Math.floor((seat.id - 1) / seatsPerRow);
      const col = ((seat.id - 1) % seatsPerRow) + 1;

      return {
        id: seat.id,
        seatNumber: `${String.fromCharCode(65 + row)}${col}`,
        category: seat.category,
        price: seat.price,
        available: !taken.has(seat.id),
      };
    }),
  };
}
