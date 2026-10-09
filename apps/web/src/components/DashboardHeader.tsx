import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  useLogoutUser,
} from "@/lib/api/users/users";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useQueryClient } from "@tanstack/react-query";
// import { useNavigate, useRevalidator } from "react-router";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { Link, useNavigate } from "react-router";
import logoLight from "@/assets/brand/logo-light.svg";
import logoDark from "@/assets/brand/logo-dark.svg";
import { Dialog, DialogTrigger } from "./ui/dialog";
import ConfirmationDialog from "./ConfirmationDialog";
import ThemeSelector from "./ThemeSelector";
import { SidebarTrigger } from "./ui/sidebar";

export default function DashboardHeader() {
  const { data, isLoading, isRefetching } = useGetCurrentUser({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const user = data?.data;

  const logout = useLogoutUser({
    mutation: {
      onSuccess() {
        queryClient.clear();
        navigate("/auth/login");
      },
      onError(error) {
        toast.error(<p className="text-destructive-text">{error.detail}</p>);
      },
      mutationKey: [getGetCurrentUserQueryKey],
    },
  });

  const showLoading = isLoading || isRefetching;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 w-full bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {/* On mobile the sidebar is a closed sheet, so the logo stays here. */}
        <Link
          to="/dashboard"
          aria-label="Sondix, ir a encuestas"
          className="flex items-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
        >
          <img src={logoLight} alt="" className="h-6 w-auto dark:hidden" />
          <img src={logoDark} alt="" className="hidden h-6 w-auto dark:block" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <ThemeSelector />
        {showLoading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : !user ? (
          <span className="text-xs text-destructive-text">Redirecting...</span>
        ) : (
          <Dialog>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  {user.username ? (
                    <span className="text-xs font-semibold uppercase">
                      {user.username.charAt(0)}
                    </span>
                  ) : (
                    <UserIcon className="size-4" />
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
                  {user.username}
                </span>
              </div>
              <Separator orientation="vertical" />

              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={logout.isPending}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="text-muted-foreground hover:text-destructive-text hover:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="size-4" />
                </Button>
              </DialogTrigger>
              <ConfirmationDialog
                description={`Estás seguro de que deseas cerrar la sesión como ${user.username}?`}
                confirmText="Cerrar sesión"
                onConfirm={() => logout.mutate()}
              />
            </div>
          </Dialog>
        )}
      </div>
    </header>
  );
}
