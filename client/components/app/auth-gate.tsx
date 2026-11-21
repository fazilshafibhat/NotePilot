"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth-client";

/** Renders children only for signed-in users; otherwise sends them to `/`. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh flex-1 place-items-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
