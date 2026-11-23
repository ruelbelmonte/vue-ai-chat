import type Anthropic from "@anthropic-ai/sdk";
import { CutShortError, type ReplyStream } from "./chat.ts";

const SYSTEM_PROMPT =
  "You are the support assistant for a small online shop. Answer the customer's question plainly in under 150 words.";

export function claudeReply(client: Anthropic, model: string, maxTokens: number): ReplyStream {
  return async function* (messages, signal) {
    const stream = client.messages.stream(
      { model, max_tokens: maxTokens, system: SYSTEM_PROMPT, messages: [...messages] },
      { signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
    // A well-formed stream can still end mid-sentence; only stop_reason says so.
    const { stop_reason } = await stream.finalMessage();
    if (stop_reason === "max_tokens") throw new CutShortError(stop_reason);
  };
}
