"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  PageHeader,
  StatusBadge,
  notifyError,
  notifySuccess,
} from "@/components/app/common";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { ARTIFACT_TYPES, artifactLabel, timeAgo } from "@/lib/format";
import { useArtifacts, useCreateArtifact, useSources } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ArtifactType } from "@/lib/types";

export default function LearnPage() {
  const { workspace } = useWorkspaceContext();
  const { data: artifacts, isLoading } = useArtifacts(workspace.id);
  const [generating, setGenerating] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        icon={<GraduationCap className="size-6" />}
        title="Learning tools"
        description="Generate summaries, flashcards, quizzes, mind maps, and reports from your indexed sources."
        actions={
          <Button onClick={() => setGenerating(true)}>
            <Plus />
            Generate
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : artifacts?.length === 0 ? (
        <div className="space-y-3 rounded-3xl border p-10 text-center">
          <p className="font-semibold">No learning tools yet</p>
          <p className="text-sm text-muted-foreground">
            Generate your first summary, quiz, or flashcard deck from notebook
            sources.
          </p>
          <Button onClick={() => setGenerating(true)}>
            <Plus />
            Generate
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts?.map((artifact) => (
            <Link
              key={artifact.id}
              href={`/workspace/${workspace.id}/learn/${artifact.id}`}
              className="space-y-2 rounded-3xl border p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{artifactLabel(artifact.type)}</Badge>
                <StatusBadge status={artifact.status} />
              </div>
              <div className="font-heading font-semibold">{artifact.title}</div>
              <div className="text-xs text-muted-foreground">
                {artifactLabel(artifact.type)} · {timeAgo(artifact.createdAt)}
              </div>
            </Link>
          ))}
        </div>
      )}

      <GenerateDialog open={generating} onOpenChange={setGenerating} />
    </div>
  );
}

function GenerateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace } = useWorkspaceContext();
  const { data: sources } = useSources(workspace.id);
  const createArtifact = useCreateArtifact(workspace.id);
  const [type, setType] = useState<ArtifactType>("SUMMARY");
  const [title, setTitle] = useState("");

  const readyCount =
    sources?.filter((source) => source.status === "READY").length ?? 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createArtifact.mutate(
      { type, title: title.trim() || undefined },
      {
        onSuccess: () => {
          notifySuccess(
            "Generation started",
            "It will appear here when it's ready.",
          );
          setTitle("");
          onOpenChange(false);
        },
        onError: (error) => notifyError(error, "Could not start generation"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Generate learning tool</DialogTitle>
            <DialogDescription>
              Uses all ready sources in this notebook ({readyCount} ready).
              Generation runs in the background.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ARTIFACT_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setType(item.type)}
                  aria-pressed={type === item.type}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50",
                    type === item.type &&
                      "border-primary bg-primary/10 ring-2 ring-primary/30",
                  )}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="artifact-title">Title (optional)</Label>
            <Input
              id="artifact-title"
              placeholder="Custom title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </div>

          {readyCount === 0 && (
            <p className="text-sm text-muted-foreground">
              You need at least one source with status “ready” first.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={readyCount === 0 || createArtifact.isPending}
            >
              {createArtifact.isPending && <Spinner />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
