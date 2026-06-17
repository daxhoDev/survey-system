import { z } from "./zod-setup";

export const queryStringSchema = z.object({
  active: z
    .enum(["true", "false"], "Query string 'active' must be a boolean")
    .transform((value) =>
      value === "true" ? true : value === "false" ? false : value,
    )
    .optional(),
  search: z.string("Query string 'search' must be a string").optional(),
  date: z
    .string()
    .regex(
      /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
      "Query string 'date' must be a valid date with format DD/MM/YYYY",
    )
    .transform((value) => {
      const [day, month, year] = value.split("/").map(Number);
      return new Date(year as number, (month as number) - 1, day as number);
    })
    .optional(),
  page: z
    .string()
    .refine(
      (value) => Number(value) > 0,
      "Query string 'page' must ve a positive integer",
    )
    .transform((value) => Number(value))
    .optional(),
  limit: z
    .string()
    .refine(
      (value) => Number(value) > 0,
      "Query string 'limit' must ve a positive integer",
    )
    .transform((value) => Number(value))
    .optional(),
  sort: z
    .enum(
      ["name", "-name", "creation", "-creation"],
      "Query string 'createdAt' value must be either 'name', '-name', 'creation' or '-creation'",
    )
    .optional(),
});
