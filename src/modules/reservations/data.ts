import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db";
import {
  NewReservedSeat,
  Reservation,
  reservations,
  reservedSeats,
  seats,
  showTimes,
} from "../../db/schema";

export async function findShowTimeByHallIdAndTime(data: {
  hallId: number;
  time: Date;
}) {
  return db
    .select()
    .from(showTimes)
    .where(
      and(eq(showTimes.hallId, data.hallId), eq(showTimes.startTime, data.time))
    )
    .then((res) => res[0]);
}

export async function findSeatsByHallId(data: {
  seats: number[];
  hallId: number;
}) {
  return db
    .select()
    .from(seats)
    .where(
      and(eq(seats.hallId, data.hallId), inArray(seats.seatId, data.seats))
    );
}

export async function insertReservedSeats(seats: NewReservedSeat[]) {
  return db
    .insert(reservedSeats)
    .values([...seats])
    .returning();
}

// showtime = hallId + time
export async function findReservedSeatsByShowTime(
  showTime: { time: Date; hallId: number },
  filter?: { seats: number[] }
) {
  const { hallId, time } = showTime;
  let seats = filter ? filter.seats : [];
  return db
    .select()
    .from(reservedSeats)
    .where(
      and(
        eq(reservedSeats.hallId, hallId),
        eq(reservedSeats.time, time),
        seats?.length === 0 ? undefined : inArray(reservedSeats.seatId, seats) // TODO: not sure what happens when this is undefined
      )
    );
}

export async function insertReservation(data: {
  seatIds: number[];
  userId: number;
  hallId: number;
  movieId: number;
  time: Date;
}) {
  const { seatIds: seats, ...rest } = data;
  return db
    .insert(reservations)
    .values({ seats, ...rest, status: "pending" })
    .returning();
}

export async function updateReservation(
  id: number,
  data: { status: Reservation["status"] }
) {
  return db
    .update(reservations)
    .set(data)
    .where(eq(reservations.id, id))
    .returning();
}

export async function getReservations(data: { userId: number }) {
  return db
    .select()
    .from(reservations)
    .where(eq(reservations.userId, data.userId));
}
