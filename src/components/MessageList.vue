<script setup lang="ts">
import type { ChatMessage } from "../chat/types";

defineProps<{ messages: readonly ChatMessage[]; streaming: boolean }>();
</script>

<template>
  <!-- aria-busy defers screen-reader announcements until the reply completes. -->
  <ul class="messages" role="log" aria-live="polite" :aria-busy="streaming">
    <li v-for="(message, index) in messages" :key="index" :class="['msg', message.role]">
      <span class="role">{{ message.role }}</span>
      <span class="content">{{ message.content
        }}<span
          v-if="streaming && index === messages.length - 1 && message.role === 'assistant'"
          class="cursor"
          aria-hidden="true"
          >&#9613;</span
        ></span>
    </li>
  </ul>
</template>
