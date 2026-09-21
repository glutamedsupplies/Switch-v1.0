    keyButton.innerHTML = createIconSvg(integratedIconPaths.key);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "super-admin-company-card__quick-action super-admin-company-card__quick-action--danger partner-data-action-button";
    deleteButton.dataset.aiIntegrationAction = "delete";
    deleteButton.setAttribute("aria-label", `Delete ${status.providerLabel || "AI provider"}`);
    deleteButton.title = "Delete integration";
    deleteButton.innerHTML = createIconSvg(integratedIconPaths.trash);
    quickActions.append(settingsButton, keyButton, deleteButton);
    actions.append(quickActions);

    row.append(identity, scope, apiKey, statusCell, updated, actions);
    row.addEventListener("click", (event) => {
      const action = event.target instanceof Element
        ? event.target.closest("[data-ai-integration-action]")?.dataset.aiIntegrationAction
        : "";
      if (action === "api-key") {
        event.preventDefault();
        state.imageEnhancementEditingId = status.id || "";
        state.imageEnhancementApiKeyMode = "replace";
        setImageEnhancementApiKeyModalOpen(true);
        return;
      }
      if (action === "delete") {
        event.preventDefault();
        void deleteImageEnhancementIntegration(status);
        return;
      }
      setImageEnhancementDrawerOpen(true, status.id);
    });
    row.addEventListener("keydown", (event) => {
      if (event.target instanceof Element && event.target.closest("button")) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setImageEnhancementDrawerOpen(true, status.id);
      }
    });
    return row;
  }