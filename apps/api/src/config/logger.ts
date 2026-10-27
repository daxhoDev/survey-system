import pino, { stdTimeFunctions } from "pino";
import { env } from "./env.js";

const isDevelopment = env.NODE_ENV === "development";

export default pino({
  level: env.LOG_LEVEL,
  timestamp: stdTimeFunctions.isoTime,
  // Production writes JSON lines to stdout, collected by the platform (API-26).
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  }),
  redact: {
    paths: ["*.password"],
    censor: "[REDACTED]",
  },
  base: {
    enviroment: env.NODE_ENV,
  },
});
