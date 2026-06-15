import type { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError.js";
import z, { ZodError } from "zod";
import { type TokenExpiredError } from "jsonwebtoken";
import { getLogger } from "../context/requestContext.js";

export class ErrorMiddleware {
  handleZodError(err: ZodError) {
    const errors = err.issues.map((i) => {
      return { field: i.path.join("."), message: i.message };
    });

    console.log("FAAAH", errors);

    return new AppError(
      "Validation Error",
      `Your input is invalid, please, try again`,
      422,
      { errors },
    );
  }

  handleJwtExpiredError(err: TokenExpiredError) {
    const detail = `This token expired at ${err.expiredAt}, please log in again`;
    return new AppError("Token Error", detail, 401);
  }

  handleGlobalError = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    err.status = err.status || 500;
    err.title = err.title || "Internal Error";

    if (err instanceof ZodError) {
      err = this.handleZodError(err);
    }
    if (err.name === "TokenExpiredError") {
      err = this.handleJwtExpiredError(err);
    }

    // Log the error
    const logger = getLogger();
    if (err.status >= 500) {
      logger.error({ err }, `Server Error: ${err.title}`);
    } else {
      logger.warn({ err }, `Client Error: ${err.title}`);
    }

    if (process.env.NODE_ENV === "development") {
      this.sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === "production") {
      this.sendErrorProd(err, res);
    }
  };

  sendErrorDev(err: AppError, res: Response) {
    res
      .status(err.status)
      .type("application/problem+json")
      .json({
        type: err.type,
        status: err.status,
        title: err.title,
        detail: err.detail,
        ...err.extensions,
        error: err,
        stack: err.stack,
      });
  }

  sendErrorProd(err: AppError, res: Response) {
    if (err.isOperational) {
      res
        .status(err.status)
        .type("application/problem+json")
        .json({
          type: err.type,
          status: err.status,
          title: err.title,
          detail: err.detail,
          ...err.extensions,
        });
    }
    res.status(500).type("application/problem+json").json({
      type: err.type,
      status: 500,
      title: "Unexpected error",
      detail: "Something went wrong",
    });
  }
}
