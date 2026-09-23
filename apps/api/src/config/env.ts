import "dotenv/config";
import z from "zod";

const positiveInt = z.coerce.number().int().positive();

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    PORT: positiveInt.default(3000),
    NODE_ENV: z.enum(["development", "production"]),
    JWT_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: positiveInt,
    REFRESH_TOKEN_TTL_DAYS: positiveInt,
    CORS_ORIGIN: z.url().optional(),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.CORS_ORIGIN) {
      ctx.addIssue({
        code: "custom",
        path: ["CORS_ORIGIN"],
        message: "Required in production",
      });
    }
  })
  .transform((env) => ({
    ...env,
    CORS_ORIGIN: env.CORS_ORIGIN ?? "http://localhost:5173",
  }));

const result = envSchema.safeParse(process.env);

if (!result.success) {
  // The logger depends on this configuration, so errors go to stderr (API-33).
  // Only variable names and messages are printed, never values (CFG-02).
  console.error("Invalid environment configuration:");
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = result.data;
