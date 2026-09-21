    if (!waybills.length) {
      sendJson(response, 400, {
        message: "No eligible waybill orders were found for printing.",
      });
      return;
    }

    if (previewOnly) {
      sendJson(response, 200, {
        waybills,
        preview: true,
        previewCount: waybills.length,
        createdAtEpochMsList: waybills.map((entry) => entry.createdAtEpochMs),
      });
      return;
    }

    await writeOrders(nextOrders);