import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
    chat,
    createConversation,
    deleteConversation,
    getConversationMessages,
    listConversations,
} from "../controllers/chat.controller.js";

/** Mounted at /api/workspaces/:workspaceId/chat (auth applied by workspaceRoutes). */
export const chatRoutes = Router({ mergeParams: true });

chatRoutes.post("/", asyncHandler(chat));

/** Mounted at /api/workspaces/:workspaceId/conversations. */
export const conversationRoutes = Router({ mergeParams: true });

conversationRoutes.get("/", asyncHandler(listConversations));
conversationRoutes.post("/", asyncHandler(createConversation));
conversationRoutes.get(
    "/:conversationId/messages",
    asyncHandler(getConversationMessages),
);
conversationRoutes.delete("/:conversationId", asyncHandler(deleteConversation));
