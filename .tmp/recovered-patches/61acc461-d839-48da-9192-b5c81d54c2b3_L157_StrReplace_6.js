  if (request.method === "GET") {
    try {
      sendJson(response, 200, serializeAiIntegrationCollection(await readWorkspaceSettings()));
    } catch (_) {
      sendJson(response, 500, { message: "Unable to load the AI Integration." });
    }
    return;
  }
  if (request.method !== "PUT" && request.method !== "PATCH" && request.method !== "DELETE") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    const rawPayload = await parseRequestBody(request);
    const initialSettings = await readWorkspaceSettings();
    const initialIntegrations = Array.isArray(initialSettings.aiIntegrations)
      ? initialSettings.aiIntegrations
      : [];
    const requestPathname = new URL(request.url, `http://127.0.0.1:${PORT}`).pathname;
    const isLegacyImageEnhancementRequest =
      requestPathname === "/api/super-admin/ai-image-enhancement";
    const targetId = String(rawPayload?.id ?? "").trim();
    const existingIntegration = findAiIntegrationById(initialIntegrations, targetId);
    const isRemove = request.method === "DELETE" || rawPayload?.remove === true || rawPayload?.clearApiKey === true;
    const payload = isLegacyImageEnhancementRequest
      ? {
          ...rawPayload,
          capabilities: {
            chatbot: existingIntegration?.capabilities.chatbot || false,
            autoReply: existingIntegration?.capabilities.autoReply || false,
            imageEnhancement: true,
          },
        }
      : rawPayload;

    if (isRemove) {
      if (targetId && !existingIntegration) {
        throw createAiIntegrationError("That AI integration was not found.", "AI_INTEGRATION_NOT_FOUND", 404);
      }
      const now = new Date().toISOString();
      const nextIntegrations = targetId
        ? removeAiIntegrationRecord(initialIntegrations, targetId)
        : [];
      const savedSettings = await updateWorkspaceSettings((currentSettings) => ({
        ...withWorkspaceAiIntegrations(currentSettings, nextIntegrations),
        updatedAt: now,
      }));
      sendJson(response, 200, {
        ...serializeAiIntegrationCollection(savedSettings),
        message: targetId ? "AI integration removed." : "AI integrations removed.",
      });
      return;
    }

    const suppliedApiKey = String(payload?.apiKey ?? "").trim();
    const isNewIntegration = !existingIntegration;
    if (isNewIntegration && initialIntegrations.length >= MAX_AI_INTEGRATIONS) {
      throw createAiIntegrationError(
        `Only ${MAX_AI_INTEGRATIONS} AI integrations can be stored.`,
        "AI_INTEGRATION_LIMIT",
      );
    }
    const sourceIntegration = existingIntegration || normalizeAiIntegrationRecord(null, { managed: true });
    const apiKey = normalizeAiIntegrationApiKey(suppliedApiKey || sourceIntegration.apiKey);
    if (!apiKey) {
      throw createAiIntegrationError("AI API key is required.", "AI_API_KEY_REQUIRED");
    }
    const duplicateKey = initialIntegrations.find((item) => (
      item.apiKey === apiKey && item.id !== sourceIntegration.id
    ));
    if (duplicateKey) {
      throw createAiIntegrationError(
        `${getAiProviderLabel(duplicateKey.provider)} already uses this API key.`,
        "AI_API_KEY_DUPLICATE",
      );
    }
    const discovery = await discoverAiProviderModels(
      apiKey,
      suppliedApiKey ? "" : sourceIntegration.provider,
    );
    const claimed = getClaimedAiCapabilityOwners(initialIntegrations, sourceIntegration.id);
    const nextIntegration = buildAiIntegrationFromDiscovery(
      isNewIntegration
        ? { provider: discovery.provider, apiKey }
        : sourceIntegration,
      discovery,
      payload,
      claimed,
    );
    const initialUpdatedAt = sourceIntegration.updatedAt;
    const savedSettings = await updateWorkspaceSettings((currentSettings) => {
      const currentIntegrations = Array.isArray(currentSettings.aiIntegrations)
        ? currentSettings.aiIntegrations
        : [];
      const currentMatch = findAiIntegrationById(currentIntegrations, sourceIntegration.id);
      if (existingIntegration && currentMatch?.updatedAt !== initialUpdatedAt) {
        throw createAiIntegrationError(
          "The AI Integration changed while it was being verified. Review it and save again.",
          "AI_INTEGRATION_CONFLICT",
          409,
        );
      }
      return {
        ...withWorkspaceAiIntegrations(
          currentSettings,
          replaceAiIntegrationRecord(currentIntegrations, nextIntegration),
        ),
        updatedAt: nextIntegration.updatedAt,
      };
    });
    sendJson(response, 200, {
      ...serializeAiIntegrationCollection(savedSettings),
      integration: serializeAiIntegrationStatus(nextIntegration),
      message: isNewIntegration
        ? `${discovery.providerLabel} is now listed in AI Integrations.`
        : `${discovery.providerLabel} integration saved. Launch it when you are ready.`,
    });
  } catch (error) {
    sendJson(response, Number(error?.statusCode) || 400, {
      code: error?.code || "AI_INTEGRATION_SAVE_FAILED",
      message: error instanceof Error ? error.message : "Unable to save the AI Integration.",
    });
  }
}