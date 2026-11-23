// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { CutShortError } from "./chat.ts";
import { claudeReply } from "./claude.ts";

function fakeClient(texts: string[], stopReason: string): Anthropic {
  const stream = {
    async *[Symbol.asyncIterator]() {
      for (const text of texts) yield { type: "content_block_delta", delta: { type: "text_delta", text } };
    },
    finalMessage: async () => ({ stop_reason: stopReason }),
  };
  return { messages: { stream: () => stream } } as unknown as Anthropic;
}

async function collect(client: Anthropic): Promise<string[]> {
  const out: string[] = [];
  for await (const text of claudeReply(client, "model", 100)([{ role: "user", content: "hi" }], new AbortController().signal)) {
    out.push(text);
  }
  return out;
}

describe("claudeReply", () => {
  it("yields the text of a finished answer", async () => {
    expect(await collect(fakeClient(["Hello", " there"], "end_turn"))).toEqual(["Hello", " there"]);
  });

  it("throws CutShortError when the answer hit the token limit", async () => {
    await expect(collect(fakeClient(["The first half"], "max_tokens"))).rejects.toBeInstanceOf(CutShortError);
  });
});
