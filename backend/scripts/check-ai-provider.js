"use strict";

/**
 * Sends one real tool-calling request to the AI provider the assistant would use
 * (AI_ASSISTANT_API_KEY → launched Super Admin AI integration → CHAT_AI_API_KEY/OPENAI_API_KEY).
 * Usage: npm run ai:check
 */

const fs = require("fs");
const path = require("path");
const { createLlmClient } = require("../services/aiAssistant/llmClient");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function readLaunchedIntegration() {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "workspace_settings.json"), "utf8"));
    const list = Array.isArray(settings.aiIntegrations) && settings.aiIntegrations.length
      ? settings.aiIntegrations
      : settings.aiIntegration ? [settings.aiIntegration] : [];
    const chatbotOn = (value) => (value && typeof value === "object" ? Boolean(value.enabled ?? value.available) : Boolean(value));
    const item = list.find((entry) => entry?.launched && String(entry.apiKey || "").trim() && chatbotOn(entry?.capabilities?.chatbot));
    if (!item) return null;
    return {
      provider: String(item.provider || "openai").toLowerCase(),
      apiKey: String(item.apiKey).trim(),
      model: String(item.chatModel || "").trim() || "gpt-4o-mini",
    };
  } catch (_) {
    return null;
  }
}

async function main() {
  loadEnv(path.join(__dirname, "..", ".env"));
  loadEnv(path.join(__dirname, "..", "..", ".env"));
  const launched = readLaunchedIntegration();
  const source = String(process.env.AI_ASSISTANT_API_KEY || "").trim()
    ? "AI_ASSISTANT_API_KEY (.env)"
    : launched
      ? "Super Admin → AI integration (launched)"
      : String(process.env.CHAT_AI_API_KEY || process.env.OPENAI_API_KEY || "").trim()
        ? "CHAT_AI_API_KEY / OPENAI_API_KEY (.env)"
        : "none";
  const llm = createLlmClient({ resolveLaunchedProvider: async () => launched, logger: { warn() {} } });
  const status = await llm.status();
  console.log(`Source:   ${source}`);
  if (!status.configured) {
    console.log("Result:   No AI provider configured. The assistant uses built-in rules.");
    console.log("Fix:      Launch an AI integration in Super Admin, or set AI_ASSISTANT_API_KEY in backend/.env.");
    process.exitCode = 1;
    return;
  }
  console.log(`Provider: ${status.provider}`);
  console.log(`Model:    ${status.model}`);
  const started = Date.now();
  try {
    const reply = await llm.complete({
      messages: [
        { role: "system", content: "You are a shopping assistant. Use the tool to search." },
        { role: "user", content: "Hanap ako ng running shoes" },
      ],
      tools: [{
        type: "function",
        function: {
          name: "search_products",
          description: "Search the catalog",
          parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        },
      }],
      maxTokens: 120,
    });
    const call = reply.toolCalls[0];
    console.log(`Result:   OK in ${Date.now() - started} ms`);
    console.log(call ? `Tool call: ${call.name}(${JSON.stringify(call.arguments)})` : `Reply:    ${reply.content.slice(0, 160)}`);
  } catch (error) {
    const after = await llm.status();
    console.log(`Result:   FAILED — ${after.lastError?.message || error.message}`);
    const reason = after.lastError?.reason;
    if (reason === "quota") console.log("Fix:      The provider account has no credits. Add billing credits, or launch another provider (e.g. Gemini) in Super Admin.");
    else if (reason === "auth") console.log("Fix:      The API key was rejected. Paste a new key in Super Admin → AI integration.");
    else if (after.lastError?.status === 404 || /model/i.test(error.message)) console.log("Fix:      The model name may be wrong. Pick a chat model from the synced list in Super Admin.");
    process.exitCode = 1;
  }
}

main();
