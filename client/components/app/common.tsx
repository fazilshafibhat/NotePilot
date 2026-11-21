"use client";

import Link from "next/link";
import {
  FileText,
  FileCode2,
  Globe,
  SquarePlay,
  NotebookPen,
  Brain,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import type { ProcessingStatus, SourceType } from "@/lib/types";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn("flex items-center gap-2 font-heading", className)}
    >
      <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
        <NotebookPen className="size-4" />
      </span>
      <span className="text-lg font-semibold tracking-tight">NotePilot</span>
    </Link>
  );
}

const SOURCE_ICONS: Record<SourceType | "WEB" | "MEMORY", LucideIcon> = {
  PDF: FileText,
  WEBSITE: Globe,
  YOUTUBE: SquarePlay,
  TEXT: FileText,
  MARKDOWN: FileCode2,
  WEB: Globe,
  MEMORY: Brain,
};

export function SourceIcon({
  type,
  className,
}: {
  type: SourceType | "WEB" | "MEMORY";
  className?: string;
}) {
  const Icon = SOURCE_ICONS[type] ?? FileText;
  return <Icon className={cn("size-4 shrink-0", className)} />;
}

const STATUS_STYLE: Record<ProcessingStatus, string> = {
  READY: "bg-primary text-primary-foreground",
  PENDING: "bg-muted text-muted-foreground",
  PROCESSING: "bg-amber-400/20 text-amber-500 dark:text-amber-300",
  FAILED: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: ProcessingStatus }) {
  return (
    <Badge className={cn("border-0 capitalize", STATUS_STYLE[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}

export function notifyError(error: unknown, title = "Something went wrong") {
  toast.add({ title, description: errorMessage(error), type: "error" });
}

export function notifySuccess(title: string, description?: string) {
  toast.add({ title, description, type: "success" });
}

export function PageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
