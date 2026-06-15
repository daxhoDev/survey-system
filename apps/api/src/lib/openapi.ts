import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createUserSchema, loginDataSchema } from "../schemas/userSchema.js";
import {
  createSurveySchema,
  updateSurveySchema,
  surveySchema,
  surveyStatsSchema,
} from "../schemas/surveySchema.js";
import { createAnswerSchema } from "../schemas/answerSchema.js";

export const registry = new OpenAPIRegistry();

// Register Reusable Schemas
const userSchema = registry.register(
  "User",
  z.object({
    id: z.number().openapi({ example: 1 }),
    username: z.string().openapi({ example: "johndoe" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
  }),
);

registry.register(
  "SurveyStats",
  z.object({
    totalAnswers: z.number().openapi({ example: 42 }),
  }),
);

// User Routes
registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/signup",
  summary: "Register a new user",
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
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "post",
  path: "/api/v1/users/login",
  summary: "Login a user",
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
  },
});

registry.registerPath({
  tags: ["Users"],
  method: "get",
  path: "/api/v1/users/me",
  summary: "Get current user",
  responses: {
    200: {
      description: "Current user profile",
      content: {
        "application/json": {
          schema: userSchema,
        },
      },
    },
  },
});

// Survey Routes
registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys",
  summary: "Get all surveys",
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
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "post",
  path: "/api/v1/surveys",
  summary: "Create a new survey",
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
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys/{slug}",
  summary: "Get survey by slug",
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
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "patch",
  path: "/api/v1/surveys/{slug}",
  summary: "Update survey by slug",
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
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "delete",
  path: "/api/v1/surveys/{slug}",
  summary: "Delete survey by slug",
  request: {
    params: z.object({ slug: z.string().openapi({ example: "survey-slug" }) }),
  },
  responses: {
    204: {
      description: "Survey deleted",
    },
  },
});

registry.registerPath({
  tags: ["Surveys"],
  method: "get",
  path: "/api/v1/surveys/{slug}/stats",
  summary: "Get survey stats by slug",
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
  },
});

// Answer Routes
registry.registerPath({
  tags: ["Answers"],
  method: "post",
  path: "/api/v1/surveys/{slug}/answers",
  summary: "Create an answer for a survey",
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
    201: {
      description: "Answer created",
    },
  },
});

registry.registerPath({
  tags: ["Answers"],
  method: "get",
  path: "/api/v1/surveys/{slug}/answers",
  summary: "Get all answers for a survey",
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
              id: z.number().openapi({ example: 1 }),
              content: z.any().openapi({ example: "Red" }),
            }),
          ),
        },
      },
    },
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
