import "dotenv/config";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL or TEST_DATABASE_URL is required");

const parsedUrl = new URL(databaseUrl);
if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
  throw new Error("Integration tests require a PostgreSQL URL");
}

const testSchema = `mov_reservations_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
parsedUrl.searchParams.set("options", `-c search_path=${testSchema}`);
process.env.TEST_DATABASE_SCHEMA = testSchema;
process.env.DATABASE_URL = parsedUrl.toString();
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.STRIPE_KEY = "test-stripe-key";
process.env.STRIPE_PRODUCT_ID = "test-product";
process.env.STRIPE_WEBHOOK_SECRET = "test-webhook-secret";
