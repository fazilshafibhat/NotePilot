"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SourceIcon } from "@/components/app/common";
import { SOURCE_TYPE_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Citation,
  MemoryCitation,
  SourceCitation,
  WebCitation,
} from "@/lib/types";

const CITE_PREFIX = "#cite-";

/**
 * Turns inline markers like [1], [W2] or [M1] into links the renderer can pick up,
 * skipping fenced code blocks and markers that are already real links.
 */
function linkCitationMarkers(text: string) {
  return text
    .split(/(```[\s\S]*?```)/g)
    .map((part) =>
      part.startsWith("```")
        ? part
        : part.replace(/\[([WM]?\d+)\](?!\()/g, `[$1](${CITE_PREFIX}$1)`),
    )
    .join("");
}

const baseComponents: Components = {
  h1: (props) => (
    <h1 className="mt-6 mb-3 font-heading text-2xl font-semibold" {...props} />
  ),
  h2: (props) => (
    <h2 className="mt-6 mb-2 font-heading text-xl font-semibold" {...props} />
  ),
  h3: (props) => <h3 className="mt-5 mb-2 font-semibold" {...props} />,
  p: (props) => <p className="my-3 leading-7" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1.5 pl-6" {...props} />,
  ol: (props) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-6" {...props} />
  ),
  li: (props) => <li className="leading-7" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-3 border-l-2 border-primary/60 pl-4 text-muted-foreground"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-border" />,
  pre: (props) => (
    <pre
      className="my-3 overflow-x-auto rounded-xl border bg-muted/50 p-4 text-sm"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "rounded-md bg-muted px-1.5 py-0.5 text-[0.9em] [pre_&]:bg-transparent [pre_&]:p-0",
        className,
      )}
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border px-3 py-1.5 text-left font-semibold" {...props} />
  ),
  td: (props) => <td className="border px-3 py-1.5" {...props} />,
};

export function Markdown({
  children,
  citations,
  workspaceId,
  className,
}: {
  children: string;
  citations?: Citation[] | null;
  workspaceId?: string;
  className?: string;
}) {
  const sourceCitations = (citations ?? []).filter(
    (citation): citation is SourceCitation =>
      citation.sourceType !== "WEB" && citation.sourceType !== "MEMORY",
  );
  const webCitations = (citations ?? []).filter(
    (citation): citation is WebCitation => citation.sourceType === "WEB",
  );
  const memoryCitations = (citations ?? []).filter(
    (citation): citation is MemoryCitation => citation.sourceType === "MEMORY",
  );

  const components: Components = {
    ...baseComponents,
    a: ({ href, children: linkChildren, ...props }) => {
      if (href?.startsWith(CITE_PREFIX)) {
        const marker = href.slice(CITE_PREFIX.length);
        const kind = marker[0] === "W" || marker[0] === "M" ? marker[0] : "";
        const index = Number(kind ? marker.slice(1) : marker) - 1;
        const citation =
          kind === "W"
            ? webCitations[index]
            : kind === "M"
              ? memoryCitations[index]
              : sourceCitations[index];
        return (
          <CitationBadge
            label={marker}
            citation={citation}
            workspaceId={workspaceId}
          />
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
          {...props}
        >
          {linkChildren}
        </a>
      );
    },
  };

  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linkCitationMarkers(children)}
      </ReactMarkdown>
    </div>
  );
}

function CitationBadge({
  label,
  citation,
  workspaceId,
}: {
  label: string;
  citation?: Citation;
  workspaceId?: string;
}) {
  const badge = (
    <span className="mx-0.5 inline-grid h-5 min-w-5 cursor-default place-items-center rounded-full bg-primary px-1 align-text-top text-[10px] font-semibold text-primary-foreground">
      {label}
    </span>
  );

  if (!citation) return badge;

  const isWeb = citation.sourceType === "WEB";
  const isMemory = citation.sourceType === "MEMORY";

  return (
    <HoverCard>
      <HoverCardTrigger render={<span />}>{badge}</HoverCardTrigger>
      <HoverCardContent className="w-80 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <SourceIcon type={citation.sourceType} className="mt-0.5" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {citation.sourceTitle}
            </div>
            <div className="text-muted-foreground">
              {SOURCE_TYPE_LABEL[citation.sourceType]}
              {citation.sourceType !== "WEB" &&
              citation.sourceType !== "MEMORY" &&
              citation.page
                ? ` · page ${citation.page}`
                : ""}
            </div>
          </div>
        </div>
        <p className="line-clamp-5 text-muted-foreground">{citation.excerpt}</p>
        {isMemory ? (
          <Link
            href="/memory"
            className="inline-flex items-center gap-1 text-primary"
          >
            <ExternalLink className="size-3" />
            Manage memories
          </Link>
        ) : isWeb ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary"
          >
            <ExternalLink className="size-3" />
            Open page
          </a>
        ) : (
          workspaceId && (
            <Link
              href={`/workspace/${workspaceId}/sources/${citation.sourceId}`}
              className="inline-flex items-center gap-1 text-primary"
            >
              <ExternalLink className="size-3" />
              Open source
            </Link>
          )
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
