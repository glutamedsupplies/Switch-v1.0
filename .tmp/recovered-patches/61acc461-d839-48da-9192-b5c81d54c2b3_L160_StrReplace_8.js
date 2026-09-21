  return normalizeAiIntegrationRecord({
    id: currentIntegration.apiKey
      ? currentIntegration.id
      : deriveAiIntegrationId({ provider: discovery.provider, apiKey: discovery.apiKey }),
    schemaVersion: AI_INTEGRATION_SCHEMA_VERSION,