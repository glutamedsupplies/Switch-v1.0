      if (backfill.length) {
        inbox = [...backfill, ...inbox];
        await writeSuperAdminNotifications(inbox);
      }
      const feedbackEntries = await readPlatformFeedback();
      inbox = await syncHandledSuperAdminNotifications(inbox, {
        pendingProductIds: notificationProducts.map((product) =>
          String(product?.id ?? product?.productId ?? "").trim(),
        ).filter(Boolean),
        feedbackEntries,
      });
      sendJson(response, 200, {
        products: notificationProducts,
        notifications: inbox,
        total: inbox.length,
      });