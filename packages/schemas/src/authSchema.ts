import { z } from "./zod-setup";

export const jwtSchema = z.jwt("Must be a valid JWT");
