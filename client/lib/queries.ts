"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Artifact,
  ArtifactType,
  ChatModel,
  Conversation,
  Memory,
  Source,
  StoredMessage,
  Workspace,
} from "@/lib/types";

export const keys = {
  workspaces: ["workspaces"] as const,
  workspace: (id: string) => ["workspaces", id] as const,
  sources: (id: string) => ["workspaces", id, "sources"] as const,
  source: (id: string, sourceId: string) =>
    ["workspaces", id, "sources", sourceId] as const,
  conversations: (id: string) => ["workspaces", id, "conversations"] as const,
  messages: (id: string, conversationId: string) =>
    ["workspaces", id, "conversations", conversationId, "messages"] as const,
  artifacts: (id: string) => ["workspaces", id, "artifacts"] as const,
  artifact: (id: string, artifactId: string) =>
    ["workspaces", id, "artifacts", artifactId] as const,
  memories: ["memories"] as const,
};

const inProgress = (status: string) =>
  status === "PENDING" || status === "PROCESSING";

/* ---------------------------------- Workspaces ---------------------------------- */

export function useWorkspaces() {
  return useQuery({
    queryKey: keys.workspaces,
    queryFn: () => api.get<Workspace[]>("/workspaces"),
  });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: keys.workspace(workspaceId),
    queryFn: () => api.get<Workspace>(`/workspaces/${workspaceId}`),
  });
}

export type WorkspaceInput = {
  title: string;
  description?: string;
  icon?: string;
  defaultModel?: ChatModel;
};

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkspaceInput) =>
      api.post<Workspace>("/workspaces", input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.workspaces }),
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WorkspaceInput>) =>
      api.patch<Workspace>(`/workspaces/${workspaceId}`, input),
    onSuccess: (workspace) => {
      queryClient.setQueryData(keys.workspace(workspaceId), workspace);
      queryClient.invalidateQueries({ queryKey: keys.workspaces, exact: true });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) =>
      api.delete(`/workspaces/${workspaceId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.workspaces }),
  });
}

/* ----------------------------------- Sources ------------------------------------ */

export function useSources(workspaceId: string) {
  return useQuery({
    queryKey: keys.sources(workspaceId),
    queryFn: () => api.get<Source[]>(`/workspaces/${workspaceId}/sources`),
    // Keep polling while any source is still being processed in the background
    refetchInterval: (query) =>
      query.state.data?.some((source) => inProgress(source.status))
        ? 3000
        : false,
  });
}

export function useSource(workspaceId: string, sourceId: string) {
  return useQuery({
    queryKey: keys.source(workspaceId, sourceId),
    queryFn: () =>
      api.get<Source>(`/workspaces/${workspaceId}/sources/${sourceId}`),
    refetchInterval: (query) =>
      query.state.data && inProgress(query.state.data.status) ? 3000 : false,
  });
}

export type AddSourceInput =
  | { kind: "TEXT" | "MARKDOWN"; title: string; content: string }
  | { kind: "PDF"; file: File }
  | { kind: "WEBSITE" | "YOUTUBE"; url: string; title?: string };

export function useAddSource(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSourceInput) => {
      const base = `/workspaces/${workspaceId}/sources`;
      switch (input.kind) {
        case "TEXT":
        case "MARKDOWN":
          return api.post<Source>(base, {
            type: input.kind,
            title: input.title,
            content: input.content,
          });
        case "PDF": {
          const form = new FormData();
          form.append("file", input.file);
          return api.post<Source>(`${base}/upload`, form);
        }
        case "WEBSITE":
          return api.post<Source>(`${base}/import/website`, {
            url: input.url,
            title: input.title || undefined,
          });
        case "YOUTUBE":
          return api.post<Source>(`${base}/import/youtube`, {
            url: input.url,
            title: input.title || undefined,
          });
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.sources(workspaceId) }),
  });
}

export function useDeleteSources(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceIds: string[]) =>
      sourceIds.length === 1
        ? api.delete(`/workspaces/${workspaceId}/sources/${sourceIds[0]}`)
        : api.post<void>(`/workspaces/${workspaceId}/sources/bulk-delete`, {
            sourceIds,
          }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.sources(workspaceId) }),
  });
}

/** Re-queues processing. With no ids, retries every failed or stuck source. */
export function useReprocessSources(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceIds?: string[]) =>
      api.post<Source[]>(`/workspaces/${workspaceId}/sources/reprocess`, {
        sourceIds,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.sources(workspaceId) }),
  });
}

/** Matches the server: PENDING/PROCESSING for over 5 minutes means the job was lost. */
const STUCK_AFTER_MS = 5 * 60 * 1000;

export function needsRetry(source: Source) {
  if (source.status === "FAILED") return true;
  if (source.status === "READY") return false;
  return Date.now() - new Date(source.updatedAt).getTime() > STUCK_AFTER_MS;
}

/* --------------------------------- Conversations --------------------------------- */

export function useConversations(workspaceId: string) {
  return useQuery({
    queryKey: keys.conversations(workspaceId),
    queryFn: () =>
      api.get<Conversation[]>(`/workspaces/${workspaceId}/conversations`),
  });
}

export function fetchMessages(workspaceId: string, conversationId: string) {
  return api.get<StoredMessage[]>(
    `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
  );
}

export function useDeleteConversation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.delete(`/workspaces/${workspaceId}/conversations/${conversationId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: keys.conversations(workspaceId),
      }),
  });
}

/* ----------------------------------- Artifacts ----------------------------------- */

export function useArtifacts(workspaceId: string) {
  return useQuery({
    queryKey: keys.artifacts(workspaceId),
    queryFn: () => api.get<Artifact[]>(`/workspaces/${workspaceId}/artifacts`),
    refetchInterval: (query) =>
      query.state.data?.some((artifact) => inProgress(artifact.status))
        ? 3000
        : false,
  });
}

export function useArtifact(workspaceId: string, artifactId: string) {
  return useQuery({
    queryKey: keys.artifact(workspaceId, artifactId),
    queryFn: () =>
      api.get<Artifact>(`/workspaces/${workspaceId}/artifacts/${artifactId}`),
    refetchInterval: (query) =>
      query.state.data && inProgress(query.state.data.status) ? 3000 : false,
  });
}

export function useCreateArtifact(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: ArtifactType; title?: string }) =>
      api.post<Artifact>(`/workspaces/${workspaceId}/artifacts`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.artifacts(workspaceId) }),
  });
}

export function useDeleteArtifact(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artifactId: string) =>
      api.delete(`/workspaces/${workspaceId}/artifacts/${artifactId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.artifacts(workspaceId) }),
  });
}

/* ------------------------------------ Memory ------------------------------------ */

export function useMemories() {
  return useQuery({
    queryKey: keys.memories,
    queryFn: () => api.get<Memory[]>("/memory"),
  });
}

export function useMemoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: keys.memories });

  return {
    create: useMutation({
      mutationFn: (memory: string) => api.post<Memory>("/memory", { memory }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (input: { id: string; memory: string }) =>
        api.patch<Memory>(`/memory/${input.id}`, { memory: input.memory }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`/memory/${id}`),
      onSuccess: invalidate,
    }),
  };
}
