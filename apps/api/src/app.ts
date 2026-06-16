import express, { type Express, type Request, type Response } from "express";
import "dotenv/config";
import surveyRouter from "./routes/surveyRouter.js";
import userRouter from "./routes/userRouter.js";
import { ErrorMiddleware } from "./middlewares/errorMiddleware.js";
import cookieParser from "cookie-parser";
import AppError from "./utils/appError.js";
import limiter from "./utils/limiter.js";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./lib/openapi.js";
import loggingMiddleware from "./middlewares/loggingMiddleware.js";
import requestContextMiddleware from "./middlewares/requestContextMiddleware.js";

const app: Express = express();
const errorMiddleware = new ErrorMiddleware();

app.use(loggingMiddleware);
app.use(requestContextMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  }),
);
app.use(helmet());

app.use("/api/", limiter(false));

app.use("/api/v1/surveys", surveyRouter);
app.use("/api/v1/users", limiter(true), userRouter);

app.use(
  "/api/v1/docs",
  swaggerUi.serve,
  swaggerUi.setup(generateOpenApiDocument(), {
    customSiteTitle: "Survey System API Documentation",
  }),
);

app.use("/api/v1/docs-raw", (req, res) => res.send(generateOpenApiDocument()));

app.all("/*splat", (req: Request, res: Response) => {
  throw new AppError(
    "Method not allowed for this path",
    `The route ${req.originalUrl} does not exist for method ${req.method}`,
    404,
  );
});

app.use(errorMiddleware.handleGlobalError);

export default app;
