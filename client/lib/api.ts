/**
 * Minimal API client. Requests go to `/api/*` on the Next.js origin, which
 * next.config.ts rewrites to the Express server, so the auth cookie is sent
 * automatically.
 */

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Direct server URL, used only for the streaming chat endpoint so the stream
 * is never buffered by the Next.js dev proxy.
 */
export const DIRECT_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers:
      body !== undefined && !isForm
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      body === undefined
        ? undefined
        : isForm
          ? (body as FormData)
          : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data?.details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
