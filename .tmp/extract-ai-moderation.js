const fs = require("fs");
const path = require("path");

const roots = [
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts",
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-Switch-Switch-v1-0/agent-transcripts",
];

function walk(d, o = []) {
  if (!fs.existsSync(d)) return o;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o);
    else if (e.name.endsWith(".jsonl")) o.push(p);
  }
  return o;
}

const out = path.join(__dirname, "ai-moderation-recovered");
fs.mkdirSync(out, { recursive: true });
let n = 200;

for (const root of roots) {
  for (const f of walk(root)) {
    const txt = fs.readFileSync(f, "utf8");
    if (
      !txt.includes("ai-moderation-summary")
      && !txt.includes("handleAiModeration")
      && !txt.includes("data-super-admin-ban-summarize-ai")
    ) {
      continue;
    }
    const lines = txt.split(/\n/).filter(Boolean);
    for (const line of lines) {
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
        if (part.name !== "StrReplace" && part.name !== "Write") continue;
        const neu = String(part.input?.new_string || part.input?.contents || "");
        const pth = String(part.input?.path || "");
        const interesting =
          /ai-moderation-summary|handleAiModeration|data-super-admin-ban-summarize-ai|summarizeModerationDescription|callLaunchedAi|openai\.com\/v1\/chat/.test(
            neu,
          );
        if (!interesting || neu.length < 180) continue;
        const name = `patch_${n}.js`;
        fs.writeFileSync(path.join(out, name), neu);
        console.log(
          name,
          neu.length,
          pth.slice(-55),
          (neu.match(/async function \w+|function \w+/g) || []).slice(0, 8).join(","),
        );
        n += 1;
      }
    }
  }
}
console.log("total", n - 200);
