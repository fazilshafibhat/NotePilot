import { Suspense } from "react";
import { FullPageSpinner } from "@/components/app/auth-gate";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

/**
 * Notebook pages load their data in the browser after sign-in, so entering a
 * notebook shows a spinner by design. Opt out of Next.js "instant navigation"
 * validation, which otherwise flags that the page isn't in the static shell.
 */
export const instant = false;

/**
 * The workspace id is only known at request time, and the client components
 * below read it with useParams. With cacheComponents enabled that needs a
 * Suspense boundary.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
