import { Outlet } from "react-router";

export default function AuthPage() {
  return (
    <div className="w-full min-h-dvh flex flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
