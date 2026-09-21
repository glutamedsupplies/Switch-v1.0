  if (requestUrl.pathname === "/api/chat-wallpapers") {
    await handleChatWallpapersApi(request, response);
    return;
  }

  const chatWallpaperMatch = requestUrl.pathname.match(/^\/api\/chat-wallpapers\/([^/]+)$/);
  if (chatWallpaperMatch) {
    await handleSingleChatWallpaperApi(
      request,
      response,
      decodeURIComponent(chatWallpaperMatch[1] ?? ""),
    );
    return;
  }

  if (requestUrl.pathname === "/api/platform-feedback") {
    await handlePlatformFeedbackApi(request, response, requestUrl);
    return;
  }

  const platformFeedbackMatch = requestUrl.pathname.match(/^\/api\/platform-feedback\/([^/]+)$/);
  if (platformFeedbackMatch) {
    await handleSinglePlatformFeedbackApi(
      request,
      response,
      decodeURIComponent(platformFeedbackMatch[1] ?? ""),
    );
    return;
  }