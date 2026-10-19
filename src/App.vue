<script setup lang="ts">
import { ref } from "vue";
import { createFakeClient } from "./chat/fakeClient";
import type { ChatClient } from "./chat/types";
import { useChat } from "./chat/useChat";
import MessageInput from "./components/MessageInput.vue";
import MessageList from "./components/MessageList.vue";

// Demo mode: a fake streaming client, so it works with no backend.
const simulateFailure = ref(false);
const demoClient: ChatClient = {
  stream: (messages, signal) => createFakeClient({ fail: simulateFailure.value }).stream(messages, signal),
};
const { messages, isStreaming, error, send, cancel } = useChat(demoClient);
</script>

<template>
  <main class="app">
    <header>
      <h1>vue-ai-chat</h1>
      <p class="note">Streaming chat UI with cancellation and error recovery. Demo mode (fake client).</p>
      <label class="note"><input v-model="simulateFailure" type="checkbox" /> Simulate a backend failure</label>
    </header>
    <MessageList :messages="messages" :streaming="isStreaming" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <MessageInput :streaming="isStreaming" @submit="send" @cancel="cancel" />
  </main>
</template>
