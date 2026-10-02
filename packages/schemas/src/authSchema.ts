import { z } from "./zod-setup.js";

export const jwtSchema = z.jwt("Must be a valid JWT");
