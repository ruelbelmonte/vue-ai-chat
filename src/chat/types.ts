export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/**
 * The only thing the UI needs from a backend: stream a reply token by token,
 * cancellable via an AbortSignal. A real implementation would call an SSE
 * endpoint; the bundled fake lets the app and tests run with no backend.
 */
export interface ChatClient {
  stream(prompt: string, signal: AbortSignal): AsyncIterable<string>;
}
