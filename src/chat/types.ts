export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export type ChatStatus = "idle" | "streaming" | "error";

/**
 * The only thing the UI needs from a backend: given the conversation so far,
 * stream the next assistant reply token by token, cancellable via an AbortSignal.
 * The bundled fake lets the app and tests run with no backend.
 */
export interface ChatClient {
  stream(messages: readonly ChatMessage[], signal: AbortSignal): AsyncIterable<string>;
}
