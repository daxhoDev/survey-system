import { z } from "zod";

const surveyNameSchema = z
  .string("Survey name must be a string")
  .nonempty("Survey name can't be empty")
  .min(5, "Survey name is too short")
  .openapi({ example: "Employee Satisfaction Survey" });

export const questionSchema = z.strictObject(
  {
    id: z
      .number("Must be an integer")
      .min(1, "Must be positive")
      .openapi({ example: 1 }),
    name: z
      .string("Must be a string")
      .nonempty("Can't be empty")
      .min(5, "Must have al least 5 characters")
      .openapi({ example: "Are you happy at our company?" }),
    type: z
      .enum(
        {
          singleSelect: "SINGLE_SELECT",
          multiSelect: "MULTI_SELECT",
          textAnswer: "TEXT_ANSWER",
        },
        "Survey type must be SINGLE_SELECT, MULTI_SELECT or TEXT_ANSWER",
      )
      .openapi({ example: "SINGLE_SELECT" }),
    options: z
      .array(
        z.strictObject(
          {
            id: z
              .int("questions.options.id must be an integer")
              .min(1, "questions.options.id must be a positive number"),
            content: z
              .string("questions.options.content must be a string")
              .nonempty("questions.options.content can't be empty"),
          },
          "questions.options must be an array",
        ),
        "questions must be an array",
      )
      .nonempty(`An options array can't be empty`)
      .optional()
      .openapi({
        example: [
          { id: 1, content: "Yes" },
          { id: 2, content: "No" },
        ],
      }),
    isRequired: z.boolean("is_required must be a boolean"),
  },
  "Invalid question format",
);

const questionArrSchema = z
  .array(
    questionSchema.refine((data) => {
      if (data.type === "SINGLE_SELECT" || data.type === "MULTI_SELECT") {
        return data.options;
      }
      return !data.options;
    }, "If question type is a SELECT type there must be options"),
    { error: "Questions must be an array" },
  )
  .nonempty("Questions array can't be empty")
  .openapi({
    example: [
      {
        id: 1,
        name: "Are you happy at our company?",
        type: "SINGLE_SELECT",
        options: [
          { id: 1, content: "Yes" },
          { id: 2, content: "No" },
        ],
        isRequired: true,
      },
    ],
  });

export const createSurveySchema = z
  .strictObject(
    {
      name: surveyNameSchema,
      questions: questionArrSchema,
    },
    "Invalid format",
  )
  .openapi("CreateSurvey", {
    example: {
      name: "Employee Satisfaction Survey",
      questions: [
        {
          id: 1,
          name: "Are you happy at our company?",
          type: "SINGLE_SELECT",
          options: [
            { id: 1, content: "Yes" },
            { id: 2, content: "No" },
          ],
          isRequired: true,
        },
      ],
    },
  });

export const updateSurveySchema = z.object({
  name: surveyNameSchema.optional(),
  questions: questionArrSchema.optional(),
  isActive: z
    .boolean("is_active must be a boolean")
    .optional()
    .openapi("UpdateSurvey", {
      example: {
        name: "Employee Satisfaction Survey",
        questions: [
          {
            id: 1,
            name: "Are you happy at our company?",
            type: "SINGLE_SELECT",
            options: [
              { id: 1, content: "Yes" },
              { id: 2, content: "No" },
            ],
            isRequired: true,
          },
        ],
        isActive: true,
      },
    }),
});

export const surveySchema = z
  .strictObject(
    {
      id: z.uuidv4("Must be a UUID").min(1, "Must be positive"),
      name: surveyNameSchema,
      questions: questionArrSchema,
      isActive: z.boolean("is_active must be a boolean"),
      deletedAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      slug: z.string("Must be a string").nonempty("Can't be empty"),
      activatedAt: z.date().nullable(),
    },
    "Invalid format",
  )
  .openapi("Survey", {
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Employee Satisfaction Survey",
      questions: [
        {
          id: 1,
          name: "Are you happy at our company?",
          type: "SINGLE_SELECT",
          options: [
            { id: 1, content: "Yes" },
            { id: 2, content: "No" },
          ],
          isRequired: true,
        },
      ],
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
  });

export const optionStatsSchema = z
  .strictObject({
    questionId: z.number().int().openapi({ example: 1 }),
    questionName: z.string().openapi({ example: "Favorite Color?" }),
    options: z.array(
      z.strictObject({
        optionContent: z.string().openapi({ example: "Red" }),
        responseCount: z.number().int().openapi({ example: 10 }),
      }),
    ),
  })
  .openapi("OptionStats");

export const surveyStatsSchema = z
  .strictObject({
    totalAnswers: z.number().int().openapi({ example: 100 }),
    completedAnswers: z.number().int().openapi({ example: 80 }),
    incompleteAnswers: z.number().int().openapi({ example: 20 }),
    questionCount: z.number().int().openapi({ example: 15 }),
    optionStats: z.array(optionStatsSchema),
  })
  .openapi("SurveyStats", {
    example: {
      totalAnswers: 100,
      completedAnswers: 80,
      incompleteAnswers: 20,
      questionCount: 15,
      optionStats: [
        {
          questionId: 1,
          questionName: "Favorite Color?",
          options: [
            { optionContent: "Red", responseCount: 10 },
            { optionContent: "Blue", responseCount: 20 },
            { optionContent: "Green", responseCount: 30 },
          ],
        },
        {
          questionId: 2,
          questionName: "Preferred Work Environment?",
          options: [
            { optionContent: "Remote", responseCount: 40 },
            { optionContent: "In-Office", responseCount: 30 },
            { optionContent: "Hybrid", responseCount: 30 },
          ],
        },
      ],
    },
  });
