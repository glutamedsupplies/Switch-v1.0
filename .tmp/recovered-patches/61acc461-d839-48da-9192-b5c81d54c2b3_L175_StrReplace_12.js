      const response = await fetch("/api/super-admin/ai-integration", {
        method: "PATCH",
        headers: rootHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ id: target.id, remove: true }),
      });