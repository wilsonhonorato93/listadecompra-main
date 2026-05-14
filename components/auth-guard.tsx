"use client";

import { useAuthStore } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialized) {
      if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
        router.push("/login");
      } else if (user && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
        router.push("/");
      }
    }
  }, [user, initialized, router, pathname]);

  if (!initialized || (!user && !pathname.startsWith("/login") && !pathname.startsWith("/register"))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
