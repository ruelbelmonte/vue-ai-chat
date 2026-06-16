import type { ChatClient } from "./types";

export interface FakeClientOptions {
  /** Throw partway through, to exercise the error path. */
  fail?: boolean;
  /** Override the canned reply. */
  reply?: string;
  /** Delay between tokens in ms (0 in tests, a little in the demo). */
  delayMs?: number;
}

/** Raised on cancellation; name matches the DOM convention so callers can detect it. */
function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

/**
 * A deterministic stand-in for a streaming backend. Yields the reply word by
 * word, checks the abort signal before every token, and can be told to fail.
 * The whole app runs on this, so there is nothing to configure to try it.
 */
export function createFakeClient(options: FakeClientOptions = {}): ChatClient {
  const { fail = false, delayMs = 18 } = options;
  return {
    async *stream(prompt: string, signal: AbortSignal): AsyncIterable<string> {
      const reply = options.reply ?? `You said: "${prompt}". This reply is streamed token by token.`;
      for (const word of reply.split(" ")) {
        if (signal.aborted) throw abortError();
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (fail) throw new Error("the model backend is unavailable");
        yield word + " ";
      }
    },
  };
}
