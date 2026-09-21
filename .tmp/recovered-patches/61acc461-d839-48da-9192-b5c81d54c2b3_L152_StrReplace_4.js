  const capabilities = getRequestedAiCapabilityFlags(
    payload,
    currentIntegration,
    discovery,
    claimed,
  );
  const credentialsOrRuntimeChanged =
    currentIntegration.apiKey !== discovery.apiKey
    || currentIntegration.provider !== discovery.provider
    || currentIntegration.chatModel !== chatModel
    || currentIntegration.imageModel !== imageModel
    || Object.keys(capabilities).some(
      (key) => currentIntegration.capabilities[key] !== capabilities[key],
    );
  const now = new Date().toISOString();
  return normalizeAiIntegrationRecord({
    id: currentIntegration.id,
    schemaVersion: AI_INTEGRATION_SCHEMA_VERSION,
    managed: true,
    provider: discovery.provider,
    apiKey: discovery.apiKey,
    chatModel,
    imageModel,
    availableChatModels: discovery.availableChatModels,
    availableImageModels: discovery.availableImageModels,
    capabilities,
    launched: credentialsOrRuntimeChanged ? false : currentIntegration.launched,
    launchedAt: credentialsOrRuntimeChanged ? "" : currentIntegration.launchedAt,
    detectionSource: discovery.detectionSource,
    verifiedAt: now,
    updatedAt: now,
  });
}

function serializeAiIntegrationStatus(settingsOrIntegration) {
  const rawIntegration = settingsOrIntegration?.aiIntegration
    ?? (settingsOrIntegration?.id || settingsOrIntegration?.apiKey ? settingsOrIntegration : null)
    ?? pickPrimaryAiIntegration(settingsOrIntegration?.aiIntegrations);
  const integration = normalizeAiIntegrationRecord(rawIntegration);