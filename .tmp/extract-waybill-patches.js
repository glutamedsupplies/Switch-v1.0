const fs = require("fs");
const path = require("path");

const files = [
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/7b397f7c-c9c9-4dc7-9096-4e07e4b1cf54/7b397f7c-c9c9-4dc7-9096-4e07e4b1cf54.jsonl",
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/adbba08f-d072-475f-ae34-f13b42748091/adbba08f-d072-475f-ae34-f13b42748091.jsonl",
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/1ad295e6-d2d7-4145-a4a9-633d641a020d/1ad295e6-d2d7-4145-a4a9-633d641a020d.jsonl",
];

const outDir = path.join(__dirname, "waybill-recovered");
fs.mkdirSync(outDir, { recursive: true });

let n = 0;
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log("missing", f);
    continue;
  }
  const lines = fs.readFileSync(f, "utf8").split(/\n/).filter(Boolean);
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
      if (!/waybill/i.test(neu)) continue;
      const interesting =
        /server\.js/i.test(pth)
        || /handleOrdersWaybill|\/api\/orders\/waybills\/print|function buildWaybill|renderWaybill/i.test(neu);
      if (!interesting) continue;
      const name = `${path.basename(path.dirname(f))}_${n}.js`;
      fs.writeFileSync(path.join(outDir, name), neu);
      console.log(
        name,
        "len",
        neu.length,
        "path",
        pth.slice(-50),
        "fns",
        (neu.match(/function \w+/g) || []).slice(0, 10).join(","),
      );
      n += 1;
    }
  }
}
console.log("total", n);
