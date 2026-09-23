import type { NextFunction, Response } from "express";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import z from "zod";
import { jwtSchema } from "@survey-system/schemas";
import type { ProtectedRequest, UserPayload } from "../types.js";
import { getLogger, requestContext } from "../context/requestContext.js";
import { env } from "../config/env.js";
import {
  jwtCookieOptions,
  refreshCookieOptions,
} from "../config/cookies.js";

export default class AuthMiddleware {
  async protect(req: ProtectedRequest, res: Response, next: NextFunction) {
    const { jwt: token } = req.cookies;

    if (!token) {
      throw new AppError("Unauthenticated user", "Please, log in first", 401);
    }

    let decoded: UserPayload;
    try {
      const validToken = z.parse(jwtSchema, token);
      decoded = jwt.verify(validToken, env.JWT_SECRET) as UserPayload;
    } catch (err) {
      // Expired tokens keep their own error so the client refreshes (AUTH-07).
      if (err instanceof jwt.TokenExpiredError) throw err;

      // Not a JWT or a bad signature: the session is unusable (AUTH-08).
      res
        .clearCookie("jwt", jwtCookieOptions)
        .clearCookie("refresh", refreshCookieOptions);
      throw new AppError("Invalid token", "Please, log in again", 401);
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
