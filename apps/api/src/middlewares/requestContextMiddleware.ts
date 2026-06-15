import type { NextFunction, Request, Response } from "express";
import logger from "../config/logger.js";
import { requestContext } from "../context/requestContext.js";

export default function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = req.id as string;
  const childLogger = logger.child({ requestId });
  requestContext.run({ logger: childLogger }, next);
}
