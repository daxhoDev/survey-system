import { useId } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { type Theme, useTheme } from "@/lib/theme";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

// Theme selector of the top bar from md (REQ-BRAND-011, REQ-FE-029): an
// icon-only button whose icon shows the active choice.
export default function ThemeSelector() {
  const [theme, setTheme] = useTheme();
  const active = options.find((o) => o.value === theme) ?? options[2]!;
  const Icon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema" title="Tema">
          <Icon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {options.map(({ value, label, icon: ItemIcon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <ItemIcon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The same three options as a radio group labelled "Tema", for the menu
// sheet below md (REQ-FE-016).
export function ThemeRadioGroup() {
  const [theme, setTheme] = useTheme();
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-small font-semibold text-ink-muted">
        Tema
      </span>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        value={theme}
        onValueChange={(value) => setTheme(value as Theme)}
        className="gap-0"
      >
        {options.map(({ value, label, icon: ItemIcon }) => (
          <Label
            key={value}
            htmlFor={`${id}-${value}`}
            className="min-h-11 cursor-pointer gap-3 font-normal"
          >
            <RadioGroupItem id={`${id}-${value}`} value={value} />
            <ItemIcon aria-hidden="true" className="size-5 text-ink-muted" />
            {label}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
