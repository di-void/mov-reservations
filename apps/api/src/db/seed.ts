import "dotenv/config";
import { db } from ".";
import * as schema from "./schema";
import { reset } from "drizzle-seed";
import { argv } from "node:process";

/**
 * Seed script using drizzle-seed
 * - Resets the database (clears tables)
 * - Creates 2 halls, each with 50 seats
 * - Creates 2 pricing rules (one per hall)
 *
 * Generated IDs are read from the database so seeding works after a reset.
 */

async function main() {
  const arg = argv[2];

  if (!arg || arg === "seed") {
    console.log("Running seed script...");

    // reset the tables in the schema (clears data)
    await reset(db as any, schema);

    // re-create admin user (keeps previous behavior)
    await db.insert(schema.users).values({
      email: "admin@mov-reservations.com",
      password: "admin",
      name: "Admin",
      role: "admin",
    });

    const [firstHall, secondHall] = await db
      .insert(schema.halls)
      .values([{ name: "Hall 1" }, { name: "Hall 2" }])
      .returning({ id: schema.halls.id });
    if (!firstHall || !secondHall) throw new Error("Failed to seed halls");

    // Create pricing rules: for each hall create 'regular' and 'vip'.
    // Prices are in cents. Assumption: regular = 1000, vip = 2000.
    const pricingRules = [
      { hallId: firstHall.id, category: "regular", price: 1000 },
      { hallId: firstHall.id, category: "vip", price: 2000 },
      { hallId: secondHall.id, category: "regular", price: 1000 },
      { hallId: secondHall.id, category: "vip", price: 2000 },
    ];
    const insertedPricingRules = await db
      .insert(schema.pricingRules)
      .values(pricingRules)
      .returning({
        id: schema.pricingRules.id,
        hallId: schema.pricingRules.hallId,
        category: schema.pricingRules.category,
      });

    // Create 50 seats for each hall. Seat id is per-hall and primary key is composite (id, hallId).
    // For simplicity all seats default to the 'regular' pricing rule for their hall.
    const seats: Array<{ id: number; hallId: number; priceId: number }> = [];
    for (const hallId of [firstHall.id, secondHall.id]) {
      const regularPriceId = insertedPricingRules.find(
        (rule) => rule.hallId === hallId && rule.category === "regular"
      )?.id;
      if (!regularPriceId) throw new Error("Failed to seed pricing rules");
      for (let seatId = 1; seatId <= 50; seatId++) {
        seats.push({ id: seatId, hallId, priceId: regularPriceId });
      }
    }
    // bulk insert seats
    await db.insert(schema.seats).values(seats);

    // Create a movie and a showtime for it
    const movie = {
      title: "Example Movie",
      description: "An example movie created by the seed script",
      releaseDate: new Date(),
      duration: 60 * 60 * 2, // 2 hours in seconds
      rating: 5,
      genre: "Drama",
    };
    const [insertedMovie] = await db
      .insert(schema.movies)
      .values(movie)
      .returning({ id: schema.movies.id });
    if (!insertedMovie) throw new Error("Failed to seed movie");

    // schedule the showtime for tomorrow in hall 1
    const startTime = Date.now() + 24 * 60 * 60 * 1000; // ms
    const endTime = startTime + movie.duration * 1000; // ms
    await db.insert(schema.showTimes).values({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      hallId: firstHall.id,
      movieId: insertedMovie.id,
    });

    console.log("Seed file ran successfully!");
  }

  if (arg === "reset") {
    console.log("Resetting the database");

    // reset the tables in the schema (clears data)
    await reset(db as any, schema);
  }
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
