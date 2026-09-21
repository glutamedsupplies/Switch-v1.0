const fs = require("fs");
const p =
  "C:/Users/pc/.cursor/projects/c-Users-pc-Documents-Switch-Switch-v1-0/agent-transcripts/dc645f5a-93f8-4b6d-973f-787a369f3438/dc645f5a-93f8-4b6d-973f-787a369f3438.jsonl";
const lines = fs.readFileSync(p, "utf8").split("\n");
for (const line of lines) {
  if (!line.includes("md-site-footer__social-btn--facebook") || !line.includes("mdIgGrad")) {
    continue;
  }
  const o = JSON.parse(line);
  for (const part of o.message?.content || []) {
    if (part.type === "tool_use" && part.input?.new_string?.includes("mdIgGrad")) {
      fs.writeFileSync(
        "backend/public/_branded_social_snippet.html",
        part.input.new_string,
      );
      console.log("found StrReplace new_string", part.input.new_string.length);
      process.exit(0);
    }
    if (part.type === "tool_use" && part.input?.contents?.includes("mdIgGrad")) {
      fs.writeFileSync(
        "backend/public/_branded_social_snippet.html",
        part.input.contents,
      );
      console.log("found Write contents", part.input.contents.length);
      process.exit(0);
    }
  }
}
console.log("not found via that filter");
