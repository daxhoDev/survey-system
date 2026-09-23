import type { CookieOptions } from "express";
import { env } from "./env.js";

// Session cookies (AUTH-01). Clearing a cookie needs the same options it was
// set with, so every place that sets or clears them uses these.
export const jwtCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
};

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  path: "/api/v1/users/refresh",
};
