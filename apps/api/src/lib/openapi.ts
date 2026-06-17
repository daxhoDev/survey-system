import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  createUserSchema,
  loginDataSchema,
  userSchema,
} from "@survey-system/schemas";
import {
  createSurveySchema,
  updateSurveySchema,
  surveySchema,
  surveyStatsSchema,
} from "@survey-system/schemas";
import { createAnswerSchema } from "@survey-system/schemas";

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// Error Schema
const errorSchema = registry.register(
  "Error",
  z.object({
    type: z.string().openapi({ example: "about:blank" }),
    status: z.number().openapi({ example: 400 }),
    title: z.string().openapi({ example: "Error title" }),
    detail: z.string().openapi({ example: "Error detail" }),
    extensions: z.any().optional(),
  }),
);

// Helper for responses
const defaultResponses = {
  400: {
    description: "Bad Request",
    content: {
      "application/problem+json": {
        schema: errorSchema,
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/problem+json": {
        schema: errorSchema,
      },
    },
  },
  404: {
    description: "Not Found",
    content: {
      "application/problem+json": {
        schema: errorSchema,
      },
    },
  },
  422: {
    description: "Validation Error",
    content: {
      "application/problem+json": {
        schema: errorSchema,
      },
    },
  },
  500: {
    description: "Internal Server Error",
    content: {
      "application/problem+json": {
        schema: errorSchema,
      },
    },
  },
};

// ... (Registry registrations remain largely the same, just adding defaultResponses to every registerPath)
// Registry registrations are updated below ...

registry.register(
  "SurveyStats",
  surveyStatsSchema,
);

// User Routes
registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/signup",
  summary: "Register a new user",
  operationId: "registerUser",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User registered successfully",
      content: {
        "application/json": {
          schema: z.object({
            data: userSchema,
          }),
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/login",
  summary: "Login a user",
  operationId: "loginUser",
  request: {
    body: {
      content: {
        "application/json": {
          schema: loginDataSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User logged in successfully",
      content: {
        "application/json": {
          schema: z.object({
            data: userSchema,
          }),
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/logout",
  summary: "Logout a user",
  operationId: "logoutUser",
  security: [{ bearerAuth: [] }],
  responses: {
    204: {
      description: "User logged out successfully",
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/refresh",
  summary: "Refresh auth token",
  operationId: "refreshAuthToken",
  responses: {
    204: {
      description: "Token refreshed successfully",
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "get",
  path: "/api/v1/users/me",
  summary: "Get current user",
  operationId: "getCurrentUser",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: {
        "application/json": {
          schema: userSchema,
        },
      },
    },
    ...defaultResponses,
  },
});

// Survey Routes
registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys",
  summary: "Get all surveys",
  operationId: "getAllSurveys",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional().openapi({ example: "tech" }),
      page: z.number().optional().openapi({ example: 1 }),
      limit: z.number().optional().openapi({ example: 10 }),
      active: z.boolean().optional().openapi({ example: true }),
    }),
  },
  responses: {
    200: {
      description: "List of surveys",
      content: {
        "application/json": {
          schema: z.array(surveySchema),
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "post",
  path: "/api/v1/surveys",
  summary: "Create a new survey",
  operationId: "createSurvey",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createSurveySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Survey created",
      content: {
        "application/json": {
          schema: surveySchema,
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys/{slug}",
  summary: "Get survey by slug",
  operationId: "getSurveyBySlug",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
  },
  responses: {
    200: {
      description: "Survey details",
      content: {
        "application/json": {
          schema: surveySchema,
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "patch",
  path: "/api/v1/surveys/{slug}",
  summary: "Update survey by slug",
  operationId: "updateSurveyBySlug",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
    body: {
      content: {
        "application/json": {
          schema: updateSurveySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Survey updated",
      content: {
        "application/json": {
          schema: surveySchema,
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "delete",
  path: "/api/v1/surveys/{slug}",
  summary: "Delete survey by slug",
  operationId: "deleteSurveyBySlug",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
  },
  responses: {
    204: {
      description: "Survey deleted",
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys/{slug}/stats",
  summary: "Get survey stats by slug",
  operationId: "getSurveyStatsBySlug",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
  },
  responses: {
    200: {
      description: "Survey statistics",
      content: {
        "application/json": {
          schema: surveyStatsSchema,
        },
      },
    },
    ...defaultResponses,
  },
});

// Answer Routes
registry.registerPath({
  tags: ["Answers"],
  method: "post",
  path: "/api/v1/surveys/{slug}/answers",
  summary: "Create an answer for a survey",
  operationId: "createSurveyAnswer",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
    body: {
      content: {
        "application/json": {
          schema: createAnswerSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Answer created",
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "get",
  path: "/api/v1/surveys/{slug}/answers",
  summary: "Get all answers for a survey",
  operationId: "getAllSurveyAnswers",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
  },
  responses: {
    200: {
      description: "List of answers",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string().openapi({ example: "uuid" }),
              responses: z.any().openapi({ example: "Red" }),
            }),
          ),
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "get",
  path: "/api/v1/surveys/{slug}/answers/{id}",
  summary: "Get answer by ID",
  operationId: "getSurveyAnswerById",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      slug: z.string().openapi({ example: "survey-slug" }),
      id: z.string().openapi({ example: "answer-id" }),
    }),
  },
  responses: {
    200: {
      description: "Answer details",
      content: {
        "application/json": {
          schema: z.object({
            data: z.object({
              id: z.string().openapi({ example: "answer-id" }),
              responses: z.any().openapi({ example: "Red" }),
            }),
          }),
        },
      },
    },
    ...defaultResponses,
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "delete",
  path: "/api/v1/surveys/{slug}/answers/{id}",
  summary: "Delete answer by ID",
  operationId: "deleteSurveyAnswerById",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      slug: z.string().openapi({ example: "survey-slug" }),
      id: z.string().openapi({ example: "answer-id" }),
    }),
  },
  responses: {
    204: {
      description: "Answer deleted",
    },
    ...defaultResponses,
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Survey System API",
      description:
        "API endpoints documentation for the Survey System, built by Daxho",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
