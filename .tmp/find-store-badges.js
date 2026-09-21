const fs = require("fs");
const p =
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-Switch-Switch-v1-0/agent-transcripts/dc645f5a-93f8-4b6d-973f-787a369f3438/dc645f5a-93f8-4b6d-973f-787a369f3438.jsonl";
const lines = fs.readFileSync(p, "utf8").split("\n");
let n = 0;
for (const line of lines) {
  if (!line.includes("EA4335") || !line.includes("google-play")) continue;
  const o = JSON.parse(line);
  for (const part of o.message?.content || []) {
    const blob =
      part.input?.new_string ||
      part.input?.contents ||
      part.input?.command ||
      "";
    if (
      typeof blob === "string" &&
      blob.includes("EA4335") &&
      blob.includes("AppGallery") === false &&
      blob.includes("md-store-badge")
    ) {
      fs.writeFileSync(`backend/public/_store_snippet_${n}.html`, blob.slice(0, 8000));
      console.log("wrote", n, blob.length);
      n += 1;
    }
  }
}
console.log("total", n);
