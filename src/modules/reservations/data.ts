import { and, eq, inArray, or, getTableColumns } from "drizzle-orm";
import { db } from "../../db";
import {
  NewReservedSeat,
  pricingRules,
  Reservation,
  reservations,
  SeatMeta,
  reservedSeats,
  seats,
  showTimes,
  movies,
  halls,
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
    .then((r) => r.at(0));
}

export async function findSeatsByHallId(data: {
  seats: number[];
  hallId: number;
}) {
  return db
    .select()
    .from(seats)
    .where(and(eq(seats.hallId, data.hallId), inArray(seats.id, data.seats)));
}

export async function insertReservedSeats(seats: NewReservedSeat[]) {
  return db
    .insert(reservedSeats)
    .values([...seats])
    .returning();
}

// showtime = hallId + startTime
export async function findReservedSeatsByShowTime(
  showTime: { startTime: Date; hallId: number },
  filter?: { seats: number[] }
) {
  const { hallId, startTime } = showTime;
  let filterSeats = filter ? filter.seats : [];
  return db
    .select({
      ...getTableColumns(reservedSeats),
      priceId: seats.priceId,
      price: pricingRules.price,
    })
    .from(reservedSeats)
    .innerJoin(
      seats,
      and(
        eq(reservedSeats.seatId, seats.id),
        eq(reservedSeats.hallId, seats.hallId)
      )
    )
    .innerJoin(pricingRules, eq(seats.priceId, pricingRules.id))
    .where(
      and(
        eq(reservedSeats.hallId, hallId),
        eq(reservedSeats.startTime, startTime),
        filterSeats?.length === 0
          ? undefined
          : inArray(reservedSeats.seatId, filterSeats) // NOTE: not exactly sure what happens when this is undefined
      )
    );
}

export async function insertReservation(data: {
  seats: SeatMeta[];
  totalAmount: number;
  userId: number;
  hallId: number;
  movieId: number;
  startTime: Date;
  endTime: Date;
}) {
  return db
    .insert(reservations)
    .values({ ...data, status: "pending" })
    .returning()
    .then((r) => r.at(0));
}

export async function updateReservation(
  id: number,
  data: { status: Reservation["status"] }
) {
  return db
    .update(reservations)
    .set(data)
    .where(eq(reservations.id, id))
    .returning()
    .limit(1)
    .then((r) => r.at(0));
}

export async function findReservationsByUserId(data: { userId: number }) {
  return db
    .select({
      reservation: reservations,
      movie: {
        title: movies.title,
        duration: movies.duration,
      },
      hall: {
        name: halls.name,
      },
    })
    .from(reservations)
    .leftJoin(movies, eq(movies.id, reservations.movieId))
    .leftJoin(halls, eq(reservations.hallId, halls.id))
    .where(eq(reservations.userId, data.userId));
}

export async function findReservationById(id: number) {
  return db
    .select({
      reservation: reservations,
      movie: {
        title: movies.title,
        duration: movies.duration,
      },
      hall: {
        name: halls.name,
      },
    })
    .from(reservations)
    .leftJoin(movies, eq(movies.id, reservations.movieId))
    .leftJoin(halls, eq(reservations.hallId, halls.id))
    .where(eq(reservations.id, id))
    .limit(1)
    .then((r) => r.at(0));
}

export async function findReservationByIdAndUserId(data: {
  userId: number;
  id: number;
}) {
  const { userId, id } = data;
  return db
    .select({
      reservation: reservations,
      movie: {
        title: movies.title,
        duration: movies.duration,
      },
      hall: {
        name: halls.name,
      },
    })
    .from(reservations)
    .leftJoin(movies, eq(movies.id, reservations.movieId))
    .leftJoin(halls, eq(reservations.hallId, halls.id))
    .where(and(eq(reservations.id, id), eq(reservations.userId, userId)))
    .limit(1)
    .then((r) => r.at(0));
}
