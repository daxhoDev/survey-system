import type { FieldError } from "react-hook-form";

// ARIA wiring of a field and its client-side error (REQ-BRAND-019).
export const invalidProps = (error: FieldError | undefined, errorId: string) =>
  error
    ? { "aria-invalid": true as const, "aria-describedby": errorId }
    : {};
