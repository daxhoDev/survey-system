import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import TopBar from "@/components/TopBar";
import { LoadingLine } from "@/components/DataStates";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentUser } from "@/lib/api/users/users";
import { GUTTERS } from "@/lib/layout";
import { cn } from "@/lib/utils";

// Session guard and dashboard layout (REQ-FE-013): top bar above a <main>
// holding the child route, centered and at most 80 rem wide.
export default function DashboardPage() {
  const { error, isLoading } = useGetCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      navigate("/auth/login");
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center px-4">
        <LoadingLine>Cargando panel...</LoadingLine>
      </div>
    );
  }

  if (error) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-dvh flex-col">
        <TopBar />
        <main className={cn("flex-1", GUTTERS)}>
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
