import {
    addUserMemory,
    deleteUserMemory,
    getMem0Client,
    updateUserMemory,
} from "../lib/mem0.js";
import { NotFoundError } from "../types/app-error.js";

export function createMemoryForUser(
    userId: string,
    input: { memory: string },
) {
    return addUserMemory(userId, {
        memory: input.memory,
        infer: false,
        metadata: { source: "manual" },
    });
}

/**
 * Throws unless the memory exists and belongs to `userId`. Mem0 updates and
 * deletes by id alone, so without this check any signed-in user could change
 * or delete another user's memory. "Not found" is returned either way so
 * other users' memory ids aren't revealed.
 *
 * @throws {NotFoundError} When the memory is missing or owned by someone else
 */
async function assertMemoryOwner(userId: string, memoryId: string) {
    let owner: string | undefined;
    try {
        const memory = await getMem0Client().get(memoryId);
        owner = memory.userId;
    } catch {
        owner = undefined;
    }

    if (owner !== userId) {
        throw new NotFoundError("Memory not found");
    }
}

export async function updateMemoryForUser(
    userId: string,
    memoryId: string,
    input: { memory: string },
) {
    await assertMemoryOwner(userId, memoryId);
    return updateUserMemory(memoryId, input);
}

export async function deleteMemoryForUser(userId: string, memoryId: string) {
    await assertMemoryOwner(userId, memoryId);
    await deleteUserMemory(memoryId);
}
