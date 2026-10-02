// Creates an account directly in the database (AUTH-31), e.g. the first one.
// Usage: pnpm create-user (development) or node dist/scripts/createUser.js.
import readline from "node:readline";
import { Writable } from "node:stream";
import { ZodError } from "zod";
import { prisma } from "../lib/prisma.js";
import UserRepository from "../repositories/userRepository.js";
import RefreshTokenRepository from "../repositories/refreshTokenRepository.js";
import AuthService from "../services/authService.js";
import AppError from "../utils/appError.js";

// Output stream that can hide what the user types (passwords).
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const rl = readline.createInterface({
  input: process.stdin,
  output,
  terminal: process.stdin.isTTY,
});
// Reading lines through the iterator also works when stdin is piped.
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  muted = hidden;
  const { value, done } = await lines.next();
  muted = false;
  if (hidden) process.stdout.write("\n");
  if (done) throw new Error("Input ended before all answers were given");
  return String(value).trim();
}

async function main() {
  const email = await ask("Email: ");
  const username = await ask("Username: ");
  const password = await ask("Password: ", true);
  const passwordConfirm = await ask("Confirm password: ", true);

  const service = new AuthService(new UserRepository(), new RefreshTokenRepository());
  const user = await service.createAccount({ email, username, password, passwordConfirm });
  console.log(`User created: ${user.username} <${user.email}>`);
}

try {
  await main();
} catch (error) {
  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      console.error(`${issue.path.join(".")}: ${issue.message}`);
    }
  } else if (error instanceof AppError) {
    console.error(error.detail);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}
