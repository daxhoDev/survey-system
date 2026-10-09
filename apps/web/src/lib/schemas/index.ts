import { z } from "zod";
import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
} from "@survey-system/schemas";
import type {
  AcceptInvitation,
  CreateInvitation,
  UserLogin,
} from "@/lib/api/sondixAPI.schemas";

// Form schemas of the web app (FE-04): same rules as the API schemas in
// @survey-system/schemas (limits imported, never repeated) with Spanish
// messages. `satisfies` keeps each form's output assignable to the request
// body the API expects.

const email = z.email("Introduce un correo electrónico válido");
const password = z
  .string()
  .min(
    PASSWORD_MIN,
    `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
  );

export const loginFormSchema = z.object({
  email,
  password,
}) satisfies z.ZodType<UserLogin>;

export const createInvitationFormSchema = z.object({
  email,
}) satisfies z.ZodType<CreateInvitation>;

export const acceptInvitationFormSchema = z
  .object({
    username: z
      .string()
      .min(
        USERNAME_MIN,
        `El nombre de usuario debe tener al menos ${USERNAME_MIN} caracteres`,
      )
      .max(
        USERNAME_MAX,
        `El nombre de usuario debe tener como máximo ${USERNAME_MAX} caracteres`,
      ),
    password,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.passwordConfirm === data.password, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  }) satisfies z.ZodType<AcceptInvitation>;
