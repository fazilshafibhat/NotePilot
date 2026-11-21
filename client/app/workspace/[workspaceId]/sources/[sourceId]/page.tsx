"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  MessageSquare,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  SourceIcon,
  StatusBadge,
  notifyError,
  notifySuccess,
} from "@/components/app/common";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Markdown } from "@/components/app/markdown";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { SOURCE_TYPE_LABEL, downloadText, timeAgo } from "@/lib/format";
import {
  keys,
  needsRetry,
  useDeleteSources,
  useReprocessSources,
  useSource,
} from "@/lib/queries";

export default function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const { workspace } = useWorkspaceContext();
  const router = useRouter();
  const { data: source, isLoading, error } = useSource(workspace.id, sourceId);
  const deleteSources = useDeleteSources(workspace.id);
  const reprocess = useReprocessSources(workspace.id);
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const back = `/workspace/${workspace.id}/sources`;

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="font-semibold">Source not found</p>
          <Button nativeButton={false} variant="outline" render={<Link href={back} />}>
            <ArrowLeft />
            Back to sources
          </Button>
        </div>
      </div>
    );
  }

  const meta = [
    SOURCE_TYPE_LABEL[source.type],
    `Added ${timeAgo(source.createdAt)}`,
    source.metadata?.pageCount ? `${source.metadata.pageCount} pages` : null,
    source.metadata?.chunkCount
      ? `${source.metadata.chunkCount} chunks indexed`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const content = source.content?.trim();
  const link = source.url ?? source.metadata?.fileUrl;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href={back} />}>
          <ArrowLeft />
          <span className="sr-only">Back</span>
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="flex flex-wrap items-center gap-2 font-heading text-xl font-semibold">
            <SourceIcon type={source.type} className="size-5" />
            <span className="break-words">{source.title}</span>
            <StatusBadge status={source.status} />
          </h1>
          <p className="text-sm text-muted-foreground">{meta}</p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-sm break-all text-primary"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              {source.url ?? "Open original file"}
            </a>
          )}
        </div>
        {source.status === "READY" && (
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={`/workspace/${workspace.id}?source=${source.id}&ask=${encodeURIComponent(
                  "Give me an overview of this source and its key points.",
                )}`}
              />
            }
          >
            <MessageSquare />
            Chat about this
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
          <span className="sr-only">Delete source</span>
        </Button>
      </div>

      {needsRetry(source) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <span>
            {source.status === "FAILED"
              ? `Processing failed${
                  source.metadata?.processingError
                    ? `: ${source.metadata.processingError}`
                    : "."
                }`
              : "Processing seems stuck — the background job was probably lost (for example, the Inngest dev server restarted)."}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={reprocess.isPending}
            onClick={() =>
              reprocess.mutate([source.id], {
                onSuccess: () => {
                  notifySuccess("Processing restarted");
                  queryClient.invalidateQueries({
                    queryKey: keys.source(workspace.id, source.id),
                  });
                },
                onError: (retryError) =>
                  notifyError(retryError, "Could not restart processing"),
              })
            }
          >
            {reprocess.isPending ? <Spinner /> : <RotateCw />}
            Retry processing
          </Button>
        </div>
      )}

      {content ? (
        <div className="rounded-3xl border">
          <div className="flex justify-end gap-1 border-b px-3 py-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(content);
                notifySuccess("Copied to clipboard");
              }}
            >
              <Copy />
              <span className="sr-only">Copy content</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                downloadText(
                  `${source.title.replace(/[^\w-]+/g, "-")}.md`,
                  content,
                )
              }
            >
              <Download />
              <span className="sr-only">Download content</span>
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            {source.type === "TEXT" || source.type === "YOUTUBE" ? (
              <p className="text-sm leading-7 whitespace-pre-wrap">{content}</p>
            ) : (
              <Markdown>{content}</Markdown>
            )}
          </div>
        </div>
      ) : (
        source.status !== "FAILED" && (
          <div className="flex items-center gap-2 rounded-2xl border p-6 text-sm text-muted-foreground">
            <Spinner />
            Extracting content… this page updates automatically.
          </div>
        )
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${source.title}”?`}
        description="This source will be removed from search and chat permanently."
        pending={deleteSources.isPending}
        onConfirm={() =>
          deleteSources.mutate([source.id], {
            onSuccess: () => router.replace(back),
            onError: (deleteError) =>
              notifyError(deleteError, "Could not delete source"),
          })
        }
      />
    </div>
  );
}
