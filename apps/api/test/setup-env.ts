import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const testDirectory =
  process.env.TEST_DATABASE_DIRECTORY ??
  mkdtempSync(join(tmpdir(), "mov-reservations-"));

process.env.TEST_DATABASE_DIRECTORY = testDirectory;
process.env.DATABASE_URL = pathToFileURL(
  join(testDirectory, "reservations.db"),
).href;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.STRIPE_KEY = "test-stripe-key";
process.env.STRIPE_PRODUCT_ID = "test-product";
process.env.STRIPE_WEBHOOK_SECRET = "test-webhook-secret";

process.once("exit", () => {
  try {
    rmSync(testDirectory, { recursive: true, force: true });
  } catch {
    // The parent test runner retries cleanup after worker database handles close.
  }
});
