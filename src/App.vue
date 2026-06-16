<script setup lang="ts">
import { createFakeClient } from "./chat/fakeClient";
import { useChat } from "./chat/useChat";
import MessageInput from "./components/MessageInput.vue";
import MessageList from "./components/MessageList.vue";

// Demo mode: runs on a fake streaming client so it works with no backend.
// In production, pass a ChatClient that streams from your SSE endpoint.
const { messages, isStreaming, error, send, cancel } = useChat(createFakeClient());
</script>

<template>
  <main class="app">
    <header>
      <h1>vue-ai-chat</h1>
      <p class="note">Streaming chat UI with cancellation and error recovery. Demo mode (fake client).</p>
    </header>
    <MessageList :messages="messages" :streaming="isStreaming" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <MessageInput :streaming="isStreaming" @submit="send" @cancel="cancel" />
  </main>
</template>
