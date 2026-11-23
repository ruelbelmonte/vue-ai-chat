<script setup lang="ts">
import { ref } from "vue";
import { createFakeClient } from "./chat/fakeClient";
import { createSseClient } from "./chat/sseClient";
import type { ChatClient } from "./chat/types";
import { useChat } from "./chat/useChat";
import MessageInput from "./components/MessageInput.vue";
import MessageList from "./components/MessageList.vue";

// Demo mode (the default) uses a fake streaming client, so it works with no backend.
const useBackend = import.meta.env.VITE_CHAT_BACKEND === "1";
const simulateFailure = ref(false);
const demoClient: ChatClient = {
  stream: (messages, signal) => createFakeClient({ fail: simulateFailure.value }).stream(messages, signal),
};
const { messages, isStreaming, error, send, cancel } = useChat(useBackend ? createSseClient() : demoClient);
</script>

<template>
  <main class="app">
    <header>
      <h1>vue-ai-chat</h1>
      <p v-if="useBackend" class="note">Streaming chat UI with cancellation and error recovery. Connected to the chat server.</p>
      <template v-else>
        <p class="note">Streaming chat UI with cancellation and error recovery. Demo mode (fake client).</p>
        <label class="note"><input v-model="simulateFailure" type="checkbox" /> Simulate a backend failure</label>
      </template>
    </header>
    <MessageList :messages="messages" :streaming="isStreaming" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <MessageInput :streaming="isStreaming" @submit="send" @cancel="cancel" />
  </main>
</template>
