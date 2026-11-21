"use client";

import { createContext, useContext } from "react";
import type { ChatModel, Workspace } from "@/lib/types";

type WorkspaceContextValue = {
  workspace: Workspace;
  model: ChatModel;
  setModel: (model: ChatModel) => void;
  openAddSource: () => void;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);

export function useWorkspaceContext() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspaceContext must be used inside WorkspaceShell");
  }
  return value;
}
