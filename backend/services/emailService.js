"use strict";

/**
 * Outbound email for Switch verification OTP.
 *
 * Preferred for public signup (anyone can receive OTP):
 *   BREVO_API_KEY=   (Brevo — verify one sender email, no domain required)
 *   or RESEND_API_KEY= (Resend — best with a verified domain)
 *   EMAIL_FROM=Switch <you@gmail.com>
 *
 * Legacy fallbacks (single Gmail mailbox OAuth / SMTP):
 *   GMAIL_REFRESH_TOKEN= + GOOGLE_CLIENT_* + GMAIL_USER=
 *   GMAIL_USER= + GMAIL_APP_PASSWORD=
 */

const { OAuth2Client } = require("google-auth-library");

let transporterPromise = null;

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY ?? process.env.SENDINBLUE_API_KEY ?? "")
    .trim();
}

function getResendApiKey() {
  return String(process.env.RESEND_API_KEY ?? "").trim();
}

function hasBrevo() {
  return Boolean(getBrevoApiKey());
}

function hasResend() {
  return Boolean(getResendApiKey());
}

function getGoogleOAuthConfig() {
  return {
    clientId: String(process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
    refreshToken: String(process.env.GMAIL_REFRESH_TOKEN ?? "").trim(),
    user: String(process.env.GMAIL_USER ?? "").trim(),
  };
}

function hasGmailOAuth() {
  const config = getGoogleOAuthConfig();
  return Boolean(
    config.clientId &&
      config.clientSecret &&
      config.refreshToken &&
      config.user,
  );
}

function hasGmailSmtp() {
  return Boolean(
    String(process.env.GMAIL_USER ?? "").trim() &&
      String(process.env.GMAIL_APP_PASSWORD ?? "").trim(),
  );
}

function isEmailEnabled() {
  const flag = String(process.env.EMAIL_ENABLED ?? "").trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  return hasBrevo() || hasResend() || hasGmailOAuth() || hasGmailSmtp();
}

function getMailFrom() {
  const from = String(process.env.EMAIL_FROM ?? "").trim();
  if (from) {
    return from;
  }
  if (hasResend()) {
    return "Switch <beth.t@example.com>";
  }
  const user = String(process.env.GMAIL_USER ?? "").trim();
  return user ? `Switch <${user}>` : "Switch <noreply@switch.local>";
}

function parseFromAddress(from) {
  const raw = String(from || "").trim();
  const match = raw.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, "") || "Switch",
      email: match[2].trim(),
    };
  }
  return { name: "Switch", email: raw };
}

function buildRawMimeMessage({ from, to, subject, text, html }) {
  const boundary = `switch_boundary_${Date.now()}`;
  const safeSubject = String(subject || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(safeSubject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    String(text || ""),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    String(html || text || ""),
    "",
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendViaBrevo({ to, subject, text, html }) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set.");
  }

  const from = parseFromAddress(getMailFrom());
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: from.name, email: from.email },
      to: [{ email: to }],
      subject,
      htmlContent: html || text,
      textContent: text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Brevo send failed (${response.status}). Verify sender email in Brevo and check BREVO_API_KEY.`,
    );
  }

  return {
    provider: "brevo",
    messageId: String(data.messageId || data.messageIds?.[0] || ""),
  };
}

async function sendViaResend({ to, subject, text, html }) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getMailFrom(),
      to: [to],
      subject,
      html: html || text,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Resend send failed (${response.status}). Verify domain / EMAIL_FROM, or use Brevo without a domain.`,
    );
  }

  return {
    provider: "resend",
    messageId: String(data.id || ""),
  };
}

async function sendViaGmailApi({ to, subject, text, html }) {
  const config = getGoogleOAuthConfig();
  if (!hasGmailOAuth()) {
    throw new Error(
      "Gmail Google Sign-In is not connected. Run: node scripts/gmail-oauth-setup.js",
    );
  }

  const oauth2Client = new OAuth2Client(
    config.clientId,
    config.clientSecret,
    "http://127.0.0.1:8765/oauth2callback",
  );
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });

  const accessTokenResponse = await oauth2Client.getAccessToken();
  const accessToken = String(
    accessTokenResponse?.token ?? accessTokenResponse ?? "",
  ).trim();
  if (!accessToken) {
    throw new Error(
      "Unable to refresh Gmail access token. Re-run: node scripts/gmail-oauth-setup.js",
    );
  }

  const raw = buildRawMimeMessage({
    from: getMailFrom(),
    to,
    subject,
    text,
    html,
  });

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `Gmail API send failed (${response.status}). Reconnect Google Sign-In for Gmail.`,
    );
  }

  return {
    provider: "gmail_api",
    messageId: data.id || "",
  };
}

