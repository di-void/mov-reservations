import { eq } from "drizzle-orm";
import { db } from ".";
import { users } from "./schema";

async function main() {
  console.log(`Running seed file...`);
  //   await _reset();

  await db.insert(users).values({
    email: "admin@mov-reservations.com",
    password: "admin",
    name: "Admin",
    role: "admin",
  });

  console.log(`Seed file ran successfully!`);
}

async function _reset() {
  await db.delete(users).where(eq(users.email, "admin@mov-reservations.com"));
  console.log(`Reset ran successfully!`);
}

main()
  .then(() => {
    console.log(`Exiting seed file...`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
