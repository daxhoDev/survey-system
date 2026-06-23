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
}

export default function ConfirmationDialog({
  description,
  confirmText,
  onConfirm,
}: Props) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirma tu acción</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onConfirm} variant="destructive">
          {confirmText}
        </Button>
        <DialogClose asChild>
          <Button variant="secondary">Cancelar</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
