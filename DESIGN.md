# Design decisions

## 1. State in a composable, not in the component

**Decision.** All chat behaviour lives in `useChat`, a composable returning
read-only state (`messages`, `isStreaming`, `error`) and two actions (`send`,
`cancel`). Components render it and emit events; they hold no logic.

**Why.** It makes the behaviour, which is where the bugs live, unit-testable
with a fake client and no DOM. It also keeps the components trivial.

**Cost.** A small amount of indirection versus stuffing state into the
component. It pays off the first time you test the cancellation path.

## 2. The backend is an interface

**Decision.** `ChatClient` has one method, `stream(messages, signal)`, taking
the conversation so far and returning an async iterable of tokens. The app ships a fake implementation; a real one
would wrap an SSE endpoint.

**Why.** The UI should not care how tokens arrive. The fake makes the app and
tests run with zero setup, and swapping in a real client touches one line.

## 3. Cancellation is first-class, not an afterthought

**Decision.** `send` creates an `AbortController`; `cancel` aborts it; the client
checks the signal between tokens. An abort is caught and treated as a normal
outcome: partial text stays, no error is shown.

**Why.** Users stop long responses. If cancellation throws an unhandled error or
wipes the partial reply, the UI feels broken. Distinguishing an abort from a
real failure (by the error's `name`) is the detail that makes it feel right.

**Cost.** The client implementation has to honour the signal. `useChat` does not
trust it to: it also stops appending as soon as the signal is aborted, because a
client that checks only before a delay would otherwise yield one more token.

## 4. The error path cleans up after itself

**Decision.** On a real failure, the error is surfaced and the empty assistant
bubble is removed, so the user does not see a blank reply hanging under their
message.

**Why.** Leaving a half-rendered assistant turn is the classic streaming-UI bug.
Removing it only when nothing streamed keeps partial responses on a mid-stream
failure while cleaning up an immediate one.

## 5. A reply must say it finished

**Decision.** The server ends every reply with a `done` or an `error` event, and
the client throws when the stream ends without one. The server reports an answer
that stopped at `max_tokens` as cut short, and gives up when Claude sends no
text for `CHAT_IDLE_TIMEOUT_MS` (15 s), before the first word or mid-answer.

**Why.** A fault-injection run with Claude behind a proxy showed two silent
failures. An answer truncated at the token limit arrived as a well-formed stream
and rendered as a complete reply, cut off mid-sentence. A call that hung or was
slow to start left the cursor blinking with no limit, because nothing in the chain
had a limit shorter than the SDK's 10-minute default. Both look fine to
an HTTP check: the status is 200.

**Cost.** A genuinely slow first token past 15 s now fails instead of arriving.

## Left as extension points

- Retry on transient failures, with the partial response preserved.
- Persistence of conversation history across reloads.
- Markdown rendering of assistant messages.
