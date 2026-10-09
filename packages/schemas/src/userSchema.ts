import { z } from "./zod-setup.js";
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from "./limits.js";

export const createUserSchema = z
  .strictObject({
    email: z.string().email("Must be a valid email"),
    username: z
      .string()
      .min(USERNAME_MIN, `Must have at least ${USERNAME_MIN} characters`)
      .max(USERNAME_MAX, `Must have at most ${USERNAME_MAX} characters`),
    password: z.string().min(PASSWORD_MIN, `Must have at least ${PASSWORD_MIN} characters`),
    passwordConfirm: z.string().min(PASSWORD_MIN, "Must be a string"),
  })
  .refine((data) => data.passwordConfirm === data.password, {
    message: "Please, confirm your password",
    path: ["passwordConfirm"],
  })
  .openapi("UserSignup", {
    example: {
      email: "user@example.com",
      username: "johndoe",
      password: "password123",
      passwordConfirm: "password123",
    },
  });

export const loginDataSchema = z
  .strictObject(
    {
      email: z.email("Must be a valid email"),
      password: z
        .string("Must be a string")
        .min(PASSWORD_MIN, `Must have at least ${PASSWORD_MIN} characters`),
    },
    "Invalid input",
  )
  .openapi("UserLogin", {
    example: {
      email: "user@example.com",
      password: "password123",
    },
  });

export const userSchema = z
  .object({
    id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
    username: z.string().min(USERNAME_MIN).openapi({ example: "johndoe" }),
  })
  .openapi("User", {
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      username: "johndoe",
    },
  });

// Returned by signup and login (AUTH-12, AUTH-15).
export const userAccountSchema = userSchema
  .extend({
    createdAt: z.date(),
    deletedAt: z.date().nullable(),
  })
  .openapi("UserAccount");
