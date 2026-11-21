export type ChatModel = "gpt-4o-mini" | "gpt-4o";
export const CHAT_MODELS: ChatModel[] = ["gpt-4o-mini", "gpt-4o"];

export type Workspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultModel: ChatModel;
  createdAt: string;
  updatedAt: string;
};

export type SourceType = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";
export type ProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type SourceMetadata = {
  chunkCount?: number;
  indexedAt?: string;
  pageCount?: number;
  processingError?: string;
  fileUrl?: string;
  [key: string]: unknown;
};

export type Source = {
  id: string;
  workspaceId: string;
  type: SourceType;
  title: string;
  content: string | null;
  url: string | null;
  status: ProcessingStatus;
  metadata: SourceMetadata | null;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  workspaceId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourceCitation = {
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  chunkId?: string;
  chunkIndex?: number;
  page?: number | null;
  excerpt: string;
  score?: number;
};

export type WebCitation = {
  sourceType: "WEB";
  sourceTitle: string;
  url: string;
  excerpt: string;
};

export type MemoryCitation = {
  sourceType: "MEMORY";
  sourceTitle: string;
  excerpt: string;
};

export type Citation = SourceCitation | WebCitation | MemoryCitation;

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[] | null;
  createdAt: string;
};

export type ArtifactType =
  | "SUMMARY"
  | "TAKEAWAYS"
  | "FLASHCARDS"
  | "QUIZ"
  | "MINDMAP"
  | "REPORT";

export type FlashcardsContent = { cards: { front: string; back: string }[] };
export type QuizContent = {
  questions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
};
export type MindmapContent = {
  nodes: { id: string; label: string }[];
  edges: { id: string; source: string; target: string }[];
};
export type TakeawaysContent = { items: string[] };
export type SummaryContent = { markdown: string };
export type ReportContent = {
  markdown: string;
  sections: { title: string; content: string }[];
};

export type Artifact = {
  id: string;
  workspaceId: string;
  type: ArtifactType;
  title: string;
  content: unknown;
  sourceIds: string[];
  status: ProcessingStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type Memory = {
  id: string;
  memory: string;
  createdAt: string;
  updatedAt: string;
  source: "manual" | "learned";
};
