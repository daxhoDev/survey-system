import pino, { stdTimeFunctions } from "pino";
import { env } from "./env.js";

const isDevelopment = env.NODE_ENV === "development";

export default pino({
  level: env.LOG_LEVEL,
  timestamp: stdTimeFunctions.isoTime,
  transport: {
    ...(isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : {
          target: "pino/file",
          options: { destination: "logs/app.log", mkdir: true },
        }),
  },
  redact: {
    paths: ["*.password"],
    censor: "[REDACTED]",
  },
  base: {
    enviroment: env.NODE_ENV,
  },
});
