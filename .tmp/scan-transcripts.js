const fs = require("fs");
const path = require("path");
const roots = [
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts",
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-Switch-Switch-v1-0/agent-transcripts",
];
const keys = [
  "chat-wallpapers","handleChatWallpapers","CHAT_WALLPAPERS",
  "biometric-settings","BIOMETRIC_SETTINGS","handleBiometric",
  "biometric-firmware","ai-integration","ai-moderation-summary",
  "platform-settings","PLATFORM_SETTINGS","notifications/read",
  "appendPersistentNotifications","persistSuperAdminNotification",
  "SUPER_ADMIN_NOTIFICATIONS_FILE","product-requests"
];
function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const p = path.join(dir,e.name);
    if (e.isDirectory()) walk(p,out);
    else if (e.name.endsWith(".jsonl")) out.push(p);
  }
  return out;
}
const hits = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const lines = fs.readFileSync(file,"utf8").split(/\n/);
    lines.forEach((line,i) => {
      if (!line.includes("server.js")) return;
      if (!keys.some(k => line.includes(k))) return;
      if (!(line.includes("StrReplace") || line.includes('"Write"'))) return;
      const parts = file.split(/agent-transcripts[\\/]/);
      const tid = parts[1] ? parts[1].split(/[\\/]/)[0] : path.basename(file);
      hits.push({tid, file, line:i+1, len: line.length, keys: keys.filter(k=>line.includes(k))});
    });
  }
}
hits.sort((a,b)=>b.len-a.len);
console.log("HIT COUNT", hits.length);
for (const h of hits.slice(0,50)) console.log(JSON.stringify(h));
