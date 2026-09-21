  if (requestUrl.pathname === "/api/super-admin/product-requests") {
    await handleSuperAdminProductRequestsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin/notifications/read") {
    await handleSuperAdminNotificationsReadApi(request, response);
    return;
  }

  const superAdminAdminActivityMatch = requestUrl.pathname.match(