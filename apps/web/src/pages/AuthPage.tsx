import { Outlet } from "react-router";
import Logo from "@/components/Logo";

// Shared frame of the login and accept-invitation pages (REQ-FE-030): one
// centered column on paper, at most 24 rem wide, with the logo, the product
// line and a strong rule above the page's own title, description and form.
export default function AuthPage() {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-paper px-4 py-12 md:items-center">
      <main className="flex w-full max-w-96 flex-col">
        <Logo />
        <p className="mt-2 text-small text-ink-muted">
          Sistema de gestión de encuestas
        </p>
        <hr className="mt-4 mb-8 border-0 border-t-2 border-rule-strong" />
        <Outlet />
      </main>
    </div>
  );
}
