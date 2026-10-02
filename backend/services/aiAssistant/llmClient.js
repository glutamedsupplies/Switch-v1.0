"use strict";

const PROVIDER_URLS = Object.freeze({
  openai: "https://api.openai.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  anthropic: "https://api.anthropic.com/v1/chat/completions",
});
const CONFIG_CACHE_MS = 30_000;
const QUOTA_COOLDOWN_MS = 2 * 60_000;
const AUTH_COOLDOWN_MS = 5 * 60_000;
const RATE_LIMIT_COOLDOWN_MS = 20_000;

/** How long to stop calling the provider after an error, so chat falls back instantly. */
function cooldownFor(status, detail) {
  if (status === 401 || status === 403) return { ms: AUTH_COOLDOWN_MS, reason: "auth" };
  if (status === 429 && /credit|quota|billing|insufficient/i.test(detail)) return { ms: QUOTA_COOLDOWN_MS, reason: "quota" };
  if (status === 429) return { ms: RATE_LIMIT_COOLDOWN_MS, reason: "rate_limit" };
  return null;
}

function usesCompletionTokenParam(provider, model) {
  return provider === "openai" && /^(o\d|gpt-5|gpt-6)/i.test(String(model || ""));
}

function parseArguments(raw) {
  if (raw && typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

/**
 * OpenAI-compatible chat-completions client with tool calling. The provider
 * comes from the Super Admin launched AI integration, falling back to env keys.
 * The model only chooses tools; it never receives secrets or writes data.
 */
function createLlmClient({
  resolveLaunchedProvider = async () => null,
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = 25_000,
  now = () => Date.now(),
  logger = console,
} = {}) {
  let cached = { at: 0, config: null };
  let health = { lastOkAt: null, lastError: null, cooldownUntil: 0, cooldownKey: "" };

  const configKey = (config) => (config ? `${config.provider}|${config.model}|${config.apiKey.slice(-6)}` : "");

  function recordError(config, error) {
    health.lastError = {
      at: new Date(now()).toISOString(),
      status: error.status || 0,
      code: error.code || "AI_PROVIDER_ERROR",
      message: String(error.message || "").replace(/\b(sk|AIza|key)[-_A-Za-z0-9*]{6,}/g, "[redacted]").slice(0, 300),
    };
    const cooldown = cooldownFor(error.status, error.message);
    if (!cooldown) return;
    const wasCooling = health.cooldownUntil > now() && health.cooldownKey === configKey(config);
    health.cooldownUntil = now() + cooldown.ms;
    health.cooldownKey = configKey(config);
    health.lastError.reason = cooldown.reason;
    if (!wasCooling) {
      const hint = cooldown.reason === "quota"
        ? "Add credits to the provider account or launch another AI integration in Super Admin."
        : cooldown.reason === "auth"
          ? "Check the API key in Super Admin → AI integration."
          : "The provider is rate limiting requests.";
      logger.warn?.(`[ai-assistant] ${config.provider} (${config.model}) unavailable: ${health.lastError.message} ${hint} Using built-in rules for ${Math.round(cooldown.ms / 1000)}s.`);
    }
  }

  function coolingDown(config) {
    return health.cooldownUntil > now() && health.cooldownKey === configKey(config);
  }

  async function getConfig() {
    if (String(env.AI_ASSISTANT_PROVIDER || "").toLowerCase() === "rules") return null;
    if (cached.at && now() - cached.at < CONFIG_CACHE_MS) return cached.config;
    let config = null;
    const explicitKey = String(env.AI_ASSISTANT_API_KEY || "").trim();
    if (explicitKey) {
      const provider = String(env.AI_ASSISTANT_PROVIDER || "openai").toLowerCase();
      config = {
        provider,
        apiKey: explicitKey,
        model: String(env.AI_ASSISTANT_MODEL || env.CHAT_AI_MODEL || "gpt-4o-mini"),
        url: String(env.AI_ASSISTANT_API_URL || PROVIDER_URLS[provider] || PROVIDER_URLS.openai),
      };
    }
    if (!config) {
      try {
        const launched = await resolveLaunchedProvider();
        if (launched?.apiKey && PROVIDER_URLS[launched.provider]) {
          config = { ...launched, url: PROVIDER_URLS[launched.provider] };
        }
      } catch (error) {
        logger.warn?.("[ai-assistant] unable to read launched AI integration:", error?.message);
      }
    }
    if (!config) {
      const legacyKey = String(env.CHAT_AI_API_KEY || env.OPENAI_API_KEY || "").trim();
      if (legacyKey && !/^your_/i.test(legacyKey)) {
        config = {
          provider: "openai",
          apiKey: legacyKey,
          model: String(env.AI_ASSISTANT_MODEL || env.CHAT_AI_MODEL || env.OPENAI_MODEL || "gpt-4o-mini"),
          url: String(env.CHAT_AI_API_URL || PROVIDER_URLS.openai),
        };
      }
    }
    cached = { at: now(), config };
    return config;
  }

  async function status() {
    const config = await getConfig();
    if (!config) return { available: false, provider: "rules", model: "", configured: false, reason: "not_configured" };
    if (coolingDown(config)) {
      return {
        available: false,
        configured: true,
        provider: config.provider,
        model: config.model,
        reason: health.lastError?.reason || "cooldown",
        retryAt: new Date(health.cooldownUntil).toISOString(),
        lastError: health.lastError,
      };
    }
    return { available: true, configured: true, provider: config.provider, model: config.model, lastOkAt: health.lastOkAt, lastError: health.lastError };
  }

  /**
   * @returns {Promise<{content: string, toolCalls: Array<{id: string, name: string, arguments: object}>, provider: string, model: string}>}
   */
  async function complete({ messages, tools = [], maxTokens = 700, temperature = 0.2 }) {
    const config = await getConfig();
    if (!config) throw Object.assign(new Error("No AI provider is configured."), { code: "AI_PROVIDER_UNAVAILABLE" });
    if (typeof fetchImpl !== "function") throw Object.assign(new Error("fetch is unavailable."), { code: "AI_PROVIDER_UNAVAILABLE" });
    const body = {
      model: config.model,
      messages,
      ...(tools.length ? { tools, tool_choice: "auto" } : {}),
    };
    if (usesCompletionTokenParam(config.provider, config.model)) {
      body.max_completion_tokens = maxTokens * 3;
    } else {
      body.max_tokens = maxTokens;
      body.temperature = temperature;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(config.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const failure = Object.assign(new Error(error?.name === "AbortError" ? "The AI provider timed out." : "The AI provider is unreachable."), {
        code: "AI_PROVIDER_ERROR",
      });
      recordError(config, failure);
      throw failure;
    } finally {
      clearTimeout(timer);
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) cached = { at: 0, config: null };
      const detail = String(payload?.error?.message || payload?.message || "").slice(0, 200);
      const failure = Object.assign(new Error(`AI provider error (${response.status})${detail ? `: ${detail}` : ""}`), {
        code: "AI_PROVIDER_ERROR",
        status: response.status,
      });
      recordError(config, failure);
      throw failure;
    }
    health.lastOkAt = new Date(now()).toISOString();
    health.cooldownUntil = 0;
    const message = payload?.choices?.[0]?.message || {};
    const toolCalls = (Array.isArray(message.tool_calls) ? message.tool_calls : [])
      .filter((call) => call?.function?.name)
      .map((call, index) => ({
        id: String(call.id || `call_${index}`),
        name: String(call.function.name),
        arguments: parseArguments(call.function.arguments),
      }));
    return {
      content: typeof message.content === "string" ? message.content : "",
      toolCalls,
      provider: config.provider,
      model: config.model,
    };
  }

  function invalidate() {
    cached = { at: 0, config: null };
    health.cooldownUntil = 0;
  }

  return { complete, status, invalidate, getConfig };
}

module.exports = { createLlmClient, PROVIDER_URLS };
