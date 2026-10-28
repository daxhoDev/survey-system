import type { MouseEventHandler } from "react";
import { Button } from "./ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  description: string;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
  confirmText: string;
  /** The confirmed request is in flight (REQ-BRAND-018 loading state). */
  isPending?: boolean;
}

// The one confirmation of destructive actions (REQ-FE-025).
export default function ConfirmationDialog({
  description,
  confirmText,
  onConfirm,
  isPending = false,
}: Props) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirma tu acción</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button onClick={onConfirm} variant="destructive" loading={isPending}>
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
