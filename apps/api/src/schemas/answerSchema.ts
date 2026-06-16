import { z } from "zod";

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

export type CreateAnswerSchema = z.infer<typeof createAnswerSchema>;
