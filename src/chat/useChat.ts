import { computed, getCurrentScope, onScopeDispose, readonly, ref } from "vue";
import type { ChatClient, ChatMessage, ChatStatus } from "./types";

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/**
 * The chat state machine, independent of any component. Owns the message list,
 * the status (idle, streaming, error), and cancellation. Kept as a composable so
 * it is unit-tested with a fake client and no DOM. The component is just a view
 * over this.
 */
export function useChat(client: ChatClient) {
  const messages = ref<ChatMessage[]>([]);
  const status = ref<ChatStatus>("idle");
  const error = ref<string | null>(null);
  const isStreaming = computed(() => status.value === "streaming");
  let controller: AbortController | null = null;

  function dropEmptyReply(index: number): void {
    if (messages.value[index]?.content === "") messages.value.splice(index, 1);
  }

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (trimmed === "" || isStreaming.value) return;

    error.value = null;
    messages.value.push({ role: "user", content: trimmed });
    const history = messages.value.map((message) => ({ ...message }));
    messages.value.push({ role: "assistant", content: "" });
    const assistantIndex = messages.value.length - 1;

    status.value = "streaming";
    controller = new AbortController();
    const { signal } = controller;
    try {
      for await (const chunk of client.stream(history, signal)) {
        // A client may yield one more token after abort; it must not land.
        if (signal.aborted) break;
        const assistant = messages.value[assistantIndex];
        if (assistant) assistant.content += chunk;
      }
      status.value = "idle";
    } catch (err) {
      if (isAbort(err)) {
        status.value = "idle";
      } else {
        error.value = (err instanceof Error ? err.message : String(err)) || "something went wrong";
        status.value = "error";
      }
    } finally {
      // Keep partial text on cancel or failure; drop the bubble if nothing arrived.
      dropEmptyReply(assistantIndex);
      controller = null;
    }
  }

  function cancel(): void {
    controller?.abort();
  }

  if (getCurrentScope()) onScopeDispose(cancel);

  return {
    messages: readonly(messages),
    status: readonly(status),
    isStreaming,
    error: readonly(error),
    send,
    cancel,
  };
}
