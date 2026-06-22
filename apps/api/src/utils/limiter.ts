import rateLimit from "express-rate-limit";
import AppError from "./appError.js";

export default function limiter(isAuth: boolean) {
  return rateLimit({
    windowMs: 1000 * 60,
    limit: isAuth ? 20 : 40,
    legacyHeaders: false,
    standardHeaders: true,
    handler: () => {
      throw new AppError(
        "Too many requests",
        "You submitted too many requests, try again later",
        429,
      );
    },
  });
}
