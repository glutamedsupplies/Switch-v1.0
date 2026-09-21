  return {
    schemaVersion: AI_INTEGRATION_SCHEMA_VERSION,
    id: configured ? integration.id : "",
    configured,
    launched,
    provider: integration.provider,