(() => {
  const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
  let scriptPromise = null;
  let cachedClientId = "";

  function loadGisScript() {
    if (window.google?.accounts?.oauth2) {
      return Promise.resolve();
    }
    if (scriptPromise) {
      return scriptPromise;
    }

    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Unable to load Google Identity Services.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load Google Identity Services."));
      document.head.appendChild(script);
    });

    return scriptPromise;
  }

  async function fetchGoogleClientId() {
    if (cachedClientId) {
      return cachedClientId;
    }
    const response = await fetch("/api/auth/google/config", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.clientId) {
      throw new Error(
        data.message ||
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend/.env.",
      );
    }
    cachedClientId = String(data.clientId).trim();
    return cachedClientId;
  }

  async function verifyGoogleAccessToken(accessToken) {
    const response = await fetch("/api/auth/google/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ accessToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to verify Google account.");
    }
    return {
      accessToken,
      idToken: "",
      ...(data.profile || {}),
    };
  }

  function requestGoogleAccessToken(clientId) {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          prompt: "select_account",
          callback: (response) => {
            if (response?.error) {
              reject(
                new Error(
                  response.error_description ||
                    response.error ||
                    "Google sign-in failed.",
                ),
              );
              return;
            }
            const accessToken = String(response?.access_token || "").trim();
            if (!accessToken) {
              reject(new Error("Google sign-in did not return an access token."));
              return;
            }
            resolve(accessToken);
          },
          error_callback: (error) => {
            const message = String(error?.message || error?.type || "").trim();
            if (/popup_closed|closed/i.test(message)) {
              reject(new Error("Google sign-in was cancelled."));
              return;
            }
            reject(
              new Error(message || "Google sign-in failed."),
            );
          },
        });

        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Unable to start Google sign-in."),
        );
      }
    });
  }

  async function signInWithGoogle() {
    const clientId = await fetchGoogleClientId();
    await loadGisScript();
    const accessToken = await requestGoogleAccessToken(clientId);
    return verifyGoogleAccessToken(accessToken);
  }

  window.SwitchGoogleAuth = {
    signInWithGoogle,
    fetchGoogleClientId,
    verifyGoogleAccessToken,
  };
})();
