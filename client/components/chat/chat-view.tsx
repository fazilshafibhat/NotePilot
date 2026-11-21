"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Brain,
  Bot,
  Download,
  Globe,
  Info,
  MessageSquarePlus,
  Square,
  Trash2,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Markdown } from "@/components/app/markdown";
import { SourceIcon, notifyError } from "@/components/app/common";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { DIRECT_API_URL } from "@/lib/api";
import { downloadText } from "@/lib/format";
import {
  fetchMessages,
  keys,
  useConversations,
  useDeleteConversation,
  useSources,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Citation, StoredMessage } from "@/lib/types";

type ChatMessage = UIMessage<{ citations?: Citation[] | null }>;

const NEW_CHAT = "__new__";

function toUIMessages(stored: StoredMessage[]): ChatMessage[] {
  return stored.map((message) => ({
    id: message.id,
    role: message.role === "USER" ? "user" : "assistant",
    parts: [{ type: "text", text: message.content }],
    metadata: { citations: message.citations },
  }));
}

function messageText(message: ChatMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ChatView() {
  const { workspace, model } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const { data: conversations } = useConversations(workspace.id);
  const deleteConversation = useDeleteConversation(workspace.id);
  const { data: sources } = useSources(workspace.id);
  const readySources = (sources ?? []).filter(
    (source) => source.status === "READY",
  );

  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationRef = useRef<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  // Links can pre-fill a question (?ask=…) and focus one source (?source=id).
  const searchParams = useSearchParams();
  const [input, setInput] = useState(() => searchParams.get("ask") ?? "");
  const [focusId, setFocusId] = useState<string | null>(() =>
    searchParams.get("source"),
  );
  const focusSource = sources?.find((source) => source.id === focusId);

  // Use ?ask/?source once, then drop them so a reload doesn't re-fill old text.
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (searchParams.has("ask") || searchParams.has("source")) {
      router.replace(pathname, { scroll: false });
    }
    // Only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chatAbout(sourceId: string) {
    setFocusId(sourceId);
    setInput("Give me an overview of this source and its key points.");
  }
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function selectConversation(id: string | null) {
    conversationRef.current = id;
    setConversationId(id);
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: `${DIRECT_API_URL}/api/workspaces/${workspace.id}/chat`,
        credentials: "include",
        // The server creates the conversation on the first message and
        // returns its id in a header.
        fetch: async (url, init) => {
          const response = await fetch(url, init);
          const id = response.headers.get("X-Conversation-Id");
          if (id && id !== conversationRef.current) {
            selectConversation(id);
          }
          if (!response.ok) {
            const data = await response.clone().json().catch(() => null);
            throw new Error(data?.error ?? `Chat failed (${response.status})`);
          }
          return response;
        },
      }),
    [workspace.id],
  );

  const { messages, setMessages, sendMessage, status, stop } =
    useChat<ChatMessage>({
      transport,
      onError: (error) => notifyError(error, "Chat failed"),
      onFinish: () => {
        void syncFromServer();
      },
    });

  /**
   * Citations are saved with the assistant message on the server, not sent in
   * the stream, so reload the conversation once the reply is persisted.
   */
  async function syncFromServer() {
    const id = conversationRef.current;
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: keys.conversations(workspace.id) });
    for (const delay of [300, 1200, 3000]) {
      await sleep(delay);
      if (conversationRef.current !== id) return;
      try {
        const stored = await fetchMessages(workspace.id, id);
        if (stored.at(-1)?.role === "ASSISTANT") {
          setMessages(toUIMessages(stored));
          return;
        }
      } catch {
        return;
      }
    }
  }

  async function openConversation(id: string) {
    if (status === "streaming" || status === "submitted") stop();
    selectConversation(id);
    setFocusId(null);
    setLoadingHistory(true);
    try {
      setMessages(toUIMessages(await fetchMessages(workspace.id, id)));
    } catch (error) {
      notifyError(error, "Could not load conversation");
    } finally {
      setLoadingHistory(false);
    }
  }

  function newChat() {
    if (status === "streaming" || status === "submitted") stop();
    selectConversation(null);
    setFocusId(null);
    setMessages([]);
  }

  const busy = status === "submitted" || status === "streaming";

  function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage(
      { text },
      {
        body: {
          conversationId: conversationRef.current ?? undefined,
          model,
          webSearch,
          sourceIds: focusSource ? [focusSource.id] : undefined,
        },
      },
    );
  }

  function handleExport() {
    const title =
      conversations?.find((item) => item.id === conversationId)?.title ??
      "Chat";
    const body = messages
      .map(
        (message) =>
          `## ${message.role === "user" ? "You" : "NotePilot"}\n\n${messageText(message)}`,
      )
      .join("\n\n");
    downloadText(`${title.replace(/[^\w-]+/g, "-")}.md`, `# ${title}\n\n${body}\n`);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  const lastMessage = messages.at(-1);
  const waitingForReply =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      !messageText(lastMessage));

  return (
    <div className="flex h-full flex-col">
      {/* Conversation toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <Select
          value={conversationId ?? NEW_CHAT}
          onValueChange={(value) =>
            value === NEW_CHAT ? newChat() : openConversation(value as string)
          }
        >
          <SelectTrigger size="sm" className="w-64 max-w-full">
            <SelectValue>
              {(value: string) =>
                value === NEW_CHAT
                  ? "New chat"
                  : (conversations?.find((item) => item.id === value)?.title ??
                    "Untitled chat")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW_CHAT}>New chat</SelectItem>
            {conversations?.map((conversation) => (
              <SelectItem key={conversation.id} value={conversation.id}>
                <span className="max-w-72 truncate">
                  {conversation.title ?? "Untitled chat"}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={newChat}>
          <MessageSquarePlus />
          New
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          disabled={messages.length === 0}
        >
          <Download />
          Export
        </Button>
        {conversationId && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
            <span className="sr-only">Delete conversation</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingHistory ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center p-6">
            <div className="max-w-sm space-y-3 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-muted">
                <Bot className="size-5" />
              </span>
              <p className="font-semibold">Chat with your sources</p>
              <p className="text-sm text-muted-foreground">
                Every ready source in this notebook is searched automatically —
                just ask. Answers include citations when relevant context is
                found.
              </p>
              {readySources.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {readySources.slice(0, 4).map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => chatAbout(source.id)}
                      className="max-w-full truncate rounded-full border px-3 py-1 text-xs transition-colors hover:border-primary/60 hover:bg-muted"
                    >
                      Chat about “{source.title}”
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-3xl bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">
                    {messageText(message)}
                  </div>
                </div>
              ) : (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  workspaceId={workspace.id}
                />
              ),
            )}
            {waitingForReply && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="mx-auto w-full max-w-3xl shrink-0 space-y-2 px-4 pt-2 pb-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="xs"
            variant={webSearch ? "default" : "outline"}
            onClick={() => setWebSearch((value) => !value)}
            aria-pressed={webSearch}
            title={
              webSearch
                ? "Web search is on: the AI may search the internet and cite pages as [W1], [W2]"
                : "Turn on to let the AI search the internet for things your sources don't cover"
            }
          >
            <Globe />
            Web search
          </Button>
          {focusSource && (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs">
              <SourceIcon type={focusSource.type} className="size-3.5" />
              <span className="truncate">
                Only searching “{focusSource.title}”
              </span>
              <button
                type="button"
                onClick={() => setFocusId(null)}
                className="grid size-5 place-items-center rounded-full hover:bg-muted"
                aria-label="Search all sources again"
                title="Search all sources again"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
        <div className="flex items-end gap-2 rounded-3xl border bg-card p-2 focus-within:ring-2 focus-within:ring-ring/30">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your sources…"
            rows={1}
            className="max-h-48 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => stop()}
            >
              <Square className="fill-current" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              disabled={!input.trim()}
            >
              <ArrowUp />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this conversation?"
        description="All messages in this conversation will be removed permanently."
        pending={deleteConversation.isPending}
        onConfirm={() =>
          conversationId &&
          deleteConversation.mutate(conversationId, {
            onSuccess: () => {
              setConfirmDelete(false);
              newChat();
            },
            onError: (error) =>
              notifyError(error, "Could not delete conversation"),
          })
        }
      />
    </div>
  );
}

function AssistantMessage({
  message,
  workspaceId,
}: {
  message: ChatMessage;
  workspaceId: string;
}) {
  const searching = message.parts.some(
    (part) =>
      part.type === "tool-web_search" &&
      "state" in part &&
      part.state !== "output-available" &&
      part.state !== "output-error",
  );
  const text = messageText(message);
  const grounding = groundingOf(message);

  return (
    <div className={cn("space-y-2", !text && !searching && "hidden")}>
      {searching && (
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Globe className="size-3.5" />
          Searching the web…
        </div>
      )}
      {text && (
        <Markdown citations={message.metadata?.citations} workspaceId={workspaceId}>
          {text}
        </Markdown>
      )}
      {text && grounding === "none" && (
        <GroundingNote icon={Info}>
          Not backed by your sources or saved memories.
        </GroundingNote>
      )}
      {text && grounding === "memory" && (
        <GroundingNote icon={Brain}>
          From your saved memories — not from your sources.
        </GroundingNote>
      )}
      {text && grounding === "web" && (
        <GroundingNote icon={Globe}>
          From web search — not from your sources.
        </GroundingNote>
      )}
      {text && <WebSources citations={message.metadata?.citations} />}
    </div>
  );
}

/** Lists the websites a reply's web search used, with links. */
function WebSources({ citations }: { citations?: Citation[] | null }) {
  const seen = new Set<string>();
  const pages = (citations ?? []).flatMap((citation) =>
    citation.sourceType === "WEB" && !seen.has(citation.url)
      ? (seen.add(citation.url), [citation])
      : [],
  );
  if (pages.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="size-3.5" />
        Web sources
      </div>
      <div className="flex flex-wrap gap-2">
        {pages.map((page, index) => {
          let host = page.url;
          try {
            host = new URL(page.url).hostname.replace(/^www\./, "");
          } catch {}
          return (
            <a
              key={page.url}
              href={page.url}
              target="_blank"
              rel="noreferrer"
              title={page.sourceTitle}
              className="flex max-w-64 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition-colors hover:border-primary/60 hover:bg-muted"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                W{index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {page.sourceTitle}
                </span>
                <span className="block truncate text-muted-foreground">
                  {host}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Where a saved reply's facts came from. Returns null while a reply is still
 * streaming: citations are only known once it has been saved and reloaded.
 */
function groundingOf(
  message: ChatMessage,
): "sources" | "web" | "memory" | "none" | null {
  if (!message.metadata) return null;
  const citations = message.metadata.citations ?? [];
  const has = (test: (type: string) => boolean) =>
    citations.some((citation) => test(citation.sourceType));
  if (has((type) => type !== "WEB" && type !== "MEMORY")) return "sources";
  if (has((type) => type === "WEB")) return "web";
  if (has((type) => type === "MEMORY")) return "memory";
  return "none";
}

function GroundingNote({
  icon: Icon,
  children,
}: {
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-start gap-1.5 rounded-xl border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground">
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
