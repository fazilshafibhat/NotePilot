import type { Request, Response } from "express";
import type { z } from "zod";
import { ValidationError } from "../types/app-error.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
    artifactIdParamSchema,
    createArtifactSchema,
} from "../validators/artifact.validator.js";
import { workspaceIdParamSchema } from "../validators/workspace.validator.js";
import {
    createArtifactForWorkspace,
    deleteArtifactForWorkspace,
    getArtifactForWorkspace,
    listArtifactsForWorkspace,
} from "../services/artifact.services.js";

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

export async function listArtifacts(req: Request, res: Response) {
    const { workspaceId } = parse(
        workspaceIdParamSchema,
        req.params,
        "Invalid workspace id",
    );
    const artifacts = await listArtifactsForWorkspace(
        workspaceId,
        req.session.user.id,
    );
    res.json(artifacts);
}

/** Creates a PENDING artifact; generation runs in the background via Inngest. */
export async function createArtifact(req: Request, res: Response) {
    const { workspaceId } = parse(
        workspaceIdParamSchema,
        req.params,
        "Invalid workspace id",
    );
    const input = parse(createArtifactSchema, req.body, "Invalid artifact");
    const artifact = await createArtifactForWorkspace(
        workspaceId,
        req.session.user.id,
        input,
    );
    res.status(201).json(artifact);
}

export async function getArtifact(req: Request, res: Response) {
    const { workspaceId, artifactId } = parse(
        artifactIdParamSchema,
        req.params,
        "Invalid artifact id",
    );
    const artifact = await getArtifactForWorkspace(
        workspaceId,
        artifactId,
        req.session.user.id,
    );
    res.json(artifact);
}

export async function deleteArtifact(req: Request, res: Response) {
    const { workspaceId, artifactId } = parse(
        artifactIdParamSchema,
        req.params,
        "Invalid artifact id",
    );
    await deleteArtifactForWorkspace(
        workspaceId,
        artifactId,
        req.session.user.id,
    );
    res.status(204).send();
}
