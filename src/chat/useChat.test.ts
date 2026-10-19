import { effectScope } from "vue";
import { describe, expect, it } from "vitest";
import { createFakeClient } from "./fakeClient";
import type { ChatClient, ChatMessage } from "./types";
import { useChat } from "./useChat";

describe("useChat", () => {
  it("streams an assistant reply after the user message", async () => {
    const chat = useChat(createFakeClient({ reply: "hello there friend", delayMs: 0 }));
    await chat.send("hi");

    expect(chat.messages.value).toHaveLength(2);
    expect(chat.messages.value[0]).toEqual({ role: "user", content: "hi" });
    expect(chat.messages.value[1]?.role).toBe("assistant");
    expect(chat.messages.value[1]?.content.trim()).toBe("hello there friend");
    expect(chat.isStreaming.value).toBe(false);
  });

  it("ignores empty or whitespace input", async () => {
    const chat = useChat(createFakeClient({ delayMs: 0 }));
    await chat.send("   ");
    expect(chat.messages.value).toHaveLength(0);
  });

  it("does not start a second stream while one is running", async () => {
    const chat = useChat(createFakeClient({ reply: "a b c d", delayMs: 5 }));
    const first = chat.send("one");
    await chat.send("two"); // ignored while the first is streaming
    await first;

    const users = chat.messages.value.filter((m) => m.role === "user");
    expect(users).toHaveLength(1);
  });

  it("surfaces an error and drops the empty assistant bubble", async () => {
    const chat = useChat(createFakeClient({ fail: true, delayMs: 0 }));
    await chat.send("hi");

    expect(chat.error.value).toBeTruthy();
    expect(chat.messages.value).toHaveLength(1); // only the user message remains
    expect(chat.isStreaming.value).toBe(false);
  });

  it("cancellation stops streaming without surfacing an error", async () => {
    const chat = useChat(createFakeClient({ reply: "one two three four five", delayMs: 5 }));
    const pending = chat.send("go");
    chat.cancel();
    await pending;

    expect(chat.isStreaming.value).toBe(false);
    expect(chat.status.value).toBe("idle");
    expect(chat.error.value).toBeNull();
  });

  it("keeps the partial reply on cancel and appends nothing after it", async () => {
    const chat = useChat(createFakeClient({ reply: "one two three four five", delayMs: 5 }));
    const pending = chat.send("go");
    await new Promise((resolve) => setTimeout(resolve, 12));
    chat.cancel();
    const atCancel = chat.messages.value[1]?.content;
    await pending;

    expect(atCancel).toBeTruthy();
    expect(chat.messages.value[1]?.content).toBe(atCancel);
  });

  it("drops the empty assistant bubble when cancelled before the first token", async () => {
    const chat = useChat(createFakeClient({ reply: "one two", delayMs: 5 }));
    const pending = chat.send("go");
    chat.cancel();
    await pending;

    expect(chat.messages.value).toEqual([{ role: "user", content: "go" }]);
  });

  it("sends the whole conversation, not just the latest prompt", async () => {
    const seen: ChatMessage[][] = [];
    const client: ChatClient = {
      async *stream(messages) {
        seen.push([...messages]);
        yield "ok";
      },
    };
    const chat = useChat(client);
    await chat.send("first");
    await chat.send("second");

    expect(seen[1]).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "second" },
    ]);
  });

  it("reports a thrown non-Error value instead of crashing", async () => {
    const client: ChatClient = {
      async *stream() {
        throw "backend said no";
      },
    };
    const chat = useChat(client);
    await chat.send("hi");

    expect(chat.status.value).toBe("error");
    expect(chat.error.value).toBe("backend said no");
  });

  it("aborts the stream when its scope is disposed", async () => {
    const scope = effectScope();
    const chat = scope.run(() => useChat(createFakeClient({ reply: "a b c d e f", delayMs: 5 })))!;
    const pending = chat.send("go");
    scope.stop();
    await pending;

    expect(chat.isStreaming.value).toBe(false);
  });
});
