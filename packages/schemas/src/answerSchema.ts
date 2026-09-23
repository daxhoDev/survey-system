import { z } from "./zod-setup.js";

export const responseSchema = z.strictObject(
  {
    id: z.number().int().openapi({ example: 1 }),
    content: z
      .string()
      .min(2)
      .or(z.array(z.number()).nonempty())
      .openapi({ example: "Red" }),
  },
  "Each response must be an object",
);

export const createAnswerSchema = z
  .strictObject(
    {
      responses: z.array(responseSchema),
    },
    "Invalid answer",
  )
  .openapi({
    example: {
      responses: [
        { id: 1, content: "Red" },
        { id: 2, content: [1, 2] },
      ],
    },
  });

// Response shapes (documentation only).
export const answerSchema = z
  .strictObject({
    id: z.uuid(),
    surveyId: z.uuid().nullable(),
    responses: z.array(responseSchema),
    originIp: z.string().openapi({ example: "203.0.113.10" }),
    createdAt: z.date(),
    deletedAt: z.date().nullable(),
  })
  .openapi("Answer");

export const answerWithSurveySchema = answerSchema
  .extend({
    surveys: z
      .strictObject({
        name: z.string(),
        questions: z.array(z.any()),
      })
      .nullable(),
  })
  .openapi("AnswerWithSurvey");

export type CreateAnswerSchema = z.infer<typeof createAnswerSchema>;
