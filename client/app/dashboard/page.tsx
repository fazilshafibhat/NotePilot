"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthGate } from "@/components/app/auth-gate";
import { Logo, notifyError } from "@/components/app/common";
import { HeaderActions } from "@/components/app/user-menu";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CreateWorkspaceDialog } from "@/components/dashboard/workspace-dialog";
import { useSession } from "@/lib/auth-client";
import { notebookGradient, timeAgo } from "@/lib/format";
import { useDeleteWorkspace, useWorkspaces } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/types";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Upload sources",
    text: "PDFs, websites, YouTube, and notes in one place",
  },
  {
    icon: MessageSquare,
    title: "Chat with context",
    text: "Ask questions grounded in your materials",
  },
  {
    icon: Sparkles,
    title: "Learn faster",
    text: "Flashcards, quizzes, mind maps, and summaries",
  },
];

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const { data: session } = useSession();
  const { data: workspaces, isLoading } = useWorkspaces();
  const deleteWorkspace = useDeleteWorkspace();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Workspace | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!workspaces) return [];
    if (!needle) return workspaces;
    return workspaces.filter((workspace) =>
      `${workspace.title} ${workspace.description ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [workspaces, query]);

  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Logo />
          <HeaderActions />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-6 py-10">
        <section className="space-y-3">
          <p className="text-sm font-medium text-primary">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Your notebooks
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Organize sources, chat with your materials, and generate learning
            tools — all in one workspace.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card/60 p-5">
              <Icon className="mb-3 size-5 text-primary" />
              <div className="font-semibold">{title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Recent notebooks
              </h2>
              <p className="text-sm text-muted-foreground">
                {workspaces?.length ?? 0} notebook
                {workspaces?.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notebooks..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="group flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center transition-colors hover:border-primary/60 hover:bg-muted/40"
            >
              <span className="grid size-10 place-items-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Plus className="size-5" />
              </span>
              <span className="font-semibold">Create notebook</span>
              <span className="text-sm text-muted-foreground">
                Upload sources and start chatting
              </span>
            </button>

            {isLoading &&
              Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="min-h-44 rounded-2xl" />
              ))}

            {filtered.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onDelete={() => setToDelete(workspace)}
              />
            ))}
          </div>

          {!isLoading && workspaces?.length !== 0 && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No notebooks match “{query}”.
            </p>
          )}
        </section>
      </main>

      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete “${toDelete?.title}”?`}
        description="This removes all sources, conversations, and learning tools in this notebook permanently."
        confirmLabel="Delete notebook"
        pending={deleteWorkspace.isPending}
        onConfirm={() =>
          toDelete &&
          deleteWorkspace.mutate(toDelete.id, {
            onSuccess: () => setToDelete(null),
            onError: (error) => notifyError(error, "Could not delete notebook"),
          })
        }
      />
    </div>
  );
}

function WorkspaceCard({
  workspace,
  onDelete,
}: {
  workspace: Workspace;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative min-h-44 overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-sm transition-transform hover:-translate-y-0.5",
        notebookGradient(workspace.id),
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12)_0_2px,transparent_2px_14px)]"
      />
      <Link
        href={`/workspace/${workspace.id}`}
        className="relative flex h-full min-h-44 flex-col justify-between p-5"
      >
        <span className="text-2xl drop-shadow">{workspace.icon || "📚"}</span>
        <div>
          <div className="font-heading text-lg font-semibold drop-shadow">
            {workspace.title}
          </div>
          {workspace.description && (
            <div className="line-clamp-1 text-sm text-white/85">
              {workspace.description}
            </div>
          )}
          <div className="mt-1 text-xs text-white/75">
            Updated {timeAgo(workspace.updatedAt)}
          </div>
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full bg-black/20 text-white hover:bg-black/35 hover:text-white"
              />
            }
          >
            <MoreHorizontal />
            <span className="sr-only">Notebook options</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
