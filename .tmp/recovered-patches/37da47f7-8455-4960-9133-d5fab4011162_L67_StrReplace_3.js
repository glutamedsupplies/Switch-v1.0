async function writeWorkspaceSettings(settings) {
  await ensureStoragePaths();
  const normalizedSettings = normalizeWorkspaceSettings(settings);
  await writeJsonFileAtomically(WORKSPACE_SETTINGS_FILE, normalizedSettings);
  return normalizedSettings;
}

function normalizeChatWallpaperSrc(value) {
  const src = String(value || "").trim();
  if (!src.startsWith("/uploads/") || src.includes("..") || src.includes("\\") || src.includes("://")) {
    return "";
  }
  const fileName = path.posix.basename(src);
  if (!fileName || fileName === "uploads") {
    return "";
  }
  return `/uploads/${fileName}`;
}

function normalizeChatWallpaperLabel(value, fallback = "Background") {
  const label = String(value || "").replace(/\s+/g, " ").trim().slice(0, 48);
  return label || fallback;
}

function normalizeChatWallpaperRecord(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const src = normalizeChatWallpaperSrc(value.src);
  const id = String(value.id || "").trim();
  if (!src || !/^wp_[a-z0-9]+$/i.test(id)) {
    return null;
  }
  return {
    id,
    label: normalizeChatWallpaperLabel(value.label),
    src,
    createdAt: String(value.createdAt || "").trim() || new Date().toISOString(),
  };
}

function normalizeChatWallpaperCollection(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const wallpapers = [];
  for (const item of source) {
    const wallpaper = normalizeChatWallpaperRecord(item);
    if (!wallpaper || seen.has(wallpaper.id)) {
      continue;
    }
    seen.add(wallpaper.id);
    wallpapers.push(wallpaper);
    if (wallpapers.length >= MAX_CHAT_WALLPAPERS) {
      break;
    }
  }
  return wallpapers;
}

async function readChatWallpapers() {
  await ensureStoragePaths();
  try {
    const raw = await fsPromises.readFile(CHAT_WALLPAPERS_FILE, "utf8");
    return normalizeChatWallpaperCollection(JSON.parse(raw));
  } catch (error) {
    return [];
  }
}

async function writeChatWallpapers(wallpapers) {
  await ensureStoragePaths();
  const normalized = normalizeChatWallpaperCollection(wallpapers);
  await writeJsonFileAtomically(CHAT_WALLPAPERS_FILE, normalized);
  return normalized;
}

function updateChatWallpapers(mutator) {
  return enqueueSerializedMutation("chat-wallpapers", async () => {
    const current = await readChatWallpapers();
    const next = typeof mutator === "function" ? await mutator(current) : current;
    return writeChatWallpapers(next);
  });
}

async function deleteChatWallpaperUpload(src) {
  const normalizedSrc = normalizeChatWallpaperSrc(src);
  if (!normalizedSrc) {
    return;
  }
  const filePath = path.join(UPLOADS_DIR, path.posix.basename(normalizedSrc));
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return;
  }
  await fsPromises.unlink(filePath).catch(() => {});
}