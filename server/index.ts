import { createServer, type IncomingMessage } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { parseMessages, relayReply, type ChatEvent } from "./chat.ts";
import { claudeReply } from "./claude.ts";

const PORT = Number(process.env.PORT ?? 8788);
const MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5";
const MAX_TOKENS = 1024;
const MAX_BODY_BYTES = 256 * 1024;
const IDLE_TIMEOUT_MS = Number(process.env.CHAT_IDLE_TIMEOUT_MS) || 15_000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. The UI's demo mode needs no server.");
  process.exit(1);
}

// Reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from the environment.
const reply = claudeReply(new Anthropic(), MODEL, MAX_TOKENS);

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
    return;
  }
  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.writeHead(404).end();
    return;
  }

  let messages;
  try {
    messages = parseMessages(await readJson(req));
  } catch {
    messages = null;
  }
  if (!messages) {
    res.writeHead(400, { "Content-Type": "application/json" }).end('{"error":"invalid conversation"}');
    return;
  }

  // Stop paying for tokens nobody will read when the browser goes away.
  const upstream = new AbortController();
  res.on("close", () => upstream.abort());

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event: ChatEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  await relayReply(messages, reply, send, upstream.signal, { idleTimeoutMs: IDLE_TIMEOUT_MS });
  res.end();
});

server.listen(PORT, "127.0.0.1", () => console.log(`chat server on http://127.0.0.1:${PORT} (${MODEL})`));
