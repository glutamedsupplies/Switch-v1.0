"use strict";

/**
 * Registers (or re-points) the PayMongo buyer + seller webhooks at a public
 * base URL and saves their signing secrets to backend/.env as
 * PAYMONGO_WEBHOOK_SECRET (comma-separated). Secrets are never printed.
 *
 * Usage:
 *   node scripts/paymongo-webhook-setup.js https://xxxx.ngrok-free.app
 *   node scripts/paymongo-webhook-setup.js --ngrok   (reads the running ngrok tunnel)
 *   node scripts/paymongo-webhook-setup.js --list
 */

const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env");
const PAYMONGO_API = "https://api.paymongo.com/v1";
// Buyer orders can be paid through hosted checkout or a direct Payment Intent
// (payment.paid); seller plans only use hosted checkout.
const WEBHOOK_EVENTS_BY_PATH = {
  "/api/payments/paymongo/buyer-webhook": ["checkout_session.payment.paid", "payment.paid"],
  "/api/payments/paymongo/seller-webhook": ["checkout_session.payment.paid"],
};
const WEBHOOK_PATHS = Object.keys(WEBHOOK_EVENTS_BY_PATH);

function readEnvValue(key) {
  if (!fs.existsSync(ENV_PATH)) return "";
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${key}=`)) continue;
    return trimmed
      .slice(key.length + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  }
  return "";
}

function writeEnvValue(key, value) {
  const raw = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().startsWith(`${key}=`));
  if (index >= 0) {
    lines[index] = `${key}=${value}`;
  } else {
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(`${key}=${value}`, "");
  }
  fs.writeFileSync(ENV_PATH, lines.join(eol));
}

async function paymongo(secretKey, method, apiPath, body) {
  const response = await fetch(`${PAYMONGO_API}${apiPath}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.errors?.[0]?.detail || payload?.errors?.[0]?.code;
    throw new Error(`PayMongo ${method} ${apiPath} failed (${response.status}): ${detail || "unknown error"}`);
  }
  return payload;
}

async function readNgrokPublicUrl() {
  const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) {
    throw new Error("ngrok is not running. Start it first: ngrok http 8080");
  }
  const { tunnels = [] } = await response.json();
  const https = tunnels.find((tunnel) => String(tunnel.public_url).startsWith("https://"));
  if (!https) throw new Error("No HTTPS ngrok tunnel found.");
  return https.public_url;
}

function pathOf(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, "");
  } catch (_) {
    return "";
  }
}

async function main() {
  const secretKey = readEnvValue("PAYMONGO_SECRET_KEY");
  if (!secretKey) throw new Error("PAYMONGO_SECRET_KEY is missing in backend/.env");
  const mode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";

  const listing = await paymongo(secretKey, "GET", "/webhooks");
  const existing = Array.isArray(listing?.data) ? listing.data : [];

  const arg = String(process.argv[2] || "").trim();
  if (arg === "--list") {
    console.log(`PayMongo ${mode} webhooks (${existing.length}):`);
    for (const hook of existing) {
      const a = hook.attributes || {};
      console.log(`- ${hook.id} [${a.status}] ${a.url} events=${(a.events || []).join(",")}`);
    }
    return;
  }

  const baseUrl = (arg === "--ngrok" || !arg ? await readNgrokPublicUrl() : arg).replace(/\/+$/, "");
  if (!baseUrl.startsWith("https://")) {
    throw new Error("PayMongo requires an HTTPS webhook URL.");
  }
  console.log(`PayMongo ${mode} mode. Public base URL: ${baseUrl}`);

  const secrets = [];
  for (const webhookPath of WEBHOOK_PATHS) {
    const targetUrl = `${baseUrl}${webhookPath}`;
    const events = WEBHOOK_EVENTS_BY_PATH[webhookPath];
    const match = existing.find((hook) => pathOf(hook.attributes?.url) === webhookPath);
    let hook;

    if (!match) {
      hook = (await paymongo(secretKey, "POST", "/webhooks", {
        data: { attributes: { url: targetUrl, events } },
      })).data;
      console.log(`Created   ${webhookPath} -> ${hook.id}`);
    } else {
      hook = match;
      const currentEvents = [...(match.attributes?.events || [])].sort().join(",");
      if (match.attributes?.url !== targetUrl || currentEvents !== [...events].sort().join(",")) {
        hook = (await paymongo(secretKey, "PUT", `/webhooks/${match.id}`, {
          data: { attributes: { url: targetUrl, events } },
        })).data;
        console.log(`Updated   ${webhookPath} -> ${hook.id}`);
      } else {
        console.log(`Unchanged ${webhookPath} -> ${hook.id}`);
      }
      if (hook.attributes?.status === "disabled") {
        hook = (await paymongo(secretKey, "POST", `/webhooks/${match.id}/enable`)).data;
        console.log(`Enabled   ${webhookPath}`);
      }
    }

    let secret = String(hook?.attributes?.secret_key || "").trim();
    if (!secret) {
      const fresh = await paymongo(secretKey, "GET", `/webhooks/${hook.id}`);
      secret = String(fresh?.data?.attributes?.secret_key || "").trim();
    }
    if (!secret) throw new Error(`PayMongo did not return a secret for ${hook.id}.`);
    secrets.push(secret);
  }

  writeEnvValue("PAYMONGO_WEBHOOK_SECRET", [...new Set(secrets)].join(","));
  writeEnvValue("PAYMENT_GATEWAY_WEBHOOK_URL", `${baseUrl}${WEBHOOK_PATHS[0]}`);
  console.log(`Saved ${secrets.length} webhook secret(s) to backend/.env (values hidden).`);
  console.log("Restart the backend so it loads the new secret.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
