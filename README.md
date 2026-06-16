# vue-ai-chat

A Vue 3 + TypeScript streaming chat UI built around the parts people skip: token
streaming, mid-response cancellation, and error recovery, all driven by a tested
state machine. The chatbot is the easy bit. Handling a stream that the user
cancels, or that fails halfway, without leaving the UI in a broken state, is the
part that separates a demo from something you would ship.

It runs with no backend: a fake streaming client is wired in by default, so
`npm run dev` gives you a working, streaming chat immediately.

## What it demonstrates

- **Streaming UX:** assistant tokens render as they arrive, with a live cursor.
- **Cancellation:** a Stop button aborts an in-flight stream via `AbortSignal`;
  whatever already streamed is kept, and no error is shown.
- **Error recovery:** a failed stream surfaces a message and removes the empty
  assistant bubble instead of leaving a blank one.
- **Testable core:** all of the above lives in a `useChat` composable that is
  unit-tested with a fake client and no DOM. The components are a thin view.

## Run it

```bash
npm install
npm test          # the state machine and a component, no backend
npm run dev       # the app, in demo mode on the fake client
npm run build     # type-check (vue-tsc) + production build
```

To connect a real backend, implement the `ChatClient` interface (one method:
`stream(prompt, signal)` yielding tokens) against your SSE endpoint and pass it
to `useChat` instead of the fake client. Nothing else changes.

## Design

The decisions and tradeoffs (why a composable, why the client is an interface,
how cancellation and the error path are handled) are in [DESIGN.md](./DESIGN.md).

## Status

Working and tested: 8 tests covering streaming, empty-input handling, the
single-stream guard, the error path, cancellation, and the input component. CI
runs typecheck, tests, and the production build.
