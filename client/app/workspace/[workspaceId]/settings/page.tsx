"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  PageHeader,
  notifyError,
  notifySuccess,
} from "@/components/app/common";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { IconPicker } from "@/components/dashboard/workspace-dialog";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { useDeleteWorkspace, useUpdateWorkspace } from "@/lib/queries";
import { CHAT_MODELS, type ChatModel } from "@/lib/types";

export default function SettingsPage() {
  const { workspace } = useWorkspaceContext();
  const router = useRouter();
  const updateWorkspace = useUpdateWorkspace(workspace.id);
  const deleteWorkspace = useDeleteWorkspace();

  const [title, setTitle] = useState(workspace.title);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [icon, setIcon] = useState(workspace.icon ?? "📚");
  const [model, setModel] = useState<ChatModel>(workspace.defaultModel);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    title.trim() !== workspace.title ||
    description.trim() !== (workspace.description ?? "") ||
    icon !== (workspace.icon ?? "📚") ||
    model !== workspace.defaultModel;

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    updateWorkspace.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        icon,
        defaultModel: model,
      },
      {
        onSuccess: () => notifySuccess("Settings saved"),
        onError: (error) => notifyError(error, "Could not save settings"),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <PageHeader
        title="Notebook settings"
        description="Manage this notebook's details and defaults."
      />

      <form onSubmit={handleSave} className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="settings-title">Title</Label>
          <Input
            id="settings-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settings-description">Description</Label>
          <Textarea
            id="settings-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
        </div>
        <div className="grid gap-2">
          <Label>Icon</Label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="grid gap-2">
          <Label>Default chat model</Label>
          <Select
            value={model}
            onValueChange={(value) => setModel(value as ChatModel)}
          >
            <SelectTrigger className="w-44">
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
        </div>
        <div>
          <Button
            type="submit"
            disabled={!dirty || !title.trim() || updateWorkspace.isPending}
          >
            {updateWorkspace.isPending && <Spinner />}
            Save changes
          </Button>
        </div>
      </form>

      <div className="space-y-3 rounded-3xl border border-destructive/40 p-5">
        <div>
          <h2 className="font-semibold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting this notebook removes all sources, conversations, and
            indexed content permanently.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          Delete notebook
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${workspace.title}”?`}
        description="This cannot be undone."
        confirmLabel="Delete notebook"
        pending={deleteWorkspace.isPending}
        onConfirm={() =>
          deleteWorkspace.mutate(workspace.id, {
            onSuccess: () => router.replace("/dashboard"),
            onError: (error) => notifyError(error, "Could not delete notebook"),
          })
        }
      />
    </div>
  );
}
