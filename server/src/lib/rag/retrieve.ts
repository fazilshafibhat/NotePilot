import { RAG_MIN_SCORE, RAG_TOP_K } from "../ai-config.js";
import { embedTexts } from "../openai.js";
import { queryWorkspaceVectors } from "../pinecone.js";

export type RetrievedChunk = {
    sourceId: string;
    sourceTitle: string;
    sourceType: string;
    chunkId: string;
    chunkIndex: number;
    page?: number;
    text: string;
    score: number;
};

/**
 * Finds the chunks most relevant to `query` in a workspace.
 *
 * When `sourceIds` is given, only those sources are searched and the minimum
 * score is skipped: the user explicitly chose them, so a vague question
 * ("tell me about this video") should still get their best passages.
 */
export async function retrieveWorkspaceContext(
    workspaceId: string,
    query: string,
    options: { sourceIds?: string[] } = {},
): Promise<RetrievedChunk[]> {
    const focused = !!options.sourceIds?.length;
    const [embedding] = await embedTexts([query]);
    const matches = await queryWorkspaceVectors(
        workspaceId,
        embedding,
        RAG_TOP_K,
        focused ? { sourceId: { $in: options.sourceIds! } } : undefined,
    );

    const chunks: RetrievedChunk[] = [];

    for (const match of matches) {
        const score = match.score ?? 0;
        if (!focused && score < RAG_MIN_SCORE) {
            continue;
        }

        const metadata = match.metadata as
            | Record<string, unknown>
            | undefined;
        if (
            !metadata ||
            typeof metadata.sourceId !== "string" ||
            typeof metadata.sourceTitle !== "string" ||
            typeof metadata.sourceType !== "string" ||
            typeof metadata.chunkId !== "string" ||
            typeof metadata.text !== "string"
        ) {
            continue;
        }

        chunks.push({
            sourceId: metadata.sourceId,
            sourceTitle: metadata.sourceTitle,
            sourceType: metadata.sourceType,
            chunkId: metadata.chunkId,
            chunkIndex: Number(metadata.chunkIndex ?? 0),
            ...(typeof metadata.page === "number"
                ? { page: metadata.page }
                : {}),
            text: metadata.text,
            score,
        });
    }

    return chunks;
}

export type UserMemoryContext = string;

export function buildChatSystemPrompt(input: {
    chunks: RetrievedChunk[];
    conversationSummary?: string | null;
    userMemories?: UserMemoryContext[];
    webSearchEnabled?: boolean;
}) {
    const sections: string[] = [
        "You are Notepilot, an assistant that helps users learn from their workspace sources.",
    ];

    if (input.webSearchEnabled) {
        sections.push(
            "You have access to a web_search tool for up-to-date information outside the workspace.",
            "Use it when the user asks about recent events or topics not covered by their sources.",
            "Cite web results inline using [W1], [W2], etc. matching the web result blocks.",
        );
    }

    if (input.userMemories?.length) {
        const memoryBlock = input.userMemories
            .map((memory, index) => `[M${index + 1}] ${memory}`)
            .join("\n");

        sections.push(
            "Saved memories about this user. Use them when relevant. Questions about the user themselves (who they are, their name, job, skills, preferences) should be answered directly from these memories; if a memory answers the question, never say you could not find it. Every sentence that relies on a memory MUST end with its marker, e.g. \"Your name is Alex [M1].\"",
            memoryBlock,
        );
    }

    // Answers must come from the user's sources, their saved memories, or
    // (only when they turned it on) web search. No general-knowledge answers:
    // they can be wrong and they spend tokens on things outside the notebook.
    const notFound = input.webSearchEnabled
        ? "If the sources, saved memories, and web search don't answer the question, say so briefly."
        : "If neither the sources nor the saved memories answer the question, reply in one or two short sentences that you couldn't find it in their sources, and suggest adding a source or turning on web search. Do not answer from general knowledge.";

    const summary = input.conversationSummary?.trim();
    if (summary) {
        sections.push("Earlier conversation summary:", summary);
    }

    if (input.chunks.length === 0) {
        sections.push(
            "Nothing relevant was retrieved from this workspace's sources for this question.",
            input.webSearchEnabled
                ? "Use web search when needed."
                : "Answer only from the saved memories above, if they are relevant.",
            notFound,
            "Do not invent citations.",
            "Never say or imply that this answer comes from the user's sources or materials, even if earlier messages in this conversation did.",
        );
        return sections.join("\n");
    }

    const context = input.chunks
        .map((chunk, index) => {
            const label = `[${index + 1}] ${chunk.sourceTitle} (${chunk.sourceType})${
                chunk.page ? `, page ${chunk.page}` : ""
            }`;
            return `${label}\n${chunk.text}`;
        })
        .join("\n\n");

    sections.push(
        "Use ONLY the retrieved context below and the saved memories above when making factual claims.",
        notFound,
        "Cite sources inline using [1], [2], etc. matching the numbered context blocks.",
        "Keep answers concise, accurate, and educational.",
        "",
        "Retrieved context:",
        context,
    );

    return sections.join("\n");
}