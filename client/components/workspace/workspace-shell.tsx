"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  MessageSquare,
  PanelLeft,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AuthGate } from "@/components/app/auth-gate";
import { SourceIcon } from "@/components/app/common";
import { AccountFooter, UserMenu } from "@/components/app/user-menu";
import { AddSourceDialog } from "@/components/workspace/add-source-dialog";
import { WorkspaceContext } from "@/components/workspace/workspace-context";
import { useSources, useWorkspace } from "@/lib/queries";
import { CHAT_MODELS, type ChatModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, error, isLoading } = useWorkspace(workspaceId);
  const [modelOverride, setModelOverride] = useState<ChatModel | null>(null);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  // Open by default on desktop, closed on phones. Shell only renders on the
  // client (AuthGate shows a spinner during SSR), so window is available.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );

  if (isLoading) {
    return (
      <div className="grid min-h-svh flex-1 place-items-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="grid min-h-svh flex-1 place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="font-heading text-xl font-semibold">
            Notebook not found
          </p>
          <p className="text-sm text-muted-foreground">
            It may have been deleted, or you don&apos;t have access.
          </p>
          <Button nativeButton={false} variant="outline" render={<Link href="/dashboard" />}>
            <ArrowLeft />
            Back to notebooks
          </Button>
        </div>
      </div>
    );
  }

  const model = modelOverride ?? workspace.defaultModel;

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        model,
        setModel: setModelOverride,
        openAddSource: () => setAddSourceOpen(true),
      }}
    >
      <div className="flex h-svh overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <WorkspaceSidebar
          open={sidebarOpen}
          onNavigate={() => {
            if (window.matchMedia("(max-width: 767px)").matches) {
              setSidebarOpen(false);
            }
          }}
          onAddSource={() => setAddSourceOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <PanelLeft />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            <div className="min-w-0 flex-1 truncate font-heading font-semibold">
              {workspace.title}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddSourceOpen(true)}
            >
              <Plus />
              <span className="hidden sm:inline">Add source</span>
            </Button>
            <Select
              value={model}
              onValueChange={(value) => setModelOverride(value as ChatModel)}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_MODELS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <UserMenu />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>

      <AddSourceDialog
        workspaceId={workspace.id}
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
      />
    </WorkspaceContext.Provider>
  );
}

const NAV = [
  { href: "", label: "Chat", icon: MessageSquare },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/sources", label: "Sources", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

function WorkspaceSidebar({
  open,
  onNavigate,
  onAddSource,
}: {
  open: boolean;
  onNavigate: () => void;
  onAddSource: () => void;
}) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const pathname = usePathname();
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: sources } = useSources(workspaceId);
  const base = `/workspace/${workspaceId}`;

  function isActive(href: string) {
    if (href === "") return pathname === base;
    return pathname.startsWith(base + href);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[margin,transform] duration-200 md:static md:z-auto",
        open
          ? "translate-x-0"
          : "-translate-x-full md:translate-x-0 md:-ml-64",
      )}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-3 border-b px-4 py-3 hover:bg-sidebar-accent/50"
        title="All notebooks"
      >
        <span className="text-2xl">{workspace?.icon || "📚"}</span>
        <div className="min-w-0">
          <div className="truncate font-semibold">{workspace?.title}</div>
          {workspace?.description && (
            <div className="truncate text-xs text-muted-foreground">
              {workspace.description}
            </div>
          )}
        </div>
      </Link>

      <nav className="space-y-0.5 p-2">
        <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
          Workspace
        </div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={base + href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
              isActive(href) &&
                "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <span className="text-xs font-medium text-muted-foreground">
            Sources
          </span>
          <Button variant="ghost" size="icon-xs" onClick={onAddSource}>
            <Plus />
            <span className="sr-only">Add source</span>
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {sources?.length === 0 && (
            <div className="space-y-2 px-2 py-1">
              <p className="text-xs text-muted-foreground">No sources yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onAddSource}
              >
                <Plus />
                Add source
              </Button>
            </div>
          )}
          {sources?.map((source) => (
            <Link
              key={source.id}
              href={`${base}/sources/${source.id}`}
              onClick={onNavigate}
              title={source.title}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                pathname === `${base}/sources/${source.id}` &&
                  "bg-sidebar-accent",
                source.status !== "READY" && "text-muted-foreground",
              )}
            >
              {source.status === "PENDING" || source.status === "PROCESSING" ? (
                <Spinner className="size-4 shrink-0" />
              ) : (
                <SourceIcon type={source.type} />
              )}
              <span className="truncate">{source.title}</span>
            </Link>
          ))}
        </div>
      </div>
      <AccountFooter />
    </aside>
  );
}
