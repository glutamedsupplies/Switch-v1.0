(function () {
  const form = document.getElementById("admin-signup-form");
  const feedback = document.getElementById("admin-signup-feedback");
  const storeTypeSelect = document.getElementById("admin-signup-store-type");

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  function setFeedback(message, mode = "") {
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.className = "feedback-note admin-signup-public-feedback";
    if (mode) {
      feedback.classList.add(mode);
    }
  }

  function normalizeStoreTypeName(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function renderStoreTypeOptions(storeTypes = []) {
    if (!(storeTypeSelect instanceof HTMLSelectElement)) {
      return;
    }

    storeTypeSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = storeTypes.length
      ? "Select store type"
      : "No store types available";
    storeTypeSelect.append(placeholder);

    for (const storeType of storeTypes) {
      const normalizedStoreType = normalizeStoreTypeName(storeType);
      if (!normalizedStoreType) {
        continue;
      }

      const option = document.createElement("option");
      option.value = normalizedStoreType;
      option.textContent = normalizedStoreType;
      storeTypeSelect.append(option);
    }

    storeTypeSelect.disabled = !storeTypes.length;
  }

  async function loadStoreTypes() {
    if (!(storeTypeSelect instanceof HTMLSelectElement)) {
      return;
    }

    storeTypeSelect.disabled = true;
    renderStoreTypeOptions([]);

    try {
      const response = await fetch("/api/store-types", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load store types.");
      }

      const storeTypes = Array.isArray(data.storeTypes)
        ? data.storeTypes.map(normalizeStoreTypeName).filter(Boolean)
        : [];
      renderStoreTypeOptions(storeTypes);
      if (!storeTypes.length) {
        setFeedback("Add store types in Super Admin before creating admin accounts.", "error");
      }
    } catch (error) {
      renderStoreTypeOptions([]);
      setFeedback(
        error instanceof Error ? error.message : "Unable to load store types.",
        "error",
      );
    }
  }

  function getPayload() {
    const formData = new FormData(form);
    const companyName = String(formData.get("companyName") || "")
      .replace(/\s+/g, " ")
      .trim();
    const storeType = normalizeStoreTypeName(formData.get("storeType"));
    return {
      companyName,
      storeName: companyName,
      storeType,
      storeTypeName: storeType,
      businessType: storeType,
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      countryCode: "+63",
      mobileNumber: String(formData.get("mobileNumber") || "").replace(/\D/g, ""),
      password: String(formData.get("password") || "").trim(),
      confirmPassword: String(formData.get("confirmPassword") || "").trim(),
    };
  }

  function validatePayload(payload) {
    if (payload.companyName.length < 2) {
      return "Company name must be at least 2 characters long.";
    }
    if (!payload.storeType) {
      return "Please select a store type.";
    }
    if (payload.firstName.length < 2 || payload.lastName.length < 2) {
      return "First name and last name must be at least 2 characters long.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return "Please enter a valid admin email address.";
    }
    if (!/^9\d{9}$/.test(payload.mobileNumber)) {
      return "Mobile number must start with 9 and contain 10 digits.";
    }
    if (payload.password.length < 6) {
      return "Admin password must be at least 6 characters long.";
    }
    if (payload.password !== payload.confirmPassword) {
      return "Password confirmation does not match.";
    }
    return "";
  }

  async function submitAdminSignup(event) {
    event.preventDefault();
    const payload = getPayload();
    const validationMessage = validatePayload(payload);
    if (validationMessage) {
      setFeedback(validationMessage, "error");
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
    }
    setFeedback("Creating admin account...");

    try {
      const response = await fetch("/api/admin-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to create admin account.");
      }

      form.reset();
      setFeedback("Admin created. Redirecting to login...", "success");
      window.setTimeout(() => {
        window.location.href = data.redirectPath || "/login.html?role=admin";
      }, 900);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to create admin account.",
        "error",
      );
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  form.addEventListener("submit", submitAdminSignup);
  void loadStoreTypes();
})();
