"use strict";

function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

const SECRET_PATTERNS = [
  { kind: "cvv", pattern: /\b(cvv2?|cvc2?|security\s*code)\b\s*[:#-]?\s*\d{3,4}\b/gi },
  { kind: "otp", pattern: /\b(otp|one[\s-]*time\s*(pin|password|code)|verification\s*code|mpin|pin\s*code)\b\s*(is|:|#|-)?\s*\d{4,8}\b/gi },
  { kind: "password", pattern: /\b(password|passcode|passwd|pwd)\b\s*(is|:|=)?\s*\S+/gi },
  { kind: "government_id", pattern: /\b(tin|sss|philhealth|pag-?ibig|umid|passport|driver'?s?\s*license)\s*(no\.?|number|#)?\s*[:#-]?\s*[A-Z0-9-]{6,20}\b/gi },
];

/**
 * Strips payment credentials and other secrets from user text before it is
 * stored or sent to the language model. Payments must happen on the secure
 * payment page, never inside the chat.
 */
function redactSecrets(input) {
  let text = String(input ?? "");
  const kinds = new Set();

  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && passesLuhn(digits)) {
      kinds.add("card_number");
      return "[redacted card number]";
    }
    return match;
  });

  for (const { kind, pattern } of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      kinds.add(kind);
      return `[redacted ${kind.replace("_", " ")}]`;
    });
  }

  return { text, redacted: kinds.size > 0, kinds: [...kinds] };
}

module.exports = { redactSecrets, passesLuhn };
