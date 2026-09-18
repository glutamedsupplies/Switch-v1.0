"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
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

(async () => {
  try {
    const {
      sendVerificationEmail,
      isEmailEnabled,
      preferredProvider,
    } = require("../services/emailService");
    const to =
      process.argv[2] ||
      process.env.EMAIL_TEST_TO ||
      process.env.GMAIL_USER ||
      "";
    console.log("emailEnabled=", isEmailEnabled());
    console.log("provider=", preferredProvider());
    console.log("from=", process.env.EMAIL_FROM);
    console.log("to=", to);
    if (!to) {
      throw new Error("Pass a recipient: node scripts/test-gmail-otp.js you@email.com");
    }
    const result = await sendVerificationEmail({
      email: to,
      code: "123456",
      purpose: "registration",
    });
    console.log("SEND_OK", result);
  } catch (error) {
    console.error("SEND_FAIL", error && error.message ? error.message : error);
    process.exitCode = 1;
  }
})();