async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    const nodemailer = require("nodemailer");
    const user = String(process.env.GMAIL_USER ?? "").trim();
    const pass = String(process.env.GMAIL_APP_PASSWORD ?? "")
      .trim()
      .replace(/\s+/g, "");

    if (!user || !pass) {
      throw new Error(
        "Gmail SMTP is not configured. Prefer BREVO_API_KEY for public OTP email.",
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.verify();
    return transporter;
  })();

  try {
    return await transporterPromise;
  } catch (error) {
    transporterPromise = null;
    throw error;
  }
}

async function sendViaSmtp({ to, subject, text, html }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    text,
    html,
  });
  return {
    provider: "gmail_smtp",
    messageId: info.messageId,
  };
}

function preferredProvider() {
  const forced = String(process.env.EMAIL_PROVIDER ?? "")
    .trim()
    .toLowerCase();
  if (forced === "brevo" || forced === "resend" || forced === "gmail") {
    return forced;
  }
  if (hasBrevo()) return "brevo";
  if (hasResend()) return "resend";
  if (hasGmailOAuth() || hasGmailSmtp()) return "gmail";
  return "";
}

async function sendViaGmailWithOptionalSmtp(payload) {
  if (hasGmailOAuth()) {
    try {
      return await sendViaGmailApi(payload);
    } catch (oauthError) {
      if (!hasGmailSmtp()) {
        throw oauthError;
      }
      console.warn(
        "[email] Gmail API failed, falling back to SMTP:",
        oauthError instanceof Error ? oauthError.message : oauthError,
      );
    }
  }
  return sendViaSmtp(payload);
}

async function sendMail({ to, subject, text, html }) {
  if (!isEmailEnabled()) {
    throw new Error(
      "Email OTP is not configured. Set BREVO_API_KEY (recommended, no domain) or RESEND_API_KEY in backend/.env.",
    );
  }

  const provider = preferredProvider();
  const payload = { to, subject, text, html };

  if (provider === "brevo") {
    try {
      return await sendViaBrevo(payload);
    } catch (brevoError) {
      if (hasGmailOAuth() || hasGmailSmtp()) {
        console.warn(
          "[email] Brevo failed, falling back to Gmail:",
          brevoError instanceof Error ? brevoError.message : brevoError,
        );
        return sendViaGmailWithOptionalSmtp(payload);
      }
      throw brevoError;
    }
  }
  if (provider === "resend") {
    try {
      return await sendViaResend(payload);
    } catch (resendError) {
      if (hasGmailOAuth() || hasGmailSmtp()) {
        console.warn(
          "[email] Resend failed, falling back to Gmail:",
          resendError instanceof Error ? resendError.message : resendError,
        );
        return sendViaGmailWithOptionalSmtp(payload);
      }
      throw resendError;
    }
  }

  return sendViaGmailWithOptionalSmtp(payload);
}

async function sendVerificationEmail({ email, code, purpose = "registration" }) {
  const appName = String(process.env.SMS_APP_NAME ?? "Switch").trim() || "Switch";
  const subject =
    purpose === "password_reset"
      ? `${appName} password reset code`
      : `${appName} verification code`;

  const text =
    purpose === "password_reset"
      ? `Your ${appName} password reset code is ${code}. It is valid for 10 minutes. Do not share this code.`
      : `Your ${appName} verification code is ${code}. It is valid for 10 minutes. Do not share this code.`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">${appName}</h2>
      <p style="margin:0 0 12px">${
        purpose === "password_reset"
          ? "Use this code to reset your password:"
          : "Use this code to verify your Google/email account:"
      }</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</p>
      <p style="margin:0;color:#6b7280">Valid for 10 minutes. Do not share this code.</p>
    </div>
  `;

  return sendMail({
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = {
  isEmailEnabled,
  hasBrevo,
  hasResend,
  hasGmailOAuth,
  hasGmailSmtp,
  preferredProvider,
  sendMail,
  sendVerificationEmail,
};
