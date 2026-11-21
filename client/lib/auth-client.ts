import { createAuthClient } from "better-auth/react";

/**
 * No baseURL: better-auth uses the current origin + /api/auth, which
 * next.config.ts forwards to the Express server.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;
