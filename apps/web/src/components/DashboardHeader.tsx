import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  useLogoutUser,
} from "@/lib/api/users/users";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useQueryClient } from "@tanstack/react-query";
// import { useNavigate, useRevalidator } from "react-router";
import { LogOut, User as UserIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { Link, useNavigate } from "react-router";
import logoLight from "@/assets/brand/logo-light.svg";
import logoDark from "@/assets/brand/logo-dark.svg";
import { Dialog, DialogTrigger } from "./ui/dialog";
import ConfirmationDialog from "./ConfirmationDialog";

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
        toast.error(<p className="text-destructive">{error.detail}</p>);
      },
      mutationKey: [getGetCurrentUserQueryKey],
    },
  });

  const showLoading = isLoading || isRefetching;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 w-full bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-2">
        {/* <SidebarTrigger className="-ml-1" /> */}
        {/* <Separator orientation="vertical" /> */}
        <img src={logoLight} alt="Sondix" className="h-7 w-auto dark:hidden" />
        <img
          src={logoDark}
          alt="Sondix"
          className="hidden h-7 w-auto dark:block"
        />
        <Link
          to="/dashboard"
          className="font-semibold text-sm tracking-tight text-foreground"
        >
          Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/dashboard/invitations">
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Invitaciones</span>
          </Link>
        </Button>
        {showLoading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : !user ? (
          <span className="text-xs text-destructive">Redirecting...</span>
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
                  title="Logout"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
