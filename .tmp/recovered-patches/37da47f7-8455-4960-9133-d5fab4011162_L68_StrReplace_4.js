  sendJson(response, 403, {
    message: "Business type management is available in Super Admin only.",
  });
}

async function handleChatWallpapersApi(request, response) {
  if (request.method === "GET") {
    try {
      sendJson(response, 200, {
        wallpapers: await readChatWallpapers(),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load chat backgrounds.",
      });
    }
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  if (!requireSuperAdmin(request, response)) {
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const src = normalizeChatWallpaperSrc(payload?.src);
    if (!src) {
      sendJson(response, 400, { message: "Upload a wallpaper image first." });
      return;
    }
    const label = normalizeChatWallpaperLabel(
      payload?.label,
      path.posix.basename(src, path.extname(src)).replace(/-\d+$/, "") || "Background",
    );
    let created = null;
    const wallpapers = await updateChatWallpapers((current) => {
      if (current.length >= MAX_CHAT_WALLPAPERS) {
        throw createHttpError(`You can add up to ${MAX_CHAT_WALLPAPERS} chat backgrounds.`, 400);
      }
      created = {
        id: `wp_${crypto.randomBytes(6).toString("hex")}`,
        label,
        src,
        createdAt: new Date().toISOString(),
      };
      return [...current, created];
    });
    sendJson(response, 201, {
      wallpaper: created,
      wallpapers,
      message: "Chat background added.",
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400
      ? error.statusCode
      : 400;
    sendJson(response, statusCode, {
      message: error instanceof Error ? error.message : "Unable to save chat background.",
    });
  }
}

async function handleSingleChatWallpaperApi(request, response, wallpaperId) {
  if (request.method !== "DELETE") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  if (!requireSuperAdmin(request, response)) {
    return;
  }

  const id = String(wallpaperId || "").trim();
  if (!/^wp_[a-z0-9]+$/i.test(id)) {
    sendJson(response, 400, { message: "Invalid chat background." });
    return;
  }

  try {
    let removed = null;
    const wallpapers = await updateChatWallpapers((current) => {
      removed = current.find((item) => item.id === id) || null;
      return current.filter((item) => item.id !== id);
    });
    if (!removed) {
      sendJson(response, 404, { message: "Chat background not found." });
      return;
    }
    const stillUsed = wallpapers.some((item) => item.src === removed.src);
    if (!stillUsed) {
      await deleteChatWallpaperUpload(removed.src);
    }
    sendJson(response, 200, {
      wallpapers,
      message: "Chat background removed.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error ? error.message : "Unable to remove chat background.",
    });
  }
}