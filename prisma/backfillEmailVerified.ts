// One-off script: run once, right after `npm run db:push` adds the new
// `emailVerifiedAt` column, and before deploying the code that gates login
// on it (see src/lib/auth.ts). Without this, every existing account would
// have emailVerifiedAt = null and get locked out of login on the next
// deploy -- this marks everyone who already has a working account as
// verified (using their signup date), so the new gate only applies to
// accounts created from here on.
//
// Usage:
//   npx tsx prisma/backfillEmailVerified.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const result = await db.$executeRaw`
    UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL
  `;
  console.log(`Backfilled emailVerifiedAt for ${result} existing user(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
