"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { notifyError } from "@/components/app/common";
import { NOTEBOOK_ICONS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateWorkspace } from "@/lib/queries";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {NOTEBOOK_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          aria-pressed={value === icon}
          className={cn(
            "grid size-10 place-items-center rounded-xl border text-lg transition-colors hover:bg-muted",
            value === icon && "border-primary bg-primary/10 ring-2 ring-primary/40",
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createWorkspace = useCreateWorkspace();
  const [icon, setIcon] = useState(NOTEBOOK_ICONS[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setIcon(NOTEBOOK_ICONS[0]);
    setTitle("");
    setDescription("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createWorkspace.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
      },
      {
        onSuccess: (workspace) => {
          onOpenChange(false);
          reset();
          router.push(`/workspace/${workspace.id}`);
        },
        onError: (error) => notifyError(error, "Could not create notebook"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Create notebook</DialogTitle>
            <DialogDescription>
              Start a new notebook to organize your sources and chats.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notebook-title">Title</Label>
            <Input
              id="notebook-title"
              placeholder="My research notebook"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notebook-description">Description</Label>
            <Textarea
              id="notebook-description"
              placeholder="What is this notebook about?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
          </div>

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
              disabled={!title.trim() || createWorkspace.isPending}
            >
              {createWorkspace.isPending && <Spinner />}
              Create notebook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
