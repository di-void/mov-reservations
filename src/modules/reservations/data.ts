import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { Reservation, reservations, Seat, seats } from "../../db/schema";

export async function addReservation(data: {
  seats: Seat[];
  userId: number;
  hallId: number;
  movieId: number;
  time: Date;
}) {
  return db
    .insert(reservations)
    .values({ ...data, status: "pending" })
    .returning();
}

export async function updateReservation(
  id: number,
  data: { status: Reservation["status"] }
) {
  return db.update(reservations).set(data).returning();
}

export async function getReservations(data: { userId: number }) {
  return db
    .select()
    .from(reservations)
    .where(eq(reservations.userId, data.userId));
}

export async function getShowTimeSeats(data: {
  hallId: number;
  movieId: number;
  time: Date;
}) {
  const { movieId, hallId, time } = data;
  return db
    .select({ seats: seats.chart, reservedSeats: seats.reserved })
    .from(seats)
    .where(
      and(
        eq(seats.movieId, movieId),
        eq(seats.hallId, hallId),
        eq(seats.time, time)
      )
    )
    .then((res) => res[0]);
}

export async function addReservedSeats(data: string[]) {}
