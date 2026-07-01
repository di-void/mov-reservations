import { eq } from "drizzle-orm";
import { db } from "../../db";
import { halls, movies, showTimes } from "../../db/schema";

export async function listAllMovies({
  genre,
  rating,
}: {
  genre?: string;
  rating?: number;
}) {
  let query = db.select().from(movies).$dynamic();
  if (genre) {
    query = query.where(eq(movies.genre, genre));
  }

  if (rating) {
    query = query.where(eq(movies.rating, rating));
  }

  return query;
}

export async function addMovie(data: {
  title: string;
  description: string;
  releaseDate: Date;
  duration: number;
  rating: number;
  genre: string;
}) {
  return db.insert(movies).values(data);
}

export async function addShowTime(data: {
  hallId: number;
  movieId: number;
  time: Date;
}) {
  return db.insert(showTimes).values(data);
}

export async function getShowTimesForMovie(movieId: number) {
  return db
    .select()
    .from(showTimes)
    .innerJoin(halls, eq(showTimes.hallId, halls.id))
    .where(eq(showTimes.movieId, movieId));
}

export async function updateMovie(
  movieId: number,
  data: Partial<{
    title: string;
    description: string;
    releaseDate: Date;
    duration: number;
    rating: number;
    genre: string;
  }>
) {
  return db.update(movies).set(data).where(eq(movies.id, movieId));
}

export async function deleteMovie(movieId: number) {
  // First delete all associated showtimes
  await db.delete(showTimes).where(eq(showTimes.movieId, movieId));
  // Then delete the movie
  return db.delete(movies).where(eq(movies.id, movieId));
}
