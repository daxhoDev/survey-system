import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type Status =
  | "Activa"
  | "Inactiva"
  | "Bloqueada"
  | "Aceptada"
  | "Pendiente"
  | "Revocada"
  | "Caducada";

// Positive states are teal; every other state is neutral (REQ-BRAND-007).
const tone: Record<Status, string> = {
  Activa: "font-semibold text-teal",
  Aceptada: "font-semibold text-teal",
  Inactiva: "text-ink",
  Pendiente: "text-ink",
  Revocada: "text-ink-muted",
  Caducada: "text-ink-muted",
  Bloqueada: "text-ink-muted",
};

// Status label in tables and headers (REQ-BRAND-030): text, not a filled
// badge. "Bloqueada" carries a 16 px lock icon.
export default function StatusLabel({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      data-slot="status-label"
      className={cn(
        "inline-flex items-center gap-1.5 text-body",
        tone[status],
        className,
      )}
    >
      {status === "Bloqueada" && (
        <Lock aria-hidden="true" className="size-4 shrink-0" />
      )}
      {status}
    </span>
  );
}
