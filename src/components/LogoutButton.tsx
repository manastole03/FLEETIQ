"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

interface LogoutButtonProps {
  redirectTo?: string;
  className?: string;
  children?: ReactNode;
}

export function LogoutButton({
  redirectTo = "/login",
  className,
  children = "Logout",
}: LogoutButtonProps) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <button type="button" onClick={logout} className={className}>
      <LogOut className="h-4 w-4" />
      {children}
    </button>
  );
}
