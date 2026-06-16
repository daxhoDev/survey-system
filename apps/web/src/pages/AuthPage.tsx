import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AuthPage({ children }: Props) {
  return (
    <div className="w-full min-h-dvh flex items-center justify-center">
      {children}
    </div>
  );
}
