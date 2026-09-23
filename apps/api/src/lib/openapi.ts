import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type ResponseConfig,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  answerSchema,
  answerWithSurveySchema,
  createAnswerSchema,
  createSurveySchema,
  createUserSchema,
  loginDataSchema,
  surveySchema,
  surveyStatsSchema,
  updateSurveySchema,
  userAccountSchema,
  userSchema,
} from "@survey-system/schemas";

export const registry = new OpenAPIRegistry();

// The API authenticates only through cookies (AUTH-05, API-30).
registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "jwt",
});
registry.registerComponent("securitySchemes", "refreshCookie", {
  type: "apiKey",
  in: "cookie",
  name: "refresh",
});

const cookieAuth = [{ cookieAuth: [] }];

// Error responses are RFC 9457 problems (API-09).
const problemSchema = registry.register(
  "Problem",
  z.object({
    type: z.string().openapi({ example: "about:blank" }),
    status: z.number().int().openapi({ example: 404 }),
    title: z.string().openapi({ example: "Not found" }),
    detail: z.string().openapi({ example: "The requested survey doesn't exist" }),
    errors: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional()
      .openapi({ description: "Only in 422 validation errors" }),
  }),
);

const problemDescriptions = {
  400: "Bad request",
  401: "Missing, expired or invalid session",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  422: "Validation error",
  429: "Too many requests",
  500: "Unexpected error",
} as const;

type ProblemStatus = keyof typeof problemDescriptions;

// Every endpoint can answer 429 (API-20) and 500; the rest are listed per path.
function problems(...statuses: ProblemStatus[]) {
  const responses: Record<number, ResponseConfig> = {};
  for (const status of [...statuses, 429, 500] as ProblemStatus[]) {
    responses[status] = {
      description: problemDescriptions[status],
      content: { "application/problem+json": { schema: problemSchema } },
    };
  }
  return responses;
}

function json(description: string, schema: z.ZodType): ResponseConfig {
  return { description, content: { "application/json": { schema } } };
}

const jsonBody = (schema: z.ZodType) => ({
  body: { content: { "application/json": { schema } } },
});

const data = (schema: z.ZodType) => z.object({ data: schema });

const slugParam = z.object({
  slug: z.string().openapi({ example: "employee-satisfaction-survey" }),
});
const answerParams = slugParam.extend({
  id: z.uuid().openapi({ example: "0192a0a0-0000-7000-8000-000000000001" }),
});

registry.register("Survey", surveySchema);
registry.register("SurveyStats", surveyStatsSchema);
registry.register("User", userSchema);

