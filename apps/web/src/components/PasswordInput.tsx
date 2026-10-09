import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  showLabel?: string;
  hideLabel?: string;
};

// Password field with an eye button that toggles its visibility.
export default function PasswordInput({
  className,
  showLabel = "Mostrar contraseña",
  hideLabel = "Ocultar contraseña",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? hideLabel : showLabel}
        className="absolute inset-y-0 right-0.5 my-auto text-muted-foreground hover:text-foreground"
      >
        <Icon />
      </Button>
    </div>
  );
}
