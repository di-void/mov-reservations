import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "../db";
import {
  type Reservation,
  reservations,
  reservedSeats,
  tickets,
} from "../db/schema";
import {
  checkSeatsAvailabilityByShowTime,
  releaseReservedSeatHoldsByReservationTime,
  releaseReservedSeatHoldsByShowTime,
} from "../modules/reservations/data";
import { getTotalAmountFromSeats } from "../utils";

async function tryInitReservedSeats(data: {
  seats: number[];
  showTime: { hallId: number; startTime: Date };
}) {
  const values = data.seats.map((sId) => ({
    seatId: sId,
    expiresAt: null,
    hallId: data.showTime.hallId,
    startTime: data.showTime.startTime,
  }));

  await db
    .insert(reservedSeats)
    .values(values)
    .onConflictDoNothing({
      target: [
        reservedSeats.hallId,
        reservedSeats.seatId,
        reservedSeats.startTime,
      ],
    });
}

async function createReservation(data: {
  seats: number[];
  movieId: number;
  userId: number;
  showTime: { hallId: number; startTime: Date; endTime: Date };
}) {
  const { seats: requestedSeats, showTime, userId, movieId } = data;
  return await db.transaction(
    async (tx) => {
      const available = await checkSeatsAvailabilityByShowTime(
        { hallId: showTime.hallId, startTime: showTime.startTime },
        { seats: requestedSeats },
        tx,
      );
      const availableSeatIds = available.map((seat) => seat.seatId);

      if (availableSeatIds.length !== requestedSeats.length) {
        return { success: false as const, available: availableSeatIds };
      }

      const reservedAt = new Date();
      const holdExpiry = new Date(reservedAt.getTime() + 5 * 60 * 1000);
      const seats = available.map((seat) => ({
        seatId: seat.seatId,
        price: {
          id: seat.priceId,
          price: seat.price,
        },
      }));

      const claimedSeats = await tx
        .update(reservedSeats)
        .set({ expiresAt: holdExpiry, reservedAt })
        .where(
          and(
            eq(reservedSeats.hallId, showTime.hallId),
            eq(reservedSeats.startTime, showTime.startTime),
            inArray(reservedSeats.seatId, requestedSeats),
            or(
              isNull(reservedSeats.expiresAt),
              lt(reservedSeats.expiresAt, reservedAt),
            ),
          ),
        )
        .returning({ seatId: reservedSeats.seatId });

      if (claimedSeats.length !== requestedSeats.length) {
        throw new Error("Failed to claim all requested seats");
      }

      const reservation = await tx
        .insert(reservations)
        .values({
          createdAt: reservedAt,
          status: "pending",
          seats,
          startTime: showTime.startTime,
          endTime: showTime.endTime,
          userId,
          totalAmount: getTotalAmountFromSeats(seats),
          hallId: showTime.hallId,
          movieId,
        })
        .returning()
        .then((r) => r.at(0));

      return { success: true as const, reservation };
    },
    { behavior: "immediate" },
  );
}

export async function atomicallyCreateReservation(data: {
  startTime: Date;
  endTime: Date;
  hallId: number;
  seats: number[];
  userId: number;
  movieId: number;
}) {
  // lazily initialize requested seats
  await tryInitReservedSeats({
    seats: data.seats,
    showTime: { startTime: data.startTime, hallId: data.hallId },
  });

  return await createReservation({
    seats: data.seats,
    showTime: {
      hallId: data.hallId,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    movieId: data.movieId,
    userId: data.userId,
  });
}

export async function rollbackReservation(data: {
  reservationId: number;
  showTime: { hallId: number; startTime: Date };
  seats: number[];
}) {
  const { reservationId, seats, showTime } = data;

  await db.transaction(async (tx) => {
    // release seat holds
    await releaseReservedSeatHoldsByShowTime(tx, seats, showTime);

    // delete pending reservation
    await tx
      .delete(reservations)
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.status, "pending"),
        ),
      );
  });
}

export async function cancelReservation(reservation: Reservation) {
  await db.transaction(async function (tx) {
    await releaseReservedSeatHoldsByReservationTime(
      tx,
      reservation.seats.map((s) => s.seatId),
      reservation.createdAt,
    );

    await tx
      .update(reservations)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(reservations.id, reservation.id));
  });
}

export async function atomicallyConfirmReservation(data: {
  reservation: Reservation;
  movie: { title: string; duration: number } | null;
  hall: { name: string } | null;
}) {
  const { reservation, movie, hall } = data;

  return await db.transaction(async (tx) => {
    const confirmedReservation = await tx
      .update(reservations)
      .set({ status: "confirmed" })
      .where(
        and(
          eq(reservations.id, reservation.id),
          eq(reservations.status, "pending"),
        ),
      )
      .returning()
      .then((rows) => rows.at(0));

    if (!confirmedReservation) {
      const currentReservation = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, reservation.id))
        .limit(1)
        .then((rows) => rows.at(0));

      if (currentReservation?.status === "confirmed") {
        return { reservation: currentReservation, movie, hall };
      }

      throw new Error(`Reservation ${reservation.id} is not pending`);
    }

    const heldSeats = confirmedReservation.seats.map((s) => s.seatId);
    const updatedSeats = await tx
      .update(reservedSeats)
      .set({
        expiresAt: confirmedReservation.endTime,
      })
      .where(
        and(
          inArray(reservedSeats.seatId, heldSeats),
          eq(reservedSeats.hallId, confirmedReservation.hallId),
          eq(reservedSeats.startTime, confirmedReservation.startTime),
          eq(reservedSeats.reservedAt, confirmedReservation.createdAt),
        ),
      )
      .returning({ seatId: reservedSeats.seatId });

    if (updatedSeats.length !== heldSeats.length) {
      throw new Error(
        `Reservation ${reservation.id} no longer owns all held seats`,
      );
    }

    await tx.insert(tickets).values({
      reservationId: confirmedReservation.id,
      paymentStatus: "paid",
      totalAmount: confirmedReservation.totalAmount,
    });

    return {
      reservation: confirmedReservation,
      movie,
      hall,
    };
  });
}
