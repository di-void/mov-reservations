import { eq } from "drizzle-orm";
import { db } from "../../db";
import { halls, hallLayouts } from "../../db/schema";

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
