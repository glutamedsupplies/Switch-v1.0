  if (requestUrl.pathname === "/api/store-types") {
    await handleStoreTypesApi(request, response);
    return;
  }

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