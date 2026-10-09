import { z } from "zod";

// Web configuration (CFG-09), validated once when the app starts.
const envSchema = z.object({
  VITE_API_URL: z.url("VITE_API_URL must be a URL").optional(),
});

const parsed = envSchema.parse(import.meta.env);

if (import.meta.env.PROD && !parsed.VITE_API_URL) {
  throw new Error("VITE_API_URL is required in production builds");
}

export const env = {
  // No trailing slash: generated paths already start with "/".
  API_URL: (parsed.VITE_API_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
};
