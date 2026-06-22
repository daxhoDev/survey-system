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
import type { User } from "@/lib/api/surveySystemAPI.schemas";
import { useNavigate } from "react-router";

export default function DashboardHeader() {
  const { data: rawData, isLoading, isRefetching } = useGetCurrentUser({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const user = rawData as unknown as User | undefined;

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
        <span className="font-semibold text-sm tracking-tight text-foreground">
          Dashboard
        </span>
      </div>

      <div className="flex items-center gap-4">
        {showLoading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : !user ? (
          <span className="text-xs text-destructive">Redirecting...</span>
        ) : (
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              title="Logout"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
