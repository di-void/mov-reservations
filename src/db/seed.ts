import "dotenv/config";
import { db } from ".";
import * as schema from "./schema";
import { reset } from "drizzle-seed";

/**
 * Seed script using drizzle-seed
 * - Resets the database (clears tables)
 * - Creates 2 halls, each with 50 seats
 * - Creates 2 pricing rules (one per hall)
 *
 * Notes / assumptions:
 * - This script assumes a fresh DB (auto-increment ids start at 1).
 * - For simplicity the pricing rules are generated with hallId in the range [1,2]
 *   so they map to the created halls.
 */

async function main() {
  console.log("Running seed script...");

  // reset the tables in the schema (clears data)
  await reset(db, schema);

  // re-create admin user (keeps previous behavior)
  await db.insert(schema.users).values({
    email: "admin@mov-reservations.com",
    password: "admin",
    name: "Admin",
    role: "admin",
  });

  // Create two halls (ids must be provided because schema uses non-auto-increment PK)
  await db.insert(schema.halls).values([
    { id: 1, name: "Hall 1" },
    { id: 2, name: "Hall 2" },
  ]);

  // Create pricing rules: for each hall create 'regular' and 'vip'.
  // Prices are in cents. Assumption: regular = 1000, vip = 2000.
  const pricingRules = [
    { id: 1, hallId: 1, category: "regular", price: 1000 },
    { id: 2, hallId: 1, category: "vip", price: 2000 },
    { id: 3, hallId: 2, category: "regular", price: 1000 },
    { id: 4, hallId: 2, category: "vip", price: 2000 },
  ];
  await db.insert(schema.pricingRules).values(pricingRules);

  // Create 50 seats for each hall. Seat id is per-hall and primary key is composite (id, hallId).
  // For simplicity all seats default to the 'regular' pricing rule for their hall.
  const seats: Array<{ id: number; hallId: number; priceId: number }> = [];
  for (const hallId of [1, 2]) {
    // pick the regular price id for the hall: 1 for hall1, 3 for hall2
    const regularPriceId = hallId === 1 ? 1 : 3;
    for (let seatId = 1; seatId <= 50; seatId++) {
      seats.push({ id: seatId, hallId, priceId: regularPriceId });
    }
  }
  // bulk insert seats
  await db.insert(schema.seats).values(seats);

  // Create a movie and a showtime for it
  const movie = {
    id: 1,
    title: "Example Movie",
    description: "An example movie created by the seed script",
    releaseDate: new Date(),
    duration: 60 * 60 * 2, // 2 hours in seconds
    rating: 5,
    genre: "Drama",
  };
  await db.insert(schema.movies).values(movie);

  // schedule the showtime for tomorrow in hall 1
  const startTime = Date.now() + 24 * 60 * 60 * 1000; // ms
  const endTime = startTime + movie.duration * 1000; // ms
  await db
    .insert(schema.showTimes)
    .values({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      hallId: 1,
      movieId: movie.id,
    });

  console.log("Seed file ran successfully!");
}

main()
  .then(() => {
    console.log("Exiting seed file...");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
