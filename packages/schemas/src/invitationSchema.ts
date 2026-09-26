import { z } from "./zod-setup.js";

export const createInvitationSchema = z
  .strictObject({
    email: z.email("Must be a valid email"),
  })
  .openapi("CreateInvitation", { example: { email: "new.user@example.com" } });

export const acceptInvitationSchema = z
  .strictObject({
    username: z
      .string("Must be a string")
      .min(3, "Must have at least 3 characters")
      .max(50, "Must have at most 50 characters"),
    password: z.string("Must be a string").min(5, "Must have at least 5 characters"),
    passwordConfirm: z.string("Must be a string"),
  })
  .refine((data) => data.passwordConfirm === data.password, {
    message: "Please, confirm your password",
    path: ["passwordConfirm"],
  })
  .openapi("AcceptInvitation", {
    example: {
      username: "newuser",
      password: "password123",
      passwordConfirm: "password123",
    },
  });

// Response shapes (documentation only).
export const invitationSchema = z
  .strictObject({
    id: z.uuid(),
    email: z.email(),
    status: z.enum(["pending", "accepted", "revoked", "expired"]),
    invitedBy: z
      .strictObject({ id: z.uuid(), username: z.string() })
      .nullable(),
    createdAt: z.date(),
    expiresAt: z.date(),
    acceptedAt: z.date().nullable(),
    revokedAt: z.date().nullable(),
  })
  .openapi("Invitation");

export const invitationTokenInfoSchema = z
  .strictObject({ email: z.email(), expiresAt: z.date() })
  .openapi("InvitationTokenInfo");
