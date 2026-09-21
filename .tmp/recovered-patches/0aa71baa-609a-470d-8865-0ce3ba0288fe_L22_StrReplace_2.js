  try {
    await fsPromises.access(SUPER_ADMIN_NOTIFICATIONS_FILE);
  } catch (error) {
    await fsPromises.writeFile(SUPER_ADMIN_NOTIFICATIONS_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(PLATFORM_FEEDBACK_FILE);
  } catch (error) {
    await fsPromises.writeFile(PLATFORM_FEEDBACK_FILE, "[]\n", "utf8");
  }

  try {
    await fsPromises.access(ACCOUNTS_FILE);
  } catch (error) {
    await fsPromises.writeFile(ACCOUNTS_FILE, "[]\n", "utf8");
  }