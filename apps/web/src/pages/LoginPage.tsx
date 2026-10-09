import LoginBrandPanel from "@/components/LoginBrandPanel";
import { LoginForm } from "@/components/login-form";

// `/auth/login`: brand panel beside the form; the panel hides on narrow screens.
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh w-full lg:grid-cols-2">
      <LoginBrandPanel />
      <div className="flex items-center justify-center px-4 py-10">
        <LoginForm className="w-97/100 max-w-120" />
      </div>
    </div>
  );
}
