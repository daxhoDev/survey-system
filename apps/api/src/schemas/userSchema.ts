import { z } from "zod";

export const createUserSchema = z
  .strictObject({
    email: z.string().email("Must be a valid email"),
    username: z.string().min(3, "Must be a string"),
    password: z
      .string()
      .min(5, "Must have at least 5 characters"),
    passwordConfirm: z.string().min(5, "Must be a string"),
  })
  .refine((data) => data.passwordConfirm === data.password, {
    message: "Please, confirm your password",
    path: ["passwordConfirm"],
  })
  .openapi({
    refId: "UserSignup",
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
    { description: "Invalid input" },
  )
  .openapi({
    refId: "UserLogin",
    example: {
      email: "user@example.com",
      password: "password123",
    },
  });
