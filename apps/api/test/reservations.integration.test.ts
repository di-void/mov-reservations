import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  halls,
  movies,
  pricingRules,
  reservations,
  reservedSeats,
  seats,
  showTimes,
  tickets,
  users,
} from "../src/db/schema";
import {
  atomicallyConfirmReservation,
  atomicallyCreateReservation,
} from "../src/lib/reservations";
import type { Reservation } from "../src/db/schema";

const firstStartTime = new Date("2030-01-01T12:00:00.000Z");
const firstEndTime = new Date("2030-01-01T14:00:00.000Z");
const secondStartTime = new Date("2030-01-01T16:00:00.000Z");
const secondEndTime = new Date("2030-01-01T18:00:00.000Z");
const fixtureTime = new Date("2029-01-01T00:00:00.000Z");

before(async () => {
  const schema = process.env.TEST_DATABASE_SCHEMA;
  if (!schema || !/^mov_reservations_test_[a-f0-9]{12}$/.test(schema)) {
    throw new Error("Missing isolated test schema");
  }

  const client = await db.$client.connect();
  try {
    const { rows } = await client.query("select current_setting('search_path') as path");
    if (rows[0]?.path !== schema) throw new Error("Test connection is not isolated");

    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    const migrationDir = join(__dirname, "..", "drizzle");
    const journal = JSON.parse(
      await readFile(join(migrationDir, "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };

    for (const { tag } of journal.entries) {
      const sql = (await readFile(join(migrationDir, `${tag}.sql`), "utf8"))
        .replaceAll('"public".', `"${schema}".`);
      for (const statement of sql.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.query(statement);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

after(async () => {
  try {
    const schema = process.env.TEST_DATABASE_SCHEMA;
    if (schema && /^mov_reservations_test_[a-f0-9]{12}$/.test(schema)) {
      await db.$client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  } finally {
    await db.$client.end();
  }
});

beforeEach(async () => {
  await db.delete(tickets);
  await db.delete(reservations);
  await db.delete(reservedSeats);
  await db.delete(showTimes);
  await db.delete(seats);
  await db.delete(pricingRules);
  await db.delete(movies);
  await db.delete(halls);
  await db.delete(users);

  await db.insert(users).values({
    id: 1,
    name: "Test User",
    email: "test@example.com",
    password: "password",
    role: "user",
    createdAt: fixtureTime,
    updatedAt: fixtureTime,
  });
  await db.insert(halls).values({
    id: 1,
    name: "Test Hall",
    createdAt: fixtureTime,
    updatedAt: fixtureTime,
  });
  await db.insert(movies).values({
    id: 1,
    title: "Test Movie",
    description: "Test movie description",
    releaseDate: fixtureTime,
    duration: 2 * 60 * 60,
    rating: 5,
    genre: "Drama",
    createdAt: fixtureTime,
    updatedAt: fixtureTime,
  });
  await db.insert(pricingRules).values({
    id: 1,
    hallId: 1,
    category: "regular",
    price: 1_000,
  });
  await db.insert(seats).values([
    { id: 1, hallId: 1, priceId: 1 },
    { id: 2, hallId: 1, priceId: 1 },
  ]);
  await db.insert(showTimes).values([
    {
      hallId: 1,
      movieId: 1,
      startTime: firstStartTime,
      endTime: firstEndTime,
      createdAt: fixtureTime,
      updatedAt: fixtureTime,
    },
    {
      hallId: 1,
      movieId: 1,
      startTime: secondStartTime,
      endTime: secondEndTime,
      createdAt: fixtureTime,
      updatedAt: fixtureTime,
    },
  ]);
});

function reserve(seatIds: number[], startTime = firstStartTime, endTime = firstEndTime) {
  return atomicallyCreateReservation({
    hallId: 1,
    seats: seatIds,
    movieId: 1,
    userId: 1,
    startTime,
    endTime,
  });
}

type WorkerMessage =
  | {
      operation: "create";
      data: {
        startTime: Date;
        endTime: Date;
        hallId: number;
        seats: number[];
        userId: number;
        movieId: number;
      };
    }
  | { operation: "confirm"; reservation: Reservation };

type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; success: boolean; result?: unknown; error?: string };

function startWorker() {
  const child = fork(join(__dirname, "reservation-worker.ts"), {
    cwd: join(__dirname, ".."),
    env: process.env,
    execArgv: ["--import", "tsx"],
    serialization: "advanced",
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  let response: Extract<WorkerResponse, { type: "result" }> | undefined;
  let markReady: () => void;
  let failReadiness: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    failReadiness = reject;
  });
  const completed = new Promise<unknown>((resolve, reject) => {
    child.on("message", (workerResponse: WorkerResponse) => {
      if (workerResponse.type === "ready") {
        markReady();
      } else {
        response = workerResponse;
      }
    });
    child.once("error", (error) => {
      failReadiness(error);
      reject(error);
    });
    child.once("exit", (code) => {
      if (!response) {
        const error = new Error(`Reservation worker exited with code ${code}`);
        failReadiness(error);
        reject(error);
      } else if (response.success) {
        resolve(response.result);
      } else {
        reject(new Error(response.error));
      }
    });
  });

  return { child, ready, completed };
}

async function runConcurrently(messages: WorkerMessage[]) {
  const workers = messages.map(() => startWorker());
  await Promise.all(workers.map((worker) => worker.ready));
  workers.forEach((worker, index) => worker.child.send(messages[index]!));
  return await Promise.all(workers.map((worker) => worker.completed));
}

test("only one competing request can claim a seat", async () => {
  const createMessage: WorkerMessage = {
    operation: "create",
    data: {
      hallId: 1,
      seats: [1],
      movieId: 1,
      userId: 1,
      startTime: firstStartTime,
      endTime: firstEndTime,
    },
  };
  const results = (await runConcurrently([
    createMessage,
    createMessage,
  ])) as Awaited<ReturnType<typeof reserve>>[];
  const successful = results.filter((result) => result.success);
  const rejected = results.filter((result) => !result.success);

  assert.equal(successful.length, 1);
  assert.equal(rejected.length, 1);
  assert.deepEqual(rejected[0]?.available, []);

  const storedReservations = await db.select().from(reservations);
  const [heldSeat] = await db.select().from(reservedSeats);

  assert.equal(storedReservations.length, 1);
  assert.ok(heldSeat?.reservedAt);
  assert.equal(
    heldSeat.reservedAt.getTime(),
    storedReservations[0]?.createdAt.getTime(),
  );
});

test("a multi-seat claim does not hold available seats when one is taken", async () => {
  const firstClaim = await reserve([1]);
  assert.equal(firstClaim.success, true);

  const secondClaim = await reserve([1, 2]);
  assert.equal(secondClaim.success, false);
  if (secondClaim.success) {
    assert.fail("Expected the second claim to fail");
  }
  assert.deepEqual(secondClaim.available, [2]);

  const [unclaimedSeat] = await db
    .select()
    .from(reservedSeats)
    .where(
      and(
        eq(reservedSeats.hallId, 1),
        eq(reservedSeats.seatId, 2),
        eq(reservedSeats.startTime, firstStartTime),
      ),
    );
  const storedReservations = await db.select().from(reservations);

  assert.equal(storedReservations.length, 1);
  assert.equal(unclaimedSeat?.reservedAt, null);
  assert.equal(unclaimedSeat?.expiresAt, null);
});

test("concurrent confirmation creates exactly one ticket", async () => {
  const created = await reserve([1]);
  assert.equal(created.success, true);
  if (!created.success || !created.reservation) {
    assert.fail("Expected a reservation to be created");
  }

  const confirmations = (await runConcurrently([
    { operation: "confirm", reservation: created.reservation },
    { operation: "confirm", reservation: created.reservation },
  ])) as Awaited<ReturnType<typeof atomicallyConfirmReservation>>[];

  assert.equal(confirmations[0]?.reservation.status, "confirmed");
  assert.equal(confirmations[1]?.reservation.status, "confirmed");

  const storedReservations = await db.select().from(reservations);
  const storedTickets = await db.select().from(tickets);

  assert.equal(storedReservations.length, 1);
  assert.equal(storedReservations[0]?.status, "confirmed");
  assert.equal(storedTickets.length, 1);
  assert.equal(storedTickets[0]?.reservationId, created.reservation.id);
});

test("confirmation does not change the same seat at another showtime", async () => {
  const first = await reserve([1], firstStartTime, firstEndTime);
  const second = await reserve([1], secondStartTime, secondEndTime);
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  if (!first.success || !first.reservation || !second.success || !second.reservation) {
    assert.fail("Expected both reservations to be created");
  }

  const [secondHoldBeforeConfirmation] = await db
    .select()
    .from(reservedSeats)
    .where(
      and(
        eq(reservedSeats.hallId, 1),
        eq(reservedSeats.seatId, 1),
        eq(reservedSeats.startTime, secondStartTime),
      ),
    );

  await atomicallyConfirmReservation({
    reservation: first.reservation,
    movie: null,
    hall: null,
  });

  const [secondHoldAfterConfirmation] = await db
    .select()
    .from(reservedSeats)
    .where(
      and(
        eq(reservedSeats.hallId, 1),
        eq(reservedSeats.seatId, 1),
        eq(reservedSeats.startTime, secondStartTime),
      ),
    );

  assert.equal(
    secondHoldAfterConfirmation?.reservedAt?.getTime(),
    secondHoldBeforeConfirmation?.reservedAt?.getTime(),
  );
  assert.equal(
    secondHoldAfterConfirmation?.expiresAt?.getTime(),
    secondHoldBeforeConfirmation?.expiresAt?.getTime(),
  );
});

test("a reservation cannot confirm after another reservation acquires its expired hold", async () => {
  const oldClaim = await reserve([1]);
  assert.equal(oldClaim.success, true);
  if (!oldClaim.success || !oldClaim.reservation) {
    assert.fail("Expected the old reservation to be created");
  }

  const oldReservedAt = new Date("2020-01-01T00:00:00.000Z");
  await db
    .update(reservations)
    .set({ createdAt: oldReservedAt })
    .where(eq(reservations.id, oldClaim.reservation.id));
  await db
    .update(reservedSeats)
    .set({
      reservedAt: oldReservedAt,
      expiresAt: new Date(Date.now() - 1_000),
    })
    .where(
      and(
        eq(reservedSeats.hallId, 1),
        eq(reservedSeats.seatId, 1),
        eq(reservedSeats.startTime, firstStartTime),
      ),
    );

  const [staleReservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, oldClaim.reservation.id));
  assert.ok(staleReservation);

  const newClaim = await reserve([1]);
  assert.equal(newClaim.success, true);
  if (!newClaim.success || !newClaim.reservation) {
    assert.fail("Expected the expired hold to be acquired");
  }

  await assert.rejects(
    atomicallyConfirmReservation({
      reservation: staleReservation,
      movie: null,
      hall: null,
    }),
    /no longer owns all held seats/,
  );

  const [oldReservationAfterConfirmation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, staleReservation.id));
  const [currentHold] = await db
    .select()
    .from(reservedSeats)
    .where(
      and(
        eq(reservedSeats.hallId, 1),
        eq(reservedSeats.seatId, 1),
        eq(reservedSeats.startTime, firstStartTime),
      ),
    );
  const storedTickets = await db.select().from(tickets);

  assert.equal(oldReservationAfterConfirmation?.status, "pending");
  assert.equal(storedTickets.length, 0);
  assert.equal(
    currentHold?.reservedAt?.getTime(),
    newClaim.reservation.createdAt.getTime(),
  );
});
