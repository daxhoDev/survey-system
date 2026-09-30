// Thrown by repositories when a DB unique index rejects a write, so services
// can map it to their own AppError without depending on Prisma (ARCH-04).
export default class UniqueViolationError extends Error {
  constructor() {
    super("Unique constraint violation");
    this.name = "UniqueViolationError";
  }
}
