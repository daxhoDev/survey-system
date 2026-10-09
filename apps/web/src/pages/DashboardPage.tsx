import { useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import AppSidebar from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentUser } from "@/lib/api/users/users";
import { Outlet, useNavigate } from "react-router";

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
      <div className="flex h-screen w-screen items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return null;
  }

  // The sidebar component saves its open state in this cookie; read it back
  // so a collapsed sidebar stays collapsed after a reload.
  const sidebarOpen = !document.cookie
    .split("; ")
    .includes("sidebar_state=false");

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
