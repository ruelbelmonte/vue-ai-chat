# vue-ai-chat

[![ci](https://github.com/ruelbelmonte/vue-ai-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/ruelbelmonte/vue-ai-chat/actions/workflows/ci.yml)

**Live demo:** https://ruelbelmonte.github.io/vue-ai-chat/ (fake client, no API key)

A Vue 3 + TypeScript streaming chat UI focused on the parts that are easy to get
wrong: token streaming, mid-response cancellation, and error recovery. Handling a
stream that the user cancels, or that fails halfway, without leaving the UI in a
broken state, is the part this repo is about.

It runs with no backend: a fake streaming client is wired in by default, so
`npm run dev` gives you a working, streaming chat immediately. Tick "Simulate a
backend failure" in the demo to see the error path.

## What it demonstrates

- **Streaming UX:** assistant tokens render as they arrive, with a live cursor.
- **Conversation history:** each request sends the whole conversation, not just
  the latest prompt.
- **Cancellation:** a Stop button aborts an in-flight stream via `AbortSignal`.
  Whatever already streamed is kept, no token lands after Stop, and no error is
  shown. Cancelling before the first token leaves no empty bubble. The stream is
  also aborted when the component unmounts.
- **Error recovery:** a failed stream surfaces a message and removes the empty
  assistant bubble instead of leaving a blank one.
- **Explicit status:** `idle | streaming | error`, in a `useChat` composable
  that is unit-tested with a fake client and no DOM. The components are a thin
  view.
- **Accessibility:** the message list is a polite `role="log"`, marked
  `aria-busy` while streaming so screen readers announce the finished reply
  rather than every token. Focus stays on the button when Send becomes Stop.

## Run it

```bash
npm install
npm test          # the state machine and a component, no backend
npm run dev       # the app, in demo mode on the fake client
npm run build     # type-check (vue-tsc) + production build
```

To connect a real backend, implement `ChatClient` (one method:
`stream(messages, signal)` yielding tokens) and pass it to `useChat` instead of
the fake client. Keep API keys on a server: the client should call your own
backend, never a model provider directly from the browser.

## Limitations

- **No real transport yet.** There is no SSE client, so the hard parts of one
  are not here:
  - events split across network chunks
  - UTF-8 decoding at chunk boundaries (`TextDecoder` with `stream: true`)
  - server-sent error events
- **No retry, persistence, or markdown rendering.** Replies render as plain text,
  which keeps them XSS-safe.

## Design

The decisions and tradeoffs (why a composable, why the client is an interface,
how cancellation and the error path are handled) are in [DESIGN.md](./DESIGN.md).

## Status

Working and tested:
- streaming and conversation history
- empty-input handling and the single-stream guard
- the error path, including non-Error throws
- cancellation: no stale tokens, no empty bubble, abort on unmount
- the input component (Stop, and Enter while streaming)

CI runs typecheck, tests, and the production build. Pushes to `master` deploy the
demo to GitHub Pages.
