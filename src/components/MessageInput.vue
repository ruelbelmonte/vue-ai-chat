<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ streaming: boolean }>();
const emit = defineEmits<{ submit: [text: string]; cancel: [] }>();

const text = ref("");

function onSubmit(): void {
  // Enter while streaming would otherwise clear text that send() then ignores.
  if (props.streaming || text.value.trim() === "") return;
  emit("submit", text.value);
  text.value = "";
}

function onButtonClick(): void {
  if (props.streaming) emit("cancel");
}
</script>

<template>
  <form class="input" @submit.prevent="onSubmit">
    <input v-model="text" aria-label="message" placeholder="Ask something..." />
    <!-- One button that swaps role, so focus survives the Send/Stop change. -->
    <button :type="streaming ? 'button' : 'submit'" @click="onButtonClick">
      {{ streaming ? "Stop" : "Send" }}
    </button>
  </form>
</template>
