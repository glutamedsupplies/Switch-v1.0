  if (requestUrl.pathname === "/api/super-admin/biometric-settings") {
    await handleSuperAdminBiometricSettingsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/super-admin/biometric-firmware/compile") {
    await handleSuperAdminBiometricFirmwareApi(request, response);
    return;
  }