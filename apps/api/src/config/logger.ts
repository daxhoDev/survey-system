import pino, { stdTimeFunctions } from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

export default pino({
  level: "info",
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
    enviroment: process.env.NODE_ENV,
  },
});
