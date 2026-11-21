"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AuthGate } from "@/components/app/auth-gate";
import { Logo, PageHeader, notifyError } from "@/components/app/common";
import { HeaderActions } from "@/components/app/user-menu";
import { timeAgo } from "@/lib/format";
import { useMemories, useMemoryMutations } from "@/lib/queries";
import type { Memory } from "@/lib/types";

export default function MemoryPage() {
  return (
    <AuthGate>
      <MemoryManager />
    </AuthGate>
  );
}

function MemoryManager() {
  const { data: memories, isLoading, error } = useMemories();
  const { create } = useMemoryMutations();
  const [draft, setDraft] = useState("");

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    create.mutate(draft.trim(), {
      onSuccess: () => setDraft(""),
      onError: (createError) => notifyError(createError, "Could not save memory"),
    });
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Logo />
          <HeaderActions />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-10">
        <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft />
          Notebooks
        </Button>
        <PageHeader
          icon={<Brain className="size-6" />}
          title="Memory"
          description="Facts NotePilot remembers about you across notebooks. Some are learned from your chats; you can add, edit, or remove them."
        />

        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <Textarea
            placeholder="e.g. I prefer short answers with code examples"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            rows={2}
          />
          <Button type="submit" disabled={!draft.trim() || create.isPending}>
            {create.isPending ? <Spinner /> : <Plus />}
            Add
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-2xl border p-4 text-sm text-muted-foreground">
            Memory isn&apos;t available right now. Check that MEM0_API_KEY is
            set on the server.
          </p>
        ) : memories?.length === 0 ? (
          <p className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
            No memories yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {memories?.map((memory) => (
              <MemoryRow key={memory.id} memory={memory} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function MemoryRow({ memory }: { memory: Memory }) {
  const { update, remove } = useMemoryMutations();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(memory.memory);

  return (
    <li className="space-y-2 rounded-2xl border p-4">
      {editing ? (
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          autoFocus
        />
      ) : (
        <p className="text-sm">{memory.memory}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">
            {memory.source === "manual" ? "Added by you" : "Learned"}
          </Badge>
          {timeAgo(memory.updatedAt)}
        </div>
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setText(memory.memory);
                  setEditing(false);
                }}
              >
                <X />
                <span className="sr-only">Cancel</span>
              </Button>
              <Button
                size="icon-sm"
                disabled={!text.trim() || update.isPending}
                onClick={() =>
                  update.mutate(
                    { id: memory.id, memory: text.trim() },
                    {
                      onSuccess: () => setEditing(false),
                      onError: (error) =>
                        notifyError(error, "Could not update memory"),
                    },
                  )
                }
              >
                {update.isPending ? <Spinner /> : <Check />}
                <span className="sr-only">Save</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)}>
                <Pencil />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(memory.id, {
                    onError: (error) =>
                      notifyError(error, "Could not delete memory"),
                  })
                }
              >
                {remove.isPending ? <Spinner /> : <Trash2 />}
                <span className="sr-only">Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
