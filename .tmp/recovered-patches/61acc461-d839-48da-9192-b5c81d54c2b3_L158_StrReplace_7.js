    const now = new Date().toISOString();
    const initialUpdatedAt = initialIntegration.updatedAt;
    const nextRecord = normalizeAiIntegrationRecord({
      ...verifiedIntegration,
      launched: shouldLaunch,
      launchedAt: shouldLaunch ? now : "",
      verifiedAt: shouldLaunch ? now : verifiedIntegration.verifiedAt,
      updatedAt: now,
    });
    const savedSettings = await updateWorkspaceSettings((currentSettings) => {
      const currentIntegrations = Array.isArray(currentSettings.aiIntegrations)
        ? currentSettings.aiIntegrations
        : [];
      const currentIntegration = findAiIntegrationById(currentIntegrations, initialIntegration.id);
      if (!currentIntegration || currentIntegration.updatedAt !== initialUpdatedAt) {
        throw createAiIntegrationError(
          "The AI Integration changed while it was being verified. Launch it again.",
          "AI_INTEGRATION_CONFLICT",
          409,
        );
      }
      return {
        ...withWorkspaceAiIntegrations(
          currentSettings,
          replaceAiIntegrationRecord(currentIntegrations, nextRecord),
        ),
        updatedAt: now,
      };
    });
    const collection = serializeAiIntegrationCollection(savedSettings);
    const status = collection.integrations.find((item) => item.id === nextRecord.id)
      || serializeAiIntegrationStatus(nextRecord);
    sendJson(response, 200, {
      ...collection,
      ...status,
      message: status.launched
        ? `${status.providerLabel} verified and launched for the enabled AI capabilities.`
        : "AI Integration stopped.",
    });