  async function saveSettings(options = {}) {
    settings = collectSettings();
    if (refs.sendButton) {
      refs.sendButton.disabled = true;
    }
    setFeedback("Saving device configuration...");
    try {
      const response = await fetch("/api/super-admin/biometric-settings", {
        method: "PUT",
        headers: getSuperAdminHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify({ settings }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to save biometric device settings.");
      }
      settings = normalizeSettings(data.settings);
      applySettingsToForm();
      if (options.keepFeedback !== true) {
        setFeedback("Retina scan device configuration saved.", "success");
      }
      addActivity("Configuration saved.", "success");
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save device settings.", "error");
      return false;
    } finally {
      syncConnectionUi();
      if (options.keepFeedback !== true && refs.feedback.classList.contains("is-success")) {
        window.setTimeout(() => {
          if (refs?.feedback?.classList.contains("is-success")) {
            setFeedback("");
          }
        }, 2600);
      }
    }
  }