"use strict";

/**
 * Outbound SMS for Switch verification OTP.
 * Provider: Semaphore (PH) via SMS_PROVIDER=semaphore
 *
 * Env:
 *   SMS_PROVIDER=semaphore
 *   SEMAPHORE_API_KEY=...
 *   SEMAPHORE_SENDER_NAME=SWITCH   (must be approved in Semaphore dashboard)
 *   SMS_ENABLED=true
 */

function normalizePhMobileE164(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  // 09XXXXXXXXX → 639XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `63${digits.slice(1)}`;
  }

  // 9XXXXXXXXX → 639XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `63${digits}`;
  }

  // Already 639XXXXXXXXX
  if (digits.startsWith("63") && digits.length === 12) {
    return digits;
  }

  return "";
}

function isValidPhMobile(value) {
  return Boolean(normalizePhMobileE164(value));
}

function isSmsEnabled() {
  const flag = String(process.env.SMS_ENABLED ?? "").trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  if (flag === "true" || flag === "1" || flag === "on") {
    return true;
  }
  // Auto-enable when Semaphore key is present
  return Boolean(String(process.env.SEMAPHORE_API_KEY ?? "").trim());
}

async function sendSemaphoreSms({ number, message }) {
  const apiKey = String(process.env.SEMAPHORE_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("SEMAPHORE_API_KEY is not configured in backend/.env.");
  }

  const senderName =
    String(process.env.SEMAPHORE_SENDER_NAME ?? "SEMAPHORE").trim() || "SEMAPHORE";
  const normalizedNumber = normalizePhMobileE164(number);
  if (!normalizedNumber) {
    throw new Error("Enter a valid PH mobile number (e.g. 09171234567).");
  }

  const response = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      apikey: apiKey,
      number: normalizedNumber,
      message,
      sendername: senderName,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      data?.message ||
      data?.error ||
      (Array.isArray(data) && data[0]?.message) ||
      `Semaphore SMS failed (${response.status}).`;
    throw new Error(String(detail));
  }

  return {
    provider: "semaphore",
    number: normalizedNumber,
    raw: data,
  };
}

async function sendSms({ number, message }) {
  if (!isSmsEnabled()) {
    throw new Error(
      "SMS is not enabled. Set SEMAPHORE_API_KEY (and SMS_ENABLED=true) in backend/.env.",
    );
  }

  const provider = String(process.env.SMS_PROVIDER ?? "semaphore")
    .trim()
    .toLowerCase();

  if (provider === "semaphore") {
    return sendSemaphoreSms({ number, message });
  }

  throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
}

async function sendVerificationSms({ number, code, purpose = "registration" }) {
  const appName = String(process.env.SMS_APP_NAME ?? "Switch").trim() || "Switch";
  const message =
    purpose === "password_reset"
      ? `${appName}: Your password reset code is ${code}. Valid for 10 minutes. Do not share this code.`
      : `${appName}: Your verification code is ${code}. Valid for 10 minutes. Do not share this code.`;

  return sendSms({ number, message });
}

module.exports = {
  normalizePhMobileE164,
  isValidPhMobile,
  isSmsEnabled,
  sendSms,
  sendVerificationSms,
};
