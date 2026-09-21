    } finally {
      state.imageEnhancementSaving = false;
      syncImageEnhancementIntegrationUi();
    }
  }

  async function deleteImageEnhancementIntegration(status) {
    const target = normalizeImageEnhancementIntegrationStatus(status);
    if (!target.id) {
      return;
    }
    const confirmed = await confirmDeleteValidationModal(
      "Delete AI integration",
      `Remove ${target.providerLabel || "this AI provider"} from AI Integrations? Its connected features will become available to another provider.`,
    );
    if (!confirmed) {
      return;
    }
    state.imageEnhancementSaving = true;
    setImageEnhancementBusyState();
    try {
      const response = await fetch("/api/super-admin/ai-integration", {
        method: "DELETE",
        headers: rootHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ id: target.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to delete the AI integration.");
      }
      if (state.imageEnhancementEditingId === target.id) {
        closeImageEnhancementDrawer({ restoreFocus: false });
        state.imageEnhancementEditingId = "";
      }
      applyAiIntegrationCollection(data, { persist: true });
      state.imageEnhancementSettingsDirty = false;
      setImageEnhancementTableFeedback("");
      syncImageEnhancementIntegrationUi();
      void showSuccessValidationModal(
        "AI Integration Removed",
        data.message || `${target.providerLabel || "The AI provider"} has been removed.`,
      );
    } catch (error) {
      setImageEnhancementTableFeedback(
        error instanceof Error ? error.message : "Unable to delete the AI integration.",
      );
    } finally {
      state.imageEnhancementSaving = false;
      syncImageEnhancementIntegrationUi();
    }
  }

  function isPaymentPartnerApiKeyModalVisible() {