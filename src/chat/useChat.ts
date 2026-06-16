import { readonly, ref } from "vue";
import type { ChatClient, ChatMessage } from "./types";

/**
 * The chat state machine, independent of any component. Owns the message list,
 * the streaming flag, the error, and cancellation. Kept as a composable so it is
 * unit-tested with a fake client and no DOM. The component is just a view over
 * this.
 */
export function useChat(client: ChatClient) {
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  let controller: AbortController | null = null;

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (trimmed === "" || isStreaming.value) return;

    error.value = null;
    messages.value.push({ role: "user", content: trimmed });
    messages.value.push({ role: "assistant", content: "" });
    const assistantIndex = messages.value.length - 1;

    isStreaming.value = true;
    controller = new AbortController();
    try {
      for await (const chunk of client.stream(trimmed, controller.signal)) {
        const assistant = messages.value[assistantIndex];
        if (assistant) assistant.content += chunk;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Cancelled by the user: keep whatever streamed, surface no error.
      } else {
        error.value = (err as Error).message || "something went wrong";
        // Drop the empty assistant bubble if nothing arrived before failing.
        const assistant = messages.value[assistantIndex];
        if (assistant && assistant.content === "") messages.value.splice(assistantIndex, 1);
      }
    } finally {
      isStreaming.value = false;
      controller = null;
    }
  }

  function cancel(): void {
    controller?.abort();
  }

  return {
    messages: readonly(messages),
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    send,
    cancel,
  };
}