// Users
registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/signup",
  summary: "Register a new user",
  operationId: "registerUser",
  request: jsonBody(createUserSchema),
  responses: {
    200: json("User registered; sets the jwt and refresh cookies", data(userAccountSchema)),
    ...problems(409, 422),
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/login",
  summary: "Login a user",
  operationId: "loginUser",
  request: jsonBody(loginDataSchema),
  responses: {
    200: json("Logged in; sets the jwt and refresh cookies", data(userAccountSchema)),
    ...problems(401, 422),
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/logout",
  summary: "Logout the current user",
  operationId: "logoutUser",
  security: cookieAuth,
  responses: {
    204: { description: "Logged out; clears both cookies" },
    ...problems(401),
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/refresh",
  summary: "Refresh the session",
  operationId: "refreshAuthToken",
  security: [{ refreshCookie: [] }],
  responses: {
    204: { description: "New jwt and refresh cookies set" },
    ...problems(401),
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "get",
  path: "/api/v1/users/me",
  summary: "Get the current user",
  operationId: "getCurrentUser",
  security: cookieAuth,
  responses: {
    200: json("Current user (from the access token)", data(userSchema)),
    ...problems(401),
  },
});

// Surveys
registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys",
  summary: "Get all surveys",
  operationId: "getAllSurveys",
  security: cookieAuth,
  request: {
    query: z.object({
      active: z.enum(["true", "false"]).optional(),
      search: z.string().optional().openapi({ example: "employee" }),
      date: z
        .string()
        .optional()
        .openapi({ description: "Creation day, DD/MM/YYYY", example: "31/01/2026" }),
      page: z.string().optional().openapi({ description: "Positive integer", example: "1" }),
      limit: z.string().optional().openapi({ description: "Positive integer", example: "10" }),
      sort: z.enum(["name", "-name", "creation", "-creation"]).optional(),
    }),
  },
  responses: {
    200: json(
      "Page of surveys",
      z.object({
        data: z.array(surveySchema),
        meta: z.object({
          results: z.number().int(),
          page: z.number().int(),
          limit: z.number().int(),
        }),
      }),
    ),
    ...problems(401, 422),
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "post",
  path: "/api/v1/surveys",
  summary: "Create a new survey",
  operationId: "createSurvey",
  security: cookieAuth,
  request: jsonBody(createSurveySchema),
  responses: {
    201: json("Survey created (inactive)", data(surveySchema)),
    ...problems(401, 409, 422),
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys/{slug}",
  summary: "Get survey by slug",
  description:
    "Public. Inactive surveys are only returned with a session; an expired session on an inactive survey gets 401 so the client can refresh (SURV-12).",
  operationId: "getSurveyBySlug",
  security: [{}, { cookieAuth: [] }],
  request: { params: slugParam },
  responses: {
    200: json("Survey", data(surveySchema)),
    ...problems(401, 404),
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "patch",
  path: "/api/v1/surveys/{slug}",
  summary: "Update survey by slug",
  operationId: "updateSurveyBySlug",
  security: cookieAuth,
  request: { params: slugParam, ...jsonBody(updateSurveySchema) },
  responses: {
    200: json("Survey updated", data(surveySchema)),
    ...problems(400, 401, 404, 409, 422),
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "delete",
  path: "/api/v1/surveys/{slug}",
  summary: "Delete survey by slug",
  operationId: "deleteSurveyBySlug",
  security: cookieAuth,
  request: { params: slugParam },
  responses: {
    204: { description: "Survey deleted (soft)" },
    ...problems(401, 404),
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys/{slug}/stats",
  summary: "Get survey statistics",
  operationId: "getSurveyStatsBySlug",
  security: cookieAuth,
  request: { params: slugParam },
  responses: {
    200: json("Survey statistics", data(surveyStatsSchema)),
    ...problems(401, 404),
  },
});

// Answers
registry.registerPath({
  tags: ["Answers"],
  method: "post",
  path: "/api/v1/surveys/{slug}/answers",
  summary: "Submit an answer to a survey",
  description: "Public. One answer per IP and survey; inactive surveys return 404.",
  operationId: "createSurveyAnswer",
  request: { params: slugParam, ...jsonBody(createAnswerSchema) },
  responses: {
    201: json("Answer stored", data(answerSchema)),
    ...problems(400, 403, 404, 422),
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "get",
  path: "/api/v1/surveys/{slug}/answers",
  summary: "Get all answers of a survey",
  operationId: "getAllSurveyAnswers",
  security: cookieAuth,
  request: { params: slugParam },
  responses: {
    200: json(
      "Answers of the survey",
      z.object({
        data: z.array(answerSchema),
        meta: z.object({ results: z.number().int() }),
      }),
    ),
    ...problems(401, 404),
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "get",
  path: "/api/v1/surveys/{slug}/answers/{id}",
  summary: "Get an answer by id",
  operationId: "getSurveyAnswerById",
  security: cookieAuth,
  request: { params: answerParams },
  responses: {
    200: json("Answer with its survey's name and questions", data(answerWithSurveySchema)),
    ...problems(401, 404),
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "delete",
  path: "/api/v1/surveys/{slug}/answers/{id}",
  summary: "Delete an answer by id",
  operationId: "deleteSurveyAnswerById",
  security: cookieAuth,
  request: { params: answerParams },
  responses: {
    204: { description: "Answer deleted (soft)" },
    ...problems(401, 404),
  },
});

export function generateOpenApiDocument(): ReturnType<
  OpenApiGeneratorV3["generateDocument"]
> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Survey System API",
      description:
        "API endpoints documentation for the Survey System, built by Daxho",
    },
    servers: [{ url: "/" }],
  });
}
