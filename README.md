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

### With Claude behind it

`server/` is a small Node server that streams Claude's reply to the browser as
server-sent events. The API key stays on the server; the browser only ever calls
`/api/chat`.

```bash
ANTHROPIC_API_KEY=... npm run server        # :8788 (PowerShell: $env:ANTHROPIC_API_KEY="..."; npm run server)
VITE_CHAT_BACKEND=1 npm run dev             # the UI on the real client, /api proxied to :8788
```

| Variable | Default | |
|---|---|---|
| `CLAUDE_MODEL` | `claude-haiku-4-5` | |
| `CHAT_IDLE_TIMEOUT_MS` | `15000` | Give up when Claude sends no text for this long, before the first word or mid-answer |
| `ANTHROPIC_BASE_URL` | the API | Read by the SDK; point it at a fault-injection proxy to test failures |

Every reply ends with a `done` or an `error` event. The client treats a stream
that ends without either as a lost connection, so half an answer never looks
complete. An answer Claude stopped at the token limit is reported as cut short.

## Limitations

- **No retry, persistence, or markdown rendering.** Replies render as plain text,
  which keeps them XSS-safe. A failed or cut-short reply keeps its partial text
  and asks the user to try again.
- **The server is a demo.** No auth, rate limiting or per-user spend cap; don't
  expose it publicly as it is.

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
