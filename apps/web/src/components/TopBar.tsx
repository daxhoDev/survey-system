import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  useLogoutUser,
} from "@/lib/api/users/users";
import { cn } from "@/lib/utils";
import { GUTTERS } from "@/lib/layout";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";
import ConfirmationDialog from "./ConfirmationDialog";
import Logo from "./Logo";
import ThemeSelector, { ThemeRadioGroup } from "./ThemeSelector";

// Section navigation (REQ-FE-031): only the sections that exist.
const sections = [
  {
    to: "/dashboard",
    label: "Encuestas",
    isActive: (path: string) =>
      path === "/dashboard" ||
      path === "/dashboard/" ||
      path.startsWith("/dashboard/surveys"),
  },
  {
    to: "/dashboard/invitations",
    label: "Invitaciones",
    isActive: (path: string) => path.startsWith("/dashboard/invitations"),
  },
];

function SectionLinks({
  layout,
  onNavigate,
}: {
  layout: "bar" | "sheet";
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <ul
      className={cn(
        layout === "bar" ? "flex h-full items-stretch" : "flex flex-col",
      )}
    >
      {sections.map(({ to, label, isActive }) => {
        const active = isActive(pathname);
        return (
          <li key={to} className={cn(layout === "bar" && "flex")}>
            <Link
              to={to}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "text-body text-ink transition-colors duration-150 ease-out",
                active && "font-bold",
                layout === "bar"
                  ? // The underline sits inside the bar, on its bottom edge.
                    cn(
                      "relative flex items-center px-3.5 py-2.5",
                      "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:transition-colors after:duration-150 after:ease-out",
                      active
                        ? "after:bg-teal"
                        : "after:bg-transparent hover:after:bg-rule",
                    )
                  : "flex min-h-11 items-center px-0 py-2.5",
              )}
            >
              {layout === "bar" ? (
                label
              ) : (
                <span
                  className={cn(
                    "border-b-2 pb-0.5",
                    active ? "border-teal" : "border-transparent",
                  )}
                >
                  {label}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Dashboard top bar (REQ-FE-016): logo, sections, theme, user and "Salir";
// below md the sections fold into a menu sheet.
export default function TopBar() {
  const { data, isLoading } = useGetCurrentUser({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const user = data?.data;

  const logout = useLogoutUser({
    mutation: {
      onSuccess() {
        queryClient.clear();
        navigate("/auth/login");
      },
      onError(error) {
        toast.error(error.detail);
      },
      mutationKey: [getGetCurrentUserQueryKey],
    },
  });

  const askLogout = () => {
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const userArea = isLoading ? (
    <Skeleton className="w-24" />
  ) : !user ? (
    <span className="text-body text-ink-muted">Redirigiendo...</span>
  ) : null;

  return (
    <header className="h-[58px] shrink-0 border-b-2 border-rule-strong bg-paper">
      <div
        className={cn("mx-auto flex h-full w-full max-w-7xl items-stretch", GUTTERS)}
      >
        <Link
          to="/dashboard"
          aria-label="Sondix, ir a encuestas"
          className="flex items-center"
        >
          <Logo />
        </Link>

        <nav aria-label="Secciones" className="ml-6 hidden md:flex">
          <SectionLinks layout="bar" />
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <ThemeSelector />
          {userArea ?? (
            <>
              <span className="max-w-48 truncate text-body text-ink-muted">
                {user!.username}
              </span>
              <Button variant="ghost" onClick={askLogout}>
                Salir
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              closeLabel="Cerrar menú"
              aria-describedby={undefined}
              className="w-[min(20rem,85vw)] gap-6 px-4 pt-4 pb-6"
            >
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <div className="flex h-11 items-center">
                <Logo />
              </div>
              <nav
                aria-label="Secciones"
                className="border-t-2 border-rule-strong pt-2"
              >
                <SectionLinks
                  layout="sheet"
                  onNavigate={() => setMenuOpen(false)}
                />
              </nav>
              <div className="border-t border-rule pt-4">
                <ThemeRadioGroup />
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-rule pt-4">
                {userArea ?? (
                  <>
                    <span className="truncate text-body text-ink-muted">
                      {user!.username}
                    </span>
                    <Button
                      variant="outline"
                      onClick={askLogout}
                      className="justify-start"
                    >
                      <LogOut className="size-5" />
                      Salir
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {user && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <ConfirmationDialog
            description={`¿Seguro que deseas cerrar la sesión de ${user.username}?`}
            confirmText="Salir"
            isPending={logout.isPending}
            onConfirm={() => logout.mutate()}
          />
        </Dialog>
      )}
    </header>
  );
}
