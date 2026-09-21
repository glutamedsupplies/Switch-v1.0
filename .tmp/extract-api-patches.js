const fs = require("fs");
const path = require("path");

const root =
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts";
const outDir = "C:/Users/pc/Documents/Switch/Switch-v1.0/.tmp/api-patches";
fs.mkdirSync(outDir, { recursive: true });

const needles = [
  "handleChatWallpapersApi",
  "readChatWallpapers",
  "CHAT_WALLPAPERS_FILE",
  "biometric-settings",
  "biometric-firmware",
  "handleBiometric",
  "ai-integration",
  "handleAiIntegration",
  "ai-moderation-summary",
  "platform-settings",
  "handlePlatformSettings",
  "appendPersistentNotifications",
  "notifications/read",
  "updatePlatformFeedbackSummary",
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".jsonl")) files.push(full);
  }
  return files;
}

const files = walk(root);
let hits = 0;
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\n/).filter(Boolean);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!needles.some((n) => line.includes(n))) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type !== "tool_use") continue;
      if (!["StrReplace", "Write"].includes(part.name)) continue;
      const input = part.input || {};
      const blob = `${input.path || ""}\n${input.old_string || ""}\n${input.new_string || ""}\n${input.contents || ""}`;
      if (!needles.some((n) => blob.includes(n))) continue;
      if (!(input.path || "").includes("server.js") && !(input.contents || "").includes("handleChat")) {
        // keep server.js patches and any Write of server helpers
        if (!blob.includes("async function handleChatWallpapersApi") &&
            !blob.includes("async function handleBiometric") &&
            !blob.includes("ai-integration") &&
            !blob.includes("appendPersistentNotifications") &&
            !blob.includes("biometric-settings") &&
            !blob.includes("platform-settings")) {
          continue;
        }
      }
      hits += 1;
      const name = `${path.basename(path.dirname(file))}_${li}_${hits}.json`;
      fs.writeFileSync(
        path.join(outDir, name),
        JSON.stringify(
          {
            transcript: file,
            tool: part.name,
            path: input.path || "",
            old: input.old_string || "",
            neu: input.new_string || input.contents || "",
          },
          null,
          2,
        ),
      );
    }
  }
}
console.log("wrote", hits, "patches to", outDir);
const listed = fs.readdirSync(outDir);
for (const f of listed.slice(0, 40)) {
  const j = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  console.log(f, "len=", j.neu.length, "path=", j.path.split(/[\\/]/).pop());
}
