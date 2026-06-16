import z from "zod";

export const jwtSchema = z.jwt("Must be a valid JWT");
