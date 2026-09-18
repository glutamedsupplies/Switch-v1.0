"use strict";

/**
 * One-time setup: connect a Gmail account (Google Sign-In) so Switch can send OTP mail.
 *
 * Usage:
 *   1) Put GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in backend/.env
 *      (Web OAuth client from Google Cloud → Credentials)
 *   2) Add Authorized redirect URI:
 *      http://127.0.0.1:8765/oauth2callback
 *   3) Run:
 *      node scripts/gmail-oauth-setup.js
 *   4) Sign in with the Gmail that will SEND OTP (business mailbox)
 *   5) Copy GMAIL_REFRESH_TOKEN into backend/.env and restart server
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.join(__dirname, "..", ".env"));

const CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID ?? "").trim();
const CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
const REDIRECT_URI = "http://127.0.0.1:8765/oauth2callback";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend/.env\n" +
      "Create a Web OAuth client in Google Cloud → APIs & Services → Credentials,\n" +
      "then add redirect URI: http://127.0.0.1:8765/oauth2callback",
  );
  process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:8765");
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const oauthError = url.searchParams.get("error");
    const oauthErrorDesc = url.searchParams.get("error_description");
    if (oauthError) {
      const message =
        `Google OAuth error: ${oauthError}` +
        (oauthErrorDesc ? `\n${decodeURIComponent(oauthErrorDesc)}` : "") +
        "\n\nFix: OAuth consent = Testing, add sender Gmail as Test user, then open the URL printed in the terminal (do not open /oauth2callback manually).";
      console.error("\n" + message + "\n");
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(message);
      setTimeout(() => process.exit(1), 200);
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      const message =
        "Missing code.\n\nDo not open http://127.0.0.1:8765/oauth2callback yourself.\n" +
        "Run npm run gmail:connect, then open the long accounts.google.com URL from the terminal.";
      console.error("\n" + message + "\n");
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(message);
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const grantedScopes = String(tokens.scope || "").trim();
    const hasGmailSend = grantedScopes
      .split(/\s+/)
      .includes("https://www.googleapis.com/auth/gmail.send");

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );
    const userInfo = await userInfoResponse.json().catch(() => ({}));
    const email = String(userInfo.email || "").trim();

    if (!hasGmailSend) {
      const message =
        "Connected, but Google did NOT grant gmail.send.\n\n" +
        `Granted scopes: ${grantedScopes || "(none)"}\n\n` +
        "Fix in Google Cloud:\n" +
        "1) APIs & Services → Library → enable Gmail API\n" +
        "2) OAuth consent screen → Data Access / Scopes → add:\n" +
        "   https://www.googleapis.com/auth/gmail.send\n" +
        "3) https://myaccount.google.com/permissions → remove Switch\n" +
        "4) Re-run npm run gmail:connect and Allow Send email on your behalf";
      console.error("\n" + message + "\n");
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(message);
      setTimeout(() => process.exit(1), 300);
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<h1>Gmail connected</h1><p>Account: <b>${email || "(unknown)"}</b></p><p>Scope gmail.send: OK</p><p>You can close this tab and return to the terminal.</p>`,
    );

    console.log("\n=== Paste these into backend/.env ===\n");
    if (email) {
      console.log(`GMAIL_USER=${email}`);
      console.log(`EMAIL_FROM=Switch <${email}>`);
    }
    if (tokens.refresh_token) {
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.log(
        "# WARNING: No refresh_token returned. Revoke app access and re-run with prompt=consent.",
      );
    }
    console.log("\nGranted scopes:", grantedScopes);
    console.log("\nThen restart: npm start\n");

    setTimeout(() => {
      server.close(() => process.exit(0));
    }, 300);
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("OAuth failed. Check terminal.");
    setTimeout(() => process.exit(1), 200);
  }
});

server.listen(8765, "127.0.0.1", () => {
  console.log("Open this URL in your browser and sign in with the Gmail sender account:\n");
  console.log(authUrl);
  console.log("\nWaiting for Google callback on http://127.0.0.1:8765/oauth2callback ...");
});
