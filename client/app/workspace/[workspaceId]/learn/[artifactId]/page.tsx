"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  StatusBadge,
  notifyError,
  notifySuccess,
} from "@/components/app/common";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Markdown } from "@/components/app/markdown";
import { Flashcards } from "@/components/learn/flashcards";
import { Mindmap } from "@/components/learn/mindmap";
import { Quiz } from "@/components/learn/quiz";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { artifactLabel, downloadText, timeAgo } from "@/lib/format";
import { useArtifact, useDeleteArtifact } from "@/lib/queries";
import type {
  Artifact,
  FlashcardsContent,
  MindmapContent,
  QuizContent,
  ReportContent,
  SummaryContent,
  TakeawaysContent,
} from "@/lib/types";

export default function ArtifactPage() {
  const { artifactId } = useParams<{ artifactId: string }>();
  const { workspace } = useWorkspaceContext();
  const router = useRouter();
  const { data: artifact, isLoading, error } = useArtifact(
    workspace.id,
    artifactId,
  );
  const deleteArtifact = useDeleteArtifact(workspace.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const back = `/workspace/${workspace.id}/learn`;

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="font-semibold">Learning tool not found</p>
          <Button nativeButton={false} variant="outline" render={<Link href={back} />}>
            <ArrowLeft />
            Back to learning tools
          </Button>
        </div>
      </div>
    );
  }

  const exportText = artifactAsMarkdown(artifact);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href={back} />}>
          <ArrowLeft />
          <span className="sr-only">Back</span>
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="flex flex-wrap items-center gap-2 font-heading text-xl font-semibold">
            <Badge variant="outline">{artifactLabel(artifact.type)}</Badge>
            {artifact.title}
            <StatusBadge status={artifact.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {artifactLabel(artifact.type)} · Generated{" "}
            {timeAgo(artifact.createdAt)}
          </p>
        </div>
        {exportText && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(exportText);
                notifySuccess("Copied to clipboard");
              }}
            >
              <Copy />
              <span className="sr-only">Copy</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                downloadText(
                  `${artifact.title.replace(/[^\w-]+/g, "-")}.md`,
                  exportText,
                )
              }
            >
              <Download />
              <span className="sr-only">Download</span>
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <ArtifactBody
        artifact={artifact}
        onAsk={(label) =>
          router.push(
            `/workspace/${workspace.id}?ask=${encodeURIComponent(
              `Explain "${label}" based on my sources.`,
            )}`,
          )
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${artifact.title}”?`}
        description="This learning tool will be removed permanently."
        pending={deleteArtifact.isPending}
        onConfirm={() =>
          deleteArtifact.mutate(artifact.id, {
            onSuccess: () => router.replace(back),
            onError: (deleteError) =>
              notifyError(deleteError, "Could not delete learning tool"),
          })
        }
      />
    </div>
  );
}

function ArtifactBody({
  artifact,
  onAsk,
}: {
  artifact: Artifact;
  onAsk: (label: string) => void;
}) {
  if (artifact.status === "PENDING" || artifact.status === "PROCESSING") {
    return (
      <div className="flex items-center gap-2 rounded-3xl border p-8 text-sm text-muted-foreground">
        <Spinner />
        Generating in the background… this page updates automatically.
      </div>
    );
  }

  if (artifact.status === "FAILED" || !artifact.content) {
    const reason =
      typeof artifact.metadata?.processingError === "string"
        ? artifact.metadata.processingError
        : "Generation failed. Delete it and try again.";
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        {reason}
      </div>
    );
  }

  const content = artifact.content;

  switch (artifact.type) {
    case "FLASHCARDS":
      return (
        <div className="rounded-3xl border p-6">
          <Flashcards content={content as FlashcardsContent} />
        </div>
      );
    case "QUIZ":
      return (
        <div className="rounded-3xl border p-6">
          <Quiz content={content as QuizContent} />
        </div>
      );
    case "MINDMAP":
      return <Mindmap content={content as MindmapContent} onSelect={onAsk} />;
    case "TAKEAWAYS":
      return (
        <ol className="space-y-2">
          {(content as TakeawaysContent).items.map((item, index) => (
            <li key={index} className="flex gap-3 rounded-2xl border p-4 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span className="leading-6">{item}</span>
            </li>
          ))}
        </ol>
      );
    case "SUMMARY":
    case "REPORT":
      return (
        <div className="rounded-3xl border px-6 py-4">
          <Markdown>{(content as SummaryContent | ReportContent).markdown}</Markdown>
        </div>
      );
  }
}

function artifactAsMarkdown(artifact: Artifact): string | null {
  if (artifact.status !== "READY" || !artifact.content) return null;
  const content = artifact.content;
  switch (artifact.type) {
    case "SUMMARY":
    case "REPORT":
      return (content as SummaryContent).markdown;
    case "TAKEAWAYS":
      return (content as TakeawaysContent).items
        .map((item) => `- ${item}`)
        .join("\n");
    case "FLASHCARDS":
      return (content as FlashcardsContent).cards
        .map((card) => `**Q:** ${card.front}\n\n**A:** ${card.back}`)
        .join("\n\n---\n\n");
    case "QUIZ":
      return (content as QuizContent).questions
        .map(
          (question, index) =>
            `### ${index + 1}. ${question.question}\n\n${question.options
              .map(
                (option, optionIndex) =>
                  `- ${optionIndex === question.correctIndex ? "**✓**" : "  "} ${option}`,
              )
              .join("\n")}\n\n_${question.explanation}_`,
        )
        .join("\n\n");
    case "MINDMAP":
      return null;
  }
}
