import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Shown next to the status of a locked survey (FE-26).
export default function LockedBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="px-3 py-0.5 border rounded-full flex items-center justify-center w-fit gap-1.5 text-[10px] font-semibold tracking-wide uppercase bg-muted text-muted-foreground border-border"
          >
            <Lock className="size-3.5" />
            <span>Bloqueada</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Ya fue activada: nombre y preguntas no se pueden modificar
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
