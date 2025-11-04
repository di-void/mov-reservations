import type { Hall, Movie, Reservation } from "../../db/schema";

export function mapReservation(data: {
  reservation: Reservation;
  movie: Pick<Movie, "title" | "duration"> | null;
  hall: Pick<Hall, "name"> | null;
}) {
  const { reservation, movie, hall } = data;
  const { updatedAt, hallId, movieId, userId, seats, ...restRes } = reservation;

  return {
    ...restRes,
    seats: seats.map((s) => ({ id: s.seatId, price: s.price.price })),
    movie: movie ? { title: movie.title, duration: movie.duration } : null,
    hall: hall ? { name: hall.name } : null,
  };
}
