const fs = require("fs");
const path = require("path");

function extractPatches(transcriptPath, outDir, labelFilter) {
  const lines = fs.readFileSync(transcriptPath, "utf8").split(/\n/).filter(Boolean);
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!labelFilter.some((k) => line.includes(k))) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type !== "tool_use") continue;
      if (part.name !== "StrReplace" && part.name !== "Write") continue;
      const input = part.input || {};
      const blob = JSON.stringify(input);
      if (!labelFilter.some((k) => blob.includes(k))) continue;
      const target = String(input.path || "").replace(/\\/g, "/");
      if (!target.includes("server.js") && !target.includes("biometricFirmware") && part.name === "StrReplace") {
        // still keep if new_string has handlers
        if (!(input.new_string || "").match(/handleChat|biometric|ai-integration|platform-settings|appendPersistent|persistSuperAdmin|notifications\/read/)) continue;
      }
      n++;
      const out = path.join(outDir, `${path.basename(transcriptPath,".jsonl")}_L${i+1}_${part.name}_${n}.json`);
      fs.writeFileSync(out, JSON.stringify({
        line: i+1,
        tool: part.name,
        path: input.path,
        old_string: input.old_string || null,
        new_string: input.new_string || null,
        contents_preview: input.contents ? String(input.contents).slice(0, 500) : null,
        contents_len: input.contents ? String(input.contents).length : 0,
        new_len: input.new_string ? String(input.new_string).length : 0,
      }, null, 2));
      // also write raw new_string/contents as .js for readability
      const body = input.new_string || input.contents || "";
      if (body.length > 100) {
        fs.writeFileSync(path.join(outDir, `${path.basename(transcriptPath,".jsonl")}_L${i+1}_${part.name}_${n}.js`), body);
      }
    }
  }
  return n;
}

const outDir = "C:/Users/pc/Documents/Switch/Switch-v1.0/.tmp/recovered-patches";
fs.mkdirSync(outDir, { recursive: true });
const jobs = [
  ["C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/37da47f7-8455-4960-9133-d5fab4011162/37da47f7-8455-4960-9133-d5fab4011162.jsonl", ["CHAT_WALLPAPERS","chat-wallpapers","handleChatWallpapers"]],
  ["C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/0aa71baa-609a-470d-8865-0ce3ba0288fe/0aa71baa-609a-470d-8865-0ce3ba0288fe.jsonl", ["handleChatWallpapers","handleSingleChatWallpaper","PLATFORM_FEEDBACK","appendPersistent","persistSuperAdmin"]],
  ["C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/f29ba028-f104-4ee4-8834-bf04cad58b6d/f29ba028-f104-4ee4-8834-bf04cad58b6d.jsonl", ["biometric-firmware","biometric-settings","BIOMETRIC","handleBiometric","compileFirmware"]],
  ["C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/adbba08f-d072-475f-ae34-f13b42748091/adbba08f-d072-475f-ae34-f13b42748091.jsonl", ["persistSuperAdmin","appendPersistent","notifications/read","writeSuperAdminNotifications","readSuperAdminNotifications"]],
  ["C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/61acc461-d839-48da-9192-b5c81d54c2b3/61acc461-d839-48da-9192-b5c81d54c2b3.jsonl", ["ai-integration","ai-moderation","AI_INTEGRATION"]],
];
for (const [f, keys] of jobs) {
  const n = extractPatches(f, outDir, keys);
  console.log(path.basename(f), "extracted", n);
}
console.log("files:", fs.readdirSync(outDir).length);
