import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

function setup() {
  const onConfirm = vi.fn();
  render(
    <Dialog>
      <DialogTrigger asChild>
        <Button>Eliminar respuesta</Button>
      </DialogTrigger>
      <ConfirmationDialog
        description="¿Seguro que deseas eliminar esta respuesta?"
        confirmText="Eliminar"
        onConfirm={onConfirm}
      />
    </Dialog>,
  );
  return { onConfirm, user: userEvent.setup() };
}

describe("ConfirmationDialog (FE-25)", () => {
  it("shows the shared title, the description and both buttons", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Eliminar respuesta" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Confirma tu acción");
    expect(dialog).toHaveTextContent("¿Seguro que deseas eliminar esta respuesta?");
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirming", async () => {
    const { user, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Eliminar respuesta" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("closes without confirming when cancelling", async () => {
    const { user, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Eliminar respuesta" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
