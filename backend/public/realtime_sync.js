(function () {
  "use strict";

  if (window.GMSRealtimeSync) {
    window.GMSRealtimeSync.restart?.();
    return;
  }

  const endpoint = "/api/realtime/events";
  const reconnectMinDelayMs = 1_000;
  const reconnectMaxDelayMs = 15_000;
  let abortController = null;
  let reconnectTimer = 0;
  let connectionGeneration = 0;
  let reconnectDelayMs = reconnectMinDelayMs;
  let hasConnectedOnce = false;
  let connectionStatus = "idle";

  function isRealtimeDataSyncEnabled() {
    return window.GMSPlatformSettings?.realtimeDataSync !== false;
  }

  function normalize(value) {
    return String(value ?? "").trim();
  }

  function readSession(key) {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function getSessionAdminId(session) {
    return normalize(
      session?.adminId
      ?? session?.tenantId
      ?? session?.workspaceId
      ?? session?.ownerAdminId
      ?? session?.storeAdminId
      ?? session?.admin?.adminId
      ?? session?.admin?.id,
    );
  }

  function getConnectionIdentity() {
    const superAdminToken = normalize(readSession("gms-super-admin-session")?.token);
    if (superAdminToken) {
      return {
        key: `super-admin:${superAdminToken}`,
        headers: { "X-GMS-Super-Admin-Token": superAdminToken },
        role: "super-admin",
        adminId: "",
      };
    }

    const employeeAdminId = getSessionAdminId(readSession("gms-employee-session"));
    const adminId = employeeAdminId || getSessionAdminId(readSession("gms-admin-session"));
    let storedAdminId = "";
    try {
      storedAdminId = normalize(window.localStorage.getItem("gms-admin-id"));
    } catch (error) {
      storedAdminId = "";
    }
    const resolvedAdminId = adminId || storedAdminId;
    if (!resolvedAdminId) {
      return null;
    }

    return {
      key: `admin-seller:${resolvedAdminId}`,
      headers: { "X-GMS-Admin-ID": resolvedAdminId },
      role: "admin-seller",
      adminId: resolvedAdminId,
    };
  }

  function emitStatus(status, detail = {}) {
    connectionStatus = status;
    window.dispatchEvent(new CustomEvent("gms:realtime-status", {
      detail: { status, ...detail },
    }));
  }

  function dispatchRealtimeChange(targetWindow, detail, visited = new Set()) {
    if (!targetWindow || visited.has(targetWindow)) {
      return;
    }
    visited.add(targetWindow);
    try {
      targetWindow.dispatchEvent(new targetWindow.CustomEvent("gms:realtime-change", { detail }));
      const frames = targetWindow.document?.querySelectorAll?.("iframe") || [];
      frames.forEach((frame) => {
        try {
          dispatchRealtimeChange(frame.contentWindow, detail, visited);
        } catch (error) {
          // Ignore cross-origin or currently navigating child frames.
        }
      });
    } catch (error) {
      // Ignore a child frame that navigated while the event was being relayed.
    }
  }

  function emitRealtimeEvent(eventName, payload) {
    const detail = payload && typeof payload === "object" ? { ...payload } : {};
    if (eventName === "ready") {
      detail.type = "ready";
      detail.reconnected = hasConnectedOnce;
      hasConnectedOnce = true;
      if (!isRealtimeDataSyncEnabled()) {
        emitStatus("paused", { reason: "platform-setting" });
        return;
      }
    } else if (!isRealtimeDataSyncEnabled()) {
      const topics = Array.isArray(detail.topics) ? detail.topics : [];
      if (!topics.includes("settings")) {
        return;
      }
    }
    dispatchRealtimeChange(window, detail);
  }

  function parseEventBlock(block) {
    const lines = String(block || "").split("\n");
    let eventName = "message";
    const dataLines = [];
    for (const line of lines) {
      if (!line || line.startsWith(":")) {
        continue;
      }
      const separatorIndex = line.indexOf(":");
      const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
      const value = separatorIndex >= 0
        ? line.slice(separatorIndex + 1).replace(/^ /, "")
        : "";
      if (field === "event") {
        eventName = value || "message";
      } else if (field === "data") {
        dataLines.push(value);
      }
    }
    if (!dataLines.length) {
      return;
    }
    try {
      emitRealtimeEvent(eventName, JSON.parse(dataLines.join("\n")));
    } catch (error) {
      console.warn("Ignored an invalid real-time update.", error);
    }
  }

  async function readEventStream(response, generation) {
    if (!response.body?.getReader) {
      throw new Error("Streaming responses are not supported by this browser.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (generation === connectionGeneration) {
      const result = await reader.read();
      if (result.done) {
        throw new Error("The real-time connection closed.");
      }
      buffer += decoder.decode(result.value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex >= 0) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        parseEventBlock(block);
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  }

  function clearReconnectTimer() {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = 0;
  }

  function scheduleReconnect(generation) {
    if (generation !== connectionGeneration || reconnectTimer || !navigator.onLine) {
      return;
    }
    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectMaxDelayMs, Math.round(reconnectDelayMs * 1.8));
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = 0;
      void connect(generation);
    }, delay);
  }

  async function connect(generation) {
    if (generation !== connectionGeneration || !navigator.onLine) {
      return;
    }
    const identity = getConnectionIdentity();
    if (!identity) {
      emitStatus("waiting-for-session");
      scheduleReconnect(generation);
      return;
    }

    abortController?.abort();
    abortController = new AbortController();
    emitStatus("connecting", { role: identity.role, adminId: identity.adminId });
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "text/event-stream",
          ...identity.headers,
        },
        signal: abortController.signal,
      });
      if (!response.ok) {
        throw new Error(`Real-time connection failed (${response.status}).`);
      }
      reconnectDelayMs = reconnectMinDelayMs;
      emitStatus("connected", { role: identity.role, adminId: identity.adminId });
      await readEventStream(response, generation);
    } catch (error) {
      if (generation !== connectionGeneration || error?.name === "AbortError") {
        return;
      }
      emitStatus("reconnecting", {
        role: identity.role,
        adminId: identity.adminId,
        message: error instanceof Error ? error.message : "Real-time connection interrupted.",
      });
      scheduleReconnect(generation);
    }
  }

  function restart() {
    connectionGeneration += 1;
    clearReconnectTimer();
    abortController?.abort();
    abortController = null;
    reconnectDelayMs = reconnectMinDelayMs;
    void connect(connectionGeneration);
  }

  function stop() {
    connectionGeneration += 1;
    clearReconnectTimer();
    abortController?.abort();
    abortController = null;
    emitStatus("stopped");
  }

  window.GMSRealtimeSync = Object.freeze({
    restart,
    stop,
    getStatus: () => connectionStatus,
  });

  window.addEventListener("online", restart);
  window.addEventListener("offline", () => {
    abortController?.abort();
    emitStatus("offline");
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      restart();
    }
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      stop();
    }
  });
  window.addEventListener("gms-admin-session-updated", restart);
  window.addEventListener("gms-employee-session-updated", restart);
  window.addEventListener("gms:platform-settings-changed", () => {
    if (isRealtimeDataSyncEnabled()) {
      restart();
    } else {
      emitStatus("paused", { reason: "platform-setting" });
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "gms-admin-id") {
      restart();
    }
  });

  restart();
}());
