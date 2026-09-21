  try {
    await fsPromises.access(WORKSPACE_SETTINGS_FILE);
  } catch (error) {
    await fsPromises.writeFile(WORKSPACE_SETTINGS_FILE, "{}\n", "utf8");
  }

  try {
    await fsPromises.access(CHAT_WALLPAPERS_FILE);
  } catch (error) {
    await fsPromises.writeFile(CHAT_WALLPAPERS_FILE, "[]\n", "utf8");
  }
}