"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

export function Providers({ children }: { children: React.ReactNode }) {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
