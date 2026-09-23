import { prisma } from "../../src/lib/prisma.js";

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE answers, surveys, refresh_tokens, users CASCADE",
  );
}

export { prisma };
