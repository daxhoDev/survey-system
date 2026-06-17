import { useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
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

  return (
    <>
      <SidebarProvider>
        <DashboardSidebar />
        <div className="w-full">
          <DashboardHeader />
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
