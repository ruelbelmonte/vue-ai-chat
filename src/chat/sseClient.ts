import type { ChatClient, ChatMessage } from "./types";

type ServerEvent = { type: "text"; text: string } | { type: "done" } | { type: "error"; message: string };

export const CONNECTION_LOST_MESSAGE = "The connection was lost before the answer finished. Please try again.";

/** Splits a server-sent event stream into the JSON payloads of its `data:` lines. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncIterable<ServerEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      // stream: true keeps a multi-byte character that spans two chunks intact.
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let end;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) yield JSON.parse(data) as ServerEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** A ChatClient for the bundled server's `/api/chat` SSE endpoint. */
export function createSseClient(url = "/api/chat", fetchImpl: typeof fetch = fetch): ChatClient {
  return {
    async *stream(messages: readonly ChatMessage[], signal: AbortSignal): AsyncIterable<string> {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`the chat server answered ${response.status}`);
      for await (const event of readEvents(response.body)) {
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "done") return;
        yield event.text;
      }
      // Without `done`, the reply may be half an answer that looks complete.
      throw new Error(CONNECTION_LOST_MESSAGE);
    },
  };
}
