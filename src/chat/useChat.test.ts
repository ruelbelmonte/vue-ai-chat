import { describe, expect, it } from "vitest";
import { createFakeClient } from "./fakeClient";
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
    expect(chat.error.value).toBeNull();
  });
});
