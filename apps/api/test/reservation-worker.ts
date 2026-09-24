import { db } from "../src/db";
import type { Reservation } from "../src/db/schema";
import {
  atomicallyConfirmReservation,
  atomicallyCreateReservation,
} from "../src/lib/reservations";

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

void prepareWorker();

async function prepareWorker() {
  try {
    await db.$client.query("SELECT 1");
    process.send?.({ type: "ready" });
    process.once("message", runOperation);
  } catch (error) {
    sendError(error);
  }
}

async function runOperation(message: WorkerMessage) {
  try {
    const result =
      message.operation === "create"
        ? await atomicallyCreateReservation(message.data)
        : await atomicallyConfirmReservation({
            reservation: message.reservation,
            movie: null,
            hall: null,
          });

    process.send?.({ type: "result", success: true, result }, closeWorker);
  } catch (error) {
    sendError(error);
  }
}

function sendError(error: unknown) {
  process.send?.(
    {
      type: "result",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    },
    closeWorker,
  );
}

async function closeWorker() {
  await db.$client.end();
  process.disconnect();
}
