"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createLlmClient } = require("../services/aiAssistant/llmClient");

function harness(responses) {
  let clock = 1_000_000;
  const calls = [];
  const warnings = [];
  const queue = [...responses];
  const llm = createLlmClient({
    env: {},
    resolveLaunchedProvider: async () => ({ provider: "openai", apiKey: "sk-test-abcdef123456", model: "gpt-4o-mini" }),
    now: () => clock,
    logger: { warn: (...args) => warnings.push(args.join(" ")) },
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization });
      const next = queue.shift() || { status: 200, body: { choices: [{ message: { content: "ok" } }] } };
      return { ok: next.status < 300, status: next.status, json: async () => next.body };
    },
  });
  return { llm, calls, warnings, advance: (ms) => { clock += ms; } };
}

const noCredits = { status: 429, body: { error: { message: "You have no credits remaining. Add credits to continue using the API." } } };

test("calls the launched OpenAI integration with tools and the bearer key", async () => {
  const h = harness([{ status: 200, body: { choices: [{ message: { content: "", tool_calls: [{ id: "c1", function: { name: "search_products", arguments: "{\"query\":\"shoes\"}" } }] } }] } }]);
  const reply = await h.llm.complete({ messages: [{ role: "user", content: "shoes" }], tools: [{ type: "function", function: { name: "search_products" } }] });
  assert.equal(h.calls[0].url, "https://api.openai.com/v1/chat/completions");
  assert.equal(h.calls[0].auth, "Bearer sk-test-abcdef123456");
  assert.equal(h.calls[0].body.tool_choice, "auto");
  assert.deepEqual(reply.toolCalls, [{ id: "c1", name: "search_products", arguments: { query: "shoes" } }]);
  assert.equal((await h.llm.status()).available, true);
});

test("no-credit errors pause the provider so chat falls back instantly, then retries", async () => {
  const h = harness([noCredits]);
  await assert.rejects(h.llm.complete({ messages: [] }), /no credits/);
  const status = await h.llm.status();
  assert.equal(status.available, false);
  assert.equal(status.configured, true);
  assert.equal(status.reason, "quota");
  assert.match(status.lastError.message, /no credits/);
  assert.equal(h.warnings.length, 1);
  assert.match(h.warnings[0], /Add credits/);
  assert.doesNotMatch(JSON.stringify(status), /abcdef123456/);

  h.advance(2 * 60_000 + 1);
  assert.equal((await h.llm.status()).available, true);
  await h.llm.complete({ messages: [] });
  assert.equal(h.calls.length, 2);
  assert.ok((await h.llm.status()).lastOkAt);
});

test("plain rate limits only pause briefly", async () => {
  const h = harness([{ status: 429, body: { error: { message: "Rate limit reached for requests" } } }]);
  await assert.rejects(h.llm.complete({ messages: [] }));
  assert.equal((await h.llm.status()).reason, "rate_limit");
  h.advance(20_001);
  assert.equal((await h.llm.status()).available, true);
});
