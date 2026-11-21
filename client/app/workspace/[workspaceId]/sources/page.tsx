"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  LayoutGrid,
  List,
  Plus,
  RotateCw,
  Search,
  Trash2,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  SourceIcon,
  StatusBadge,
  notifyError,
  notifySuccess,
} from "@/components/app/common";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { SOURCE_TYPE_LABEL, timeAgo } from "@/lib/format";
import {
  needsRetry,
  useDeleteSources,
  useReprocessSources,
  useSources,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ProcessingStatus, Source, SourceType } from "@/lib/types";

const ALL = "ALL";
const TYPES: SourceType[] = ["PDF", "WEBSITE", "YOUTUBE", "TEXT", "MARKDOWN"];
const STATUSES: ProcessingStatus[] = ["READY", "PROCESSING", "PENDING", "FAILED"];

export default function SourcesPage() {
  const { workspace, openAddSource } = useWorkspaceContext();
  const { data: sources, isLoading } = useSources(workspace.id);
  const deleteSources = useDeleteSources(workspace.id);
  const reprocess = useReprocessSources(workspace.id);
  const retryable = (sources ?? []).filter(needsRetry);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (sources ?? []).filter(
      (source) =>
        (type === ALL || source.type === type) &&
        (status === ALL || source.status === status) &&
        (!needle ||
          `${source.title} ${source.url ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [sources, query, type, status]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const count = sources?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Source library"
        description={`${count} source${count === 1 ? "" : "s"} in this notebook`}
        actions={
          <Button onClick={openAddSource}>
            <Plus />
            Add source
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={type}
          onChange={setType}
          allLabel="All types"
          options={TYPES.map((item) => [item, SOURCE_TYPE_LABEL[item]])}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          allLabel="All statuses"
          options={STATUSES.map((item) => [
            item,
            item.charAt(0) + item.slice(1).toLowerCase(),
          ])}
        />
        <div className="flex rounded-2xl border p-0.5">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setView("grid")}
          >
            <LayoutGrid />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setView("list")}
          >
            <List />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {retryable.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <span>
            {retryable.length} source{retryable.length === 1 ? "" : "s"} failed
            or got stuck while processing.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={reprocess.isPending}
            onClick={() =>
              reprocess.mutate(undefined, {
                onSuccess: (requeued) =>
                  notifySuccess(
                    `Retrying ${requeued.length} source${requeued.length === 1 ? "" : "s"}`,
                  ),
                onError: (error) =>
                  notifyError(error, "Could not restart processing"),
              })
            }
          >
            {reprocess.isPending ? <Spinner /> : <RotateCw />}
            Retry all
          </Button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-2xl border bg-muted/40 px-4 py-2 text-sm">
          <span>{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-3xl border p-6 text-center">
          <div className="max-w-xs space-y-3">
            <span className="mx-auto grid size-10 place-items-center rounded-full bg-muted">
              <BookOpen className="size-5" />
            </span>
            <p className="font-heading text-lg font-semibold">
              No sources found
            </p>
            <p className="text-sm text-muted-foreground">
              {count === 0
                ? "Add your first source to start building this notebook."
                : "Try a different search or filter."}
            </p>
            {count === 0 && (
              <Button onClick={openAddSource}>
                <Plus />
                Add source
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "divide-y rounded-2xl border",
          )}
        >
          {filtered.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
              view={view}
              href={`/workspace/${workspace.id}/sources/${source.id}`}
              selected={selected.has(source.id)}
              onToggle={() => toggle(source.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${selected.size} source${selected.size === 1 ? "" : "s"}?`}
        description="Deleted sources are removed from search and chat permanently."
        pending={deleteSources.isPending}
        onConfirm={() =>
          deleteSources.mutate([...selected], {
            onSuccess: () => {
              setSelected(new Set());
              setConfirmDelete(false);
            },
            onError: (error) => notifyError(error, "Could not delete sources"),
          })
        }
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: [string, string][];
}) {
  const labels = new Map(options);
  return (
    <Select value={value} onValueChange={(next) => onChange(next as string)}>
      <SelectTrigger className="w-36">
        <SelectValue>
          {(current: string) =>
            current === ALL ? allLabel : (labels.get(current) ?? current)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map(([optionValue, label]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SourceItem({
  source,
  view,
  href,
  selected,
  onToggle,
}: {
  source: Source;
  view: "grid" | "list";
  href: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const meta = [
    SOURCE_TYPE_LABEL[source.type],
    `Added ${timeAgo(source.createdAt)}`,
    source.metadata?.chunkCount ? `${source.metadata.chunkCount} chunks` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "group relative flex gap-3 transition-colors hover:bg-muted/40",
        view === "grid" ? "rounded-2xl border p-4" : "items-center px-4 py-3",
        selected && "bg-primary/5",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="relative z-10 mt-0.5"
        aria-label={`Select ${source.title}`}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link href={href} className="flex items-center gap-2 font-medium">
          <span aria-hidden className="absolute inset-0" />
          <SourceIcon type={source.type} />
          <span className="truncate">{source.title}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={source.status} />
          {meta}
        </div>
        {source.status === "FAILED" && source.metadata?.processingError && (
          <p className="line-clamp-2 text-xs text-destructive">
            {source.metadata.processingError}
          </p>
        )}
      </div>
    </div>
  );
}
