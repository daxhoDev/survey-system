import { z } from "zod";

export const createUserSchema = z
  .strictObject({
    email: z.string().email("Must be a valid email"),
    username: z.string().min(3, "Must be a string"),
    password: z.string().min(5, "Must have at least 5 characters"),
    passwordConfirm: z.string().min(5, "Must be a string"),
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
      email: z.string().email("email must be a valid email"),
      password: z.string().min(5, "password must be a string"),
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
    username: z.string().min(3).openapi({ example: "johndoe" }),
  })
  .openapi("User", {
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      username: "johndoe",
    },
  });
