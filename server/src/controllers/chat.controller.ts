import type { Request, Response } from "express";
import type { UIMessage } from "ai";
import type { z } from "zod";
import { ValidationError } from "../types/app-error.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
    chatBodySchema,
    conversationIdParamSchema,
    createConversationSchema,
} from "../validators/chat.validator.js";
import { workspaceIdParamSchema } from "../validators/workspace.validator.js";
import {
    createConversationForWorkspace,
    deleteConversationForWorkspace,
    getConversationMessagesForWorkspace,
    listConversationsForWorkspace,
    streamWorkspaceChat,
} from "../services/chat.services.js";

function parse<T extends z.ZodType>(
    schema: T,
    input: unknown,
    message: string,
): z.infer<T> {
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
        throw new ValidationError(message, getZodFieldErrors(parsed.error));
    }

    return parsed.data;
}

export async function listConversations(req: Request, res: Response) {
    const { workspaceId } = parse(
        workspaceIdParamSchema,
        req.params,
        "Invalid workspace id",
    );
    const conversations = await listConversationsForWorkspace(
        workspaceId,
        req.session.user.id,
    );
    res.json(conversations);
}

export async function createConversation(req: Request, res: Response) {
    const { workspaceId } = parse(
        workspaceIdParamSchema,
        req.params,
        "Invalid workspace id",
    );
    const { title } = parse(
        createConversationSchema,
        req.body ?? {},
        "Invalid conversation",
    );
    const conversation = await createConversationForWorkspace(
        workspaceId,
        req.session.user.id,
        title,
    );
    res.status(201).json(conversation);
}

export async function getConversationMessages(req: Request, res: Response) {
    const { workspaceId, conversationId } = parse(
        conversationIdParamSchema,
        req.params,
        "Invalid conversation id",
    );
    const messages = await getConversationMessagesForWorkspace(
        workspaceId,
        conversationId,
        req.session.user.id,
    );
    res.json(messages);
}

export async function deleteConversation(req: Request, res: Response) {
    const { workspaceId, conversationId } = parse(
        conversationIdParamSchema,
        req.params,
        "Invalid conversation id",
    );
    await deleteConversationForWorkspace(
        workspaceId,
        conversationId,
        req.session.user.id,
    );
    res.status(204).send();
}

/** Streams an assistant reply; the conversation id is returned in `X-Conversation-Id`. */
export async function chat(req: Request, res: Response) {
    const { workspaceId } = parse(
        workspaceIdParamSchema,
        req.params,
        "Invalid workspace id",
    );
    const body = parse(chatBodySchema, req.body, "Invalid chat request");

    await streamWorkspaceChat(res, workspaceId, req.session.user.id, {
        conversationId: body.conversationId,
        messages: body.messages as unknown as UIMessage[],
        model: body.model,
        webSearch: body.webSearch,
        sourceIds: body.sourceIds,
    });
}
