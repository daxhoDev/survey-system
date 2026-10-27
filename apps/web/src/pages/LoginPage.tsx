import { LoginForm } from "@/components/login-form";

// `/auth/login`: the login form, centered.
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4 py-10">
      <LoginForm className="w-full max-w-120" />
    </div>
  );
}
