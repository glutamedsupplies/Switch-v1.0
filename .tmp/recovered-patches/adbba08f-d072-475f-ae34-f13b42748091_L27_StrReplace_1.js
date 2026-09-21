    if (!adminId || isSuperAdminActivityActor(entry)) {
      return;
    }

    const accounts = await readAccounts();
    const account = findAdminAccountByScopeId(accounts, adminId)
      || findAdminAccountByScopeId(accounts, entry?.actor?.adminId)
      || findAdminAccountByScopeId(accounts, entry?.actor?.accountId);
    if (!account) {
      return;
    }

    if (isSellerProfileUpdateForSuperAdmin(entry)) {
      await persistSuperAdminNotification(getLinkedSuperAdminNotificationFromProfileActivity(entry, account));
      return;
    }

    if (!isSellerListingConnectedToSuperAdmin(entry)) {
      return;
    }
    if (
      !isSellerWorkspaceActivityActor(entry)
      && String(entry?.action ?? "").trim().toLowerCase() !== "created"
    ) {
      return;
    }

    await persistSuperAdminNotification(getLinkedSuperAdminNotificationFromActivity(entry, account));