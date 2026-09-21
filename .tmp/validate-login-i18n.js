const fs = require("fs");
const s = fs.readFileSync("backend/public/login.js", "utf8");
const start = s.indexOf("const loginTranslations = {");
const end = s.indexOf("\n};\n\nfunction t(", start);
if (start < 0 || end < 0) {
  console.error("block not found");
  process.exit(1);
}
const block = s.slice(start, end + 3);
const loginTranslations = new Function(`${block}; return loginTranslations;`)();
const expected = ["en","zh","es","hi","ar","fr","pt","ru","ja","de","ko","vi","id","tl","th"];
const codes = Object.keys(loginTranslations);
console.log("langs", codes.length, codes.join(","));
if (codes.join(",") !== expected.join(",")) {
  console.error("unexpected language order/codes");
  process.exit(1);
}
const enKeys = Object.keys(loginTranslations.en);
for (const code of codes) {
  const miss = enKeys.filter((k) => !(k in loginTranslations[code]));
  const extra = Object.keys(loginTranslations[code]).filter((k) => !enKeys.includes(k));
  if (miss.length || extra.length) {
    console.error(code, { miss, extra });
    process.exit(1);
  }
}
console.log("keys", enKeys.length, "all packs ok");
