(() => {
  const params = new URLSearchParams(window.location.search || "");
  const token = String(params.get("token") || "").trim();
  const title = document.querySelector("[data-pin-reset-title]");
  const lead = document.querySelector("[data-pin-reset-lead]");
  const form = document.querySelector("[data-pin-reset-form]");
  const passwordField = document.querySelector("[data-pin-reset-password-field]");
  const pinFields = document.querySelector("[data-pin-reset-pin-fields]");
  const passwordInput = document.querySelector("[data-pin-reset-password]");
  const pinInput = document.querySelector("[data-pin-reset-pin]");
  const confirmInput = document.querySelector("[data-pin-reset-pin-confirm]");
  const feedback = document.querySelector("[data-pin-reset-feedback]");
  const submit = document.querySelector("[data-pin-reset-submit]");
  let unlockToken = "";
  let passwordValue = "";

  const setFeedback = (message, tone) => {
    if (!feedback) return;
    feedback.textContent = message || "";
    feedback.classList.toggle("is-error", tone === "error");
    feedback.classList.toggle("is-ok", tone === "ok");
  };

  const showPinStep = () => {
    if (passwordField) passwordField.hidden = true;
    if (pinFields) pinFields.hidden = false;
    if (title) title.textContent = "Set a new Switch PIN";
    if (lead) lead.textContent = "Password accepted. Enter a new 6-digit Switch PIN for this company.";
    if (submit) submit.textContent = "Save Switch PIN";
    pinInput?.focus();
  };

  if (!token) {
    if (title) title.textContent = "Reset link missing";
    if (lead) lead.textContent = "Open the email we sent to your Gmail and tap the Switch PIN reset link.";
    return;
  }

  fetch(`/api/public/seller-switch-pin/reset?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
    .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
    .then(({ ok, payload }) => {
      if (!ok) {
        throw new Error(payload.message || "This Switch PIN reset link is invalid.");
      }
      if (title) title.textContent = "Enter company password first";
      if (lead) {
        lead.textContent = `Reset Switch PIN for ${payload.companyName || "this company"}. Enter the company password before you can set a new PIN. Link sent to ${payload.emailMasked || "your Gmail"}.`;
      }
      if (form) form.hidden = false;
      passwordInput?.focus();
    })
    .catch((error) => {
      if (title) title.textContent = "Link expired";
      if (lead) {
        lead.textContent = error instanceof Error
          ? error.message
          : "This Switch PIN reset link is invalid or expired.";
      }
    });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");
    if (submit) submit.disabled = true;

    try {
      if (!unlockToken) {
        passwordValue = String(passwordInput?.value || "");
        if (!passwordValue) {
          throw new Error("Enter your company password first.");
        }
        const response = await fetch("/api/public/seller-switch-pin/unlock", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: passwordValue }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Incorrect password.");
        }
        unlockToken = String(payload.unlockToken || "").trim();
        if (!unlockToken) {
          throw new Error("Unable to unlock Switch PIN reset.");
        }
        showPinStep();
        setFeedback(payload.message || "Password accepted.", "ok");
        return;
      }

      const pin = String(pinInput?.value || "").replace(/\D/g, "");
      const confirmPin = String(confirmInput?.value || "").replace(/\D/g, "");
      if (!/^\d{6}$/.test(pin)) {
        throw new Error("Switch PIN must be exactly 6 digits.");
      }
      if (pin !== confirmPin) {
        throw new Error("Switch PIN confirmation does not match.");
      }
      const response = await fetch("/api/public/seller-switch-pin/reset", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          unlockToken,
          password: passwordValue,
          pin,
          confirmPin,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to reset Switch PIN.");
      }
      if (form) form.hidden = true;
      if (title) title.textContent = "Switch PIN updated";
      if (lead) lead.textContent = payload.message || "You can open seller admin with the new PIN.";
      setFeedback("", "ok");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to reset Switch PIN.", "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  [pinInput, confirmInput].forEach((input) => {
    input?.addEventListener("input", () => {
      input.value = String(input.value || "").replace(/\D/g, "").slice(0, 6);
    });
  });
})();
