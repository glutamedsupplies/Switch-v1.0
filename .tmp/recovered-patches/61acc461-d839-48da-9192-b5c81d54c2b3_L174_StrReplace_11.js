      const response = await fetch("/api/super-admin/ai-integration/detect", {
        method: "POST",
        headers: rootHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(
          state.imageEnhancementApiKeyMode === "replace" && state.imageEnhancementEditingId
            ? { id: state.imageEnhancementEditingId, apiKey }
            : { apiKey },
        ),
      });