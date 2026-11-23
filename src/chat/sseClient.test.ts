import { describe, expect, it } from "vitest";
import { createSseClient } from "./sseClient";
import type { ChatMessage } from "./types";

function streamOf(chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      controller.close();
    },
  });
}

function fetchReturning(body: ReadableStream<Uint8Array>, status = 200): typeof fetch {
  return async () => new Response(body, { status });
}

const history: ChatMessage[] = [{ role: "user", content: "hi" }];

async function collect(fetchImpl: typeof fetch): Promise<string[]> {
  const out: string[] = [];
  for await (const token of createSseClient("/api/chat", fetchImpl).stream(history, new AbortController().signal)) {
    out.push(token);
  }
  return out;
}

const text = (t: string) => `data: ${JSON.stringify({ type: "text", text: t })}\n\n`;
const done = `data: ${JSON.stringify({ type: "done" })}\n\n`;

describe("createSseClient", () => {
  it("yields the text of each event", async () => {
    expect(await collect(fetchReturning(streamOf([text("Hello"), text(" there"), done])))).toEqual(["Hello", " there"]);
  });

  it("reassembles an event split across network chunks", async () => {
    const whole = text("split");
    expect(await collect(fetchReturning(streamOf([whole.slice(0, 9), whole.slice(9), done])))).toEqual(["split"]);
  });

  it("keeps a multi-byte character that spans two chunks", async () => {
    const bytes = new TextEncoder().encode(text("café"));
    const cut = bytes.indexOf(0xc3) + 1; // inside the two-byte é
    expect(await collect(fetchReturning(streamOf([bytes.slice(0, cut), bytes.slice(cut), done])))).toEqual(["café"]);
  });

  it("throws when the stream ends before the server says the answer is done", async () => {
    await expect(collect(fetchReturning(streamOf([text("The first half")])))).rejects.toThrow(/lost/);
  });

  it("throws the server's message on an error event", async () => {
    const body = streamOf([text("Half"), `data: ${JSON.stringify({ type: "error", message: "try again" })}\n\n`]);
    await expect(collect(fetchReturning(body))).rejects.toThrow("try again");
  });

  it("throws when the server refuses the request", async () => {
    await expect(collect(fetchReturning(streamOf([]), 400))).rejects.toThrow("400");
  });
});
