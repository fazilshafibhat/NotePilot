"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/app/common";
import { useAddSource } from "@/lib/queries";
import type { SourceType } from "@/lib/types";

const TABS: { value: SourceType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "MARKDOWN", label: "Markdown" },
  { value: "PDF", label: "PDF" },
  { value: "WEBSITE", label: "Website" },
  { value: "YOUTUBE", label: "YouTube" },
];

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function AddSourceDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addSource = useAddSource(workspaceId);
  const [tab, setTab] = useState<SourceType>("TEXT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function reset() {
    setTitle("");
    setContent("");
    setUrl("");
    setFile(null);
  }

  const canSubmit =
    tab === "TEXT" || tab === "MARKDOWN"
      ? !!title.trim() && !!content.trim()
      : tab === "PDF"
        ? !!file
        : !!url.trim();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input =
      tab === "TEXT" || tab === "MARKDOWN"
        ? { kind: tab, title: title.trim(), content }
        : tab === "PDF"
          ? { kind: tab, file: file! }
          : { kind: tab, url: url.trim(), title: title.trim() || undefined };

    addSource.mutate(input, {
      onSuccess: (source) => {
        if (!source) {
          notifyError(
            new Error("The server didn't return the new source."),
            "Could not add source",
          );
          return;
        }
        notifySuccess(
          "Source added",
          `“${source.title}” is being processed in the background.`,
        );
        reset();
        onOpenChange(false);
      },
      onError: (error) => notifyError(error, "Could not add source"),
    });
  }

  function handleFile(next: File | undefined) {
    if (!next) return;
    if (next.type !== "application/pdf") {
      notifyError(new Error("Only PDF files are supported."), "Invalid file");
      return;
    }
    if (next.size > MAX_PDF_BYTES) {
      notifyError(new Error("PDFs must be 10 MB or smaller."), "File too large");
      return;
    }
    setFile(next);
  }

  const submitLabel = {
    TEXT: "Add text source",
    MARKDOWN: "Add markdown source",
    PDF: "Upload PDF",
    WEBSITE: "Import website",
    YOUTUBE: "Import video",
  }[tab];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add source</DialogTitle>
            <DialogDescription>
              Add knowledge to this notebook from text, files, or the web.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as SourceType)}
          >
            <TabsList className="w-full">
              {TABS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {(tab === "TEXT" || tab === "MARKDOWN") && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="source-title">Title</Label>
                <Input
                  id="source-title"
                  placeholder="Meeting notes"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source-content">Content</Label>
                <Textarea
                  id="source-content"
                  placeholder={
                    tab === "MARKDOWN"
                      ? "# Heading\n\nPaste your markdown here..."
                      : "Paste your text here..."
                  }
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="max-h-72 min-h-32"
                />
              </div>
            </>
          )}

          {tab === "PDF" && (
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files[0]);
              }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors hover:bg-muted/40"
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Drop a PDF here or click to browse"}
              </span>
              <span className="text-xs text-muted-foreground">Up to 10 MB</span>
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
          )}

          {(tab === "WEBSITE" || tab === "YOUTUBE") && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="source-url">
                  {tab === "WEBSITE" ? "Website URL" : "YouTube URL"}
                </Label>
                <Input
                  id="source-url"
                  type="url"
                  placeholder={
                    tab === "WEBSITE"
                      ? "https://example.com/article"
                      : "https://www.youtube.com/watch?v=..."
                  }
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source-url-title">Title (optional)</Label>
                <Input
                  id="source-url-title"
                  placeholder="Use the page title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                />
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit || addSource.isPending}>
              {addSource.isPending && <Spinner />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
