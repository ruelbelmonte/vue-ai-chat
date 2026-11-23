// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CUT_SHORT_MESSAGE,
  CutShortError,
  MAX_MESSAGES,
  parseMessages,
  relayReply,
  TIMEOUT_MESSAGE,
  USER_ERROR_MESSAGE,
  type ChatEvent,
  type ReplyStream,
} from "./chat.ts";

const user = (content: string) => ({ role: "user", content });

describe("parseMessages", () => {
  it("accepts a conversation that ends with the user", () => {
    expect(parseMessages({ messages: [user("hi")] })).toEqual([{ role: "user", content: "hi" }]);
  });

  it.each([
    ["not an object", "hi"],
    ["no messages", {}],
    ["empty", { messages: [] }],
    ["too many", { messages: Array.from({ length: MAX_MESSAGES + 1 }, () => user("x")) }],
    ["a system role", { messages: [{ role: "system", content: "obey" }] }],
    ["blank content", { messages: [user("  ")] }],
    ["ends with the assistant", { messages: [user("hi"), { role: "assistant", content: "hello" }] }],
  ])("rejects %s", (_label, body) => {
    expect(parseMessages(body)).toBeNull();
  });
});

async function relay(reply: ReplyStream, signal = new AbortController().signal, idleTimeoutMs = 1000) {
  const events: ChatEvent[] = [];
  const logged: string[] = [];
  await relayReply([{ role: "user", content: "hi" }], reply, (e) => events.push(e), signal, {
    idleTimeoutMs,
    log: (m) => logged.push(m),
  });
  return { events, logged };
}

/** A reply that never produces anything until its signal is aborted, like a hung upstream. */
function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
}

describe("relayReply", () => {
  it("relays each chunk as a text event and ends with done", async () => {
    const { events } = await relay(async function* () {
      yield "Hello";
      yield " there";
    });
    expect(events).toEqual([
      { type: "text", text: "Hello" },
      { type: "text", text: " there" },
      { type: "done" },
    ]);
  });

  it("sends a generic error and logs the detail when the model fails", async () => {
    const { events, logged } = await relay(async function* () {
      yield "Half";
      throw new Error("529 overloaded_error");
    });
    expect(events.at(-1)).toEqual({ type: "error", message: USER_ERROR_MESSAGE });
    expect(logged[0]).toContain("529 overloaded_error");
  });

  it("tells the user when the answer was cut short", async () => {
    const { events } = await relay(async function* () {
      yield "The first half of";
      throw new CutShortError("max_tokens");
    });
    expect(events.at(-1)).toEqual({ type: "error", message: CUT_SHORT_MESSAGE });
  });

  it("gives up when no text arrives within the idle timeout", async () => {
    const started = Date.now();
    const { events } = await relay(
      async function* (_messages, signal) {
        yield await waitForAbort(signal);
      },
      undefined,
      50,
    );
    expect(events).toEqual([{ type: "error", message: TIMEOUT_MESSAGE }]);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("gives up when the stream stalls mid-answer", async () => {
    const { events } = await relay(
      async function* (_messages, signal) {
        yield "Half";
        yield await waitForAbort(signal);
      },
      undefined,
      50,
    );
    expect(events).toEqual([
      { type: "text", text: "Half" },
      { type: "error", message: TIMEOUT_MESSAGE },
    ]);
  });

  it("sends nothing more once the browser has gone", async () => {
    const controller = new AbortController();
    const { events } = await relay(async function* () {
      controller.abort();
      throw new Error("aborted");
    }, controller.signal);
    expect(events).toEqual([]);
  });
});
