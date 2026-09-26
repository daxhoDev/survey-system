import { z } from "./zod-setup.js";

// Path parameters that are ids: an invalid UUID is a 422 (API-34).
export const idParamSchema = z.strictObject({
  id: z
    .uuid("Must be a valid UUID")
    .openapi({ example: "0192a0a0-0000-7000-8000-000000000001" }),
});
