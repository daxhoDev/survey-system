import type { NextFunction, Response } from "express";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import z from "zod";
import { jwtSchema } from "@survey-system/schemas";
import type { ProtectedRequest, UserPayload } from "../types.js";
import { getLogger, requestContext } from "../context/requestContext.js";
import { env } from "../config/env.js";

export default class AuthMiddleware {
  async protect(req: ProtectedRequest, res: Response, next: NextFunction) {
    const { jwt: token } = req.cookies;

    if (!token) {
      throw new AppError("Unauthenticated user", "Please, log in first", 401);
    }

    const { success, data: validToken, error } = z.safeParse(jwtSchema, token);
    if (!success) {
      throw error;
    }

    const decoded = jwt.verify(
      validToken,
      env.JWT_SECRET,
    ) as UserPayload;

    const userInfo = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };

    req.user = userInfo;

    const childLogger = getLogger().child({ userId: userInfo.id });
    requestContext.run({ logger: childLogger }, next);
  }

  // Never fails: routes that are public but depend on the session (AUTH-22).
  async optionalAuth(
    req: ProtectedRequest,
    _res: Response,
    next: NextFunction,
  ) {
    const { jwt: token } = req.cookies;
    if (!token) return next();

    let decoded: UserPayload;
    try {
      decoded = jwt.verify(
        token,
        env.JWT_SECRET,
      ) as UserPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        req.sessionExpired = true;
      } else {
        getLogger().warn({ err }, "Ignoring invalid access token");
      }
      return next();
    }

    const userInfo = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };

    req.user = userInfo;

    const childLogger = getLogger().child({ userId: userInfo.id });
    requestContext.run({ logger: childLogger }, next);
  }
}
