import type { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import z from "zod";
import { jwtSchema } from "../schemas/authSchema.js";
import type { ProtectedRequest, UserPayload } from "../types.js";
import { getLogger, requestContext } from "../context/requestContext.js";

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
      process.env.JWT_SECRET as string,
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
}
