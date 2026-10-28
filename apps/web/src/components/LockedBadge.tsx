import StatusLabel from "@/components/StatusLabel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Shown next to the status of a locked survey (REQ-FE-026), as the
// "Bloqueada" status label (REQ-BRAND-030).
export default function LockedBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex w-fit">
            <StatusLabel status="Bloqueada" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Ya fue activada: nombre y preguntas no se pueden modificar
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
