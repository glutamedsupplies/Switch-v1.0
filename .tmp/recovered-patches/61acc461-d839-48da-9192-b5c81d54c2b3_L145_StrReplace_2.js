function getAiCapabilityLabel(key) {
  if (key === "chatbot") {
    return "Chatbot & Manual AI Reply";
  }
  if (key === "autoReply") {
    return "Automatic Customer Replies";
  }
  if (key === "imageEnhancement") {
    return "Photo Enhancement";
  }
  return "AI feature";
}

function deriveAiIntegrationId(value) {
  const existingId = String(value?.id ?? "").trim();
  if (/^ai_[a-z0-9]{8,32}$/i.test(existingId)) {
    return existingId;
  }
  const provider = normalizeAiProvider(value?.provider)
    || classifyAiProviderFromApiKey(value?.apiKey);
  const fingerprint = `${provider}:${String(value?.apiKey ?? "").trim()}`;
  const digest = crypto.createHash("sha1").update(fingerprint || "ai-empty").digest("hex").slice(0, 12);
  return `ai_${digest}`;
}

function normalizeAiIntegrationRecord(value, options = {}) {
  const settings = normalizeAiIntegrationSettings(value, options);
  return {
    id: deriveAiIntegrationId({ ...value, ...settings }),
    ...settings,
  };
}

function pickPrimaryAiIntegration(integrations) {
  const records = Array.isArray(integrations) ? integrations : [];
  return records.find((item) => item?.launched && item?.apiKey)
    || records.find((item) => item?.apiKey)
    || normalizeAiIntegrationSettings(null, { managed: true });
}

function getClaimedAiCapabilityOwners(integrations, excludeId = "") {
  const claimed = {
    chatbot: null,
    autoReply: null,
    imageEnhancement: null,
  };
  for (const item of Array.isArray(integrations) ? integrations : []) {
    if (!item?.id || item.id === excludeId) {
      continue;
    }
    for (const key of AI_CAPABILITY_KEYS) {
      if (item.capabilities?.[key] && !claimed[key]) {
        claimed[key] = {
          id: item.id,
          provider: item.provider,
          providerLabel: getAiProviderLabel(item.provider),
        };
      }
    }
  }
  return claimed;
}

function assertExclusiveAiCapabilities(integrations) {
  const claimed = {};
  for (const item of Array.isArray(integrations) ? integrations : []) {
    for (const key of AI_CAPABILITY_KEYS) {
      if (!item?.capabilities?.[key]) {
        continue;
      }
      if (claimed[key] && claimed[key] !== item.id) {
        throw createAiIntegrationError(
          `${getAiCapabilityLabel(key)} is already connected to ${getAiProviderLabel(
            (integrations.find((candidate) => candidate.id === claimed[key]) || {}).provider,
          )}. Each AI feature can belong to only one provider.`,
          "AI_CAPABILITY_CLAIMED",
        );
      }
      claimed[key] = item.id;
    }
  }
  return claimed;
}

function normalizeAiIntegrationCollection(source, options = {}) {
  const rawList = [];
  if (Array.isArray(source?.aiIntegrations)) {
    rawList.push(...source.aiIntegrations);
  }
  const singleSource = source?.aiIntegration && typeof source.aiIntegration === "object"
    ? source.aiIntegration
    : source?.imageEnhancement && typeof source.imageEnhancement === "object"
      ? {
          ...source.imageEnhancement,
          managed: false,
          imageModel: source.imageEnhancement.model,
          availableImageModels: source.imageEnhancement.model
            ? [{ id: source.imageEnhancement.model, label: source.imageEnhancement.model }]
            : [],
          capabilities: {
            chatbot: false,
            autoReply: false,
            imageEnhancement: Boolean(source.imageEnhancement.apiKey),
          },
        }
      : null;
  if (singleSource?.apiKey && !rawList.length) {
    rawList.unshift(singleSource);
  }

  const records = [];
  const seenIds = new Set();
  const seenKeys = new Set();
  for (const item of rawList) {
    const record = normalizeAiIntegrationRecord(item, {
      managed: Boolean(item?.managed ?? options.managed ?? true),
    });
    if (!record.apiKey || seenIds.has(record.id)) {
      continue;
    }
    const keyFingerprint = `${record.provider}:${record.apiKey}`;
    if (seenKeys.has(keyFingerprint)) {
      continue;
    }
    seenIds.add(record.id);
    seenKeys.add(keyFingerprint);
    records.push(record);
    if (records.length >= MAX_AI_INTEGRATIONS) {
      break;
    }
  }
  assertExclusiveAiCapabilities(records);
  return records;
}

function findAiIntegrationById(integrations, idInput) {
  const id = String(idInput || "").trim();
  if (!id) {
    return null;
  }
  return (Array.isArray(integrations) ? integrations : []).find((item) => item.id === id) || null;
}

function findLaunchedAiIntegrationForCapability(integrations, capability) {
  return (Array.isArray(integrations) ? integrations : []).find((item) => (
    item?.apiKey
    && item.launched
    && item.capabilities?.[capability]
  )) || null;
}

function replaceAiIntegrationRecord(integrations, nextRecord) {
  const next = normalizeAiIntegrationRecord(nextRecord, { managed: true });
  const list = Array.isArray(integrations) ? integrations.slice() : [];
  const index = list.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    list[index] = next;
  } else {
    list.push(next);
  }
  assertExclusiveAiCapabilities(list);
  if (list.filter((item) => item.launched).length > MAX_LAUNCHED_AI_INTEGRATIONS) {
    throw createAiIntegrationError(
      `Only ${MAX_LAUNCHED_AI_INTEGRATIONS} AI integrations can be live at the same time.`,
      "AI_LAUNCH_LIMIT",
    );
  }
  return list;
}

function removeAiIntegrationRecord(integrations, idInput) {
  const id = String(idInput || "").trim();
  return (Array.isArray(integrations) ? integrations : []).filter((item) => item.id !== id);
}

function withWorkspaceAiIntegrations(currentSettings, integrations) {
  const normalized = normalizeAiIntegrationCollection(
    { aiIntegrations: integrations },
    { managed: true },
  );
  return {
    ...currentSettings,
    aiIntegrations: normalized,
    aiIntegration: pickPrimaryAiIntegration(normalized),
  };
}

function normalizeAiIntegrationSettings(value, options = {}) {