const fs = require("fs");
const path = require("path");
const f =
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-gms-shopping-app-v1-0-gms-shopping/agent-transcripts/adbba08f-d072-475f-ae34-f13b42748091/adbba08f-d072-475f-ae34-f13b42748091.jsonl";
const txt = fs.readFileSync(f, "utf8");
const needle = "async function handlePrintWaybillsApi(request, response, options = {})";
let idx = 0;
let n = 0;
const outDir = path.join(__dirname, "waybill-recovered");
while ((idx = txt.indexOf(needle, idx)) >= 0 && n < 5) {
  // find end roughly by next async function or old_string boundary in JSON
  let end = txt.indexOf('\\nasync function ', idx + needle.length);
  if (end < 0 || end - idx > 12000) {
    end = Math.min(txt.length, idx + 8000);
  }
  let chunk = txt.slice(idx, end);
  // unescape common JSON escapes if this is inside a JSON string
  if (chunk.includes("\\n")) {
    try {
      chunk = JSON.parse(`"${chunk.replace(/^"/, "").replace(/"$/, "")}"`);
    } catch {
      chunk = chunk
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  fs.writeFileSync(path.join(outDir, `print_handler_full_${n}.js`), chunk);
  console.log("wrote", n, chunk.length);
  idx += needle.length;
  n += 1;
}
