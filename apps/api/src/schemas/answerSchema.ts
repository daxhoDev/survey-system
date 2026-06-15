import { z } from "zod";

export const responseSchema = z
  .strictObject(
    {
      id: z.number().int().openapi({ example: 1 }),
      content: z
        .string()
        .min(2)
        .or(z.array(z.number()).nonempty())
        .openapi({ example: "Red" }),
    },
    { description: "Each response must be an object" },
  )
  .openapi({
    refId: "Response",
  });

export const createAnswerSchema = z
  .strictObject(
    {
      responses: z.array(responseSchema),
    },
    { description: "Invalid answer" },
  )
  .openapi({
    refId: "CreateAnswer",
    example: {
      responses: [
        { id: 1, content: "Red" },
        { id: 2, content: [1, 2] },
      ],
    },
  });

export type CreateAnswerSchema = z.infer<typeof createAnswerSchema>;
