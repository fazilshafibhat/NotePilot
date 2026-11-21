import { formatDistanceToNow } from "date-fns";
import type { ArtifactType, SourceType } from "@/lib/types";

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export const SOURCE_TYPE_LABEL: Record<SourceType | "WEB" | "MEMORY", string> = {
  PDF: "PDF",
  WEBSITE: "Website",
  YOUTUBE: "YouTube",
  TEXT: "Text",
  MARKDOWN: "Markdown",
  WEB: "Web",
  MEMORY: "Saved memory",
};

export const ARTIFACT_TYPES: {
  type: ArtifactType;
  label: string;
  description: string;
}[] = [
  {
    type: "SUMMARY",
    label: "Summary",
    description: "A structured markdown summary of your sources",
  },
  {
    type: "TAKEAWAYS",
    label: "Key Takeaways",
    description: "Bullet-point insights you can copy and review",
  },
  {
    type: "FLASHCARDS",
    label: "Flashcards",
    description: "Flip cards for active recall study",
  },
  {
    type: "QUIZ",
    label: "Quiz",
    description: "Multiple-choice quiz with explanations",
  },
  {
    type: "MINDMAP",
    label: "Mind Map",
    description: "Visual concept map of the material",
  },
  {
    type: "REPORT",
    label: "AI Report",
    description: "Long-form report with sections",
  },
];

export function artifactLabel(type: ArtifactType) {
  return ARTIFACT_TYPES.find((item) => item.type === type)?.label ?? type;
}

/** Emoji icons offered when creating a notebook (server allows up to 8 chars). */
export const NOTEBOOK_ICONS = ["📚", "📖", "📝", "🎓", "💡", "🔬", "💬", "✨"];

/** Deterministic gradient per notebook so cards keep their color. */
const GRADIENTS = [
  "from-lime-400 via-emerald-500 to-teal-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-pink-400 via-rose-500 to-fuchsia-600",
  "from-amber-300 via-orange-500 to-rose-500",
  "from-sky-400 via-indigo-500 to-violet-600",
  "from-violet-400 via-purple-500 to-fuchsia-600",
];

export function notebookGradient(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
