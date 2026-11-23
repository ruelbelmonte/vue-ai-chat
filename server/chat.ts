export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/**
 * What the server sends the browser, one JSON object per SSE `data:` line.
 * Every reply ends with `done` or `error`; a stream that just stops is a lost connection.
 */
export type ChatEvent = { type: "text"; text: string } | { type: "done" } | { type: "error"; message: string };

/** Streams the assistant's reply to a conversation as text chunks. */
export type ReplyStream = (messages: readonly ChatMessage[], signal: AbortSignal) => AsyncIterable<string>;

/** The model stopped before finishing its answer (for example at the token limit). */
export class CutShortError extends Error {
  readonly stopReason: string;
  constructor(stopReason: string) {
    super(`answer cut short: ${stopReason}`);
    this.stopReason = stopReason;
  }
}

export const MAX_MESSAGES = 40;
export const MAX_CONTENT_CHARS = 8000;
export const USER_ERROR_MESSAGE = "The assistant couldn't answer just now. Please try again.";
export const CUT_SHORT_MESSAGE = "This answer was cut short. Please ask again.";
export const TIMEOUT_MESSAGE = "The assistant is taking too long to answer. Please try again.";

export interface RelayOptions {
  /** Give up when no text arrives for this long, before the first chunk or between chunks. */
  idleTimeoutMs: number;
  log?: (message: string) => void;
}

/** Validates an untrusted request body. Returns null if it isn't a usable conversation. */
export function parseMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== "object" || body === null) return null;
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;

  const parsed: ChatMessage[] = [];
  for (const item of messages) {
    if (typeof item !== "object" || item === null) return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim() === "" || content.length > MAX_CONTENT_CHARS) return null;
    parsed.push({ role, content });
  }
  if (parsed.at(-1)?.role !== "user") return null;
  return parsed;
}

/** Relays the reply as events. Failures reach the user as a generic message; details stay in the server log. */
export async function relayReply(
  messages: readonly ChatMessage[],
  reply: ReplyStream,
  send: (event: ChatEvent) => void,
  signal: AbortSignal,
  { idleTimeoutMs, log = console.error }: RelayOptions,
): Promise<void> {
  const upstream = new AbortController();
  const stopUpstream = () => upstream.abort();
  signal.addEventListener("abort", stopUpstream, { once: true });
  let timedOut = false;
  let idle: ReturnType<typeof setTimeout> | undefined;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      timedOut = true;
      upstream.abort();
    }, idleTimeoutMs);
  };

  try {
    resetIdle();
    for await (const text of reply(messages, upstream.signal)) {
      resetIdle();
      send({ type: "text", text });
    }
    send({ type: "done" });
  } catch (err) {
    if (signal.aborted) return;
    log(`reply failed: ${timedOut ? `no text for ${idleTimeoutMs} ms` : describe(err)}`);
    const message = timedOut ? TIMEOUT_MESSAGE : err instanceof CutShortError ? CUT_SHORT_MESSAGE : USER_ERROR_MESSAGE;
    send({ type: "error", message });
  } finally {
    clearTimeout(idle);
    signal.removeEventListener("abort", stopUpstream);
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? `${err.constructor.name}: ${err.message}` : String(err);
}
