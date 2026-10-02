import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import UniqueViolationError from "../utils/uniqueViolationError.js";

const connectionString = env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };

// Prisma reports unique index violations with code P2002.
export async function rethrowUniqueViolation<T>(
  query: Promise<T>,
): Promise<T> {
  try {
    return await query;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw new UniqueViolationError();
    }
    throw err;
  }
}
