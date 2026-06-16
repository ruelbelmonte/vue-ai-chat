<script setup lang="ts">
import { ref } from "vue";

defineProps<{ streaming: boolean }>();
const emit = defineEmits<{ submit: [text: string]; cancel: [] }>();

const text = ref("");

function onSubmit(): void {
  if (text.value.trim() === "") return;
  emit("submit", text.value);
  text.value = "";
}
</script>

<template>
  <form class="input" @submit.prevent="onSubmit">
    <input v-model="text" aria-label="message" placeholder="Ask something..." />
    <button v-if="streaming" type="button" @click="emit('cancel')">Stop</button>
    <button v-else type="submit">Send</button>
  </form>
</template>
