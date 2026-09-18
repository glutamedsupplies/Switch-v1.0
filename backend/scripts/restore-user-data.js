const fs = require("fs");
const path = require("path");

const dataDir = path.resolve(__dirname, "..", "data");
const accountsPath = path.join(dataDir, "accounts.json");
const backupPath = path.join(dataDir, "accounts.json.bak-1787044666440.json");

function readAccountList(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path.basename(filePath)} does not contain an account list.`);
  }
  return parsed;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isAppUser(account) {
  const role = normalize(account?.role);
  return normalize(account?.source) === "app"
    && ["user", "buyer", "customer"].includes(role);
}

function getBuyerIdentityKeys(account) {
  return [
    ["id", account?.id],
    ["account", account?.accountId],
    ["user", account?.userId],
    ["code", account?.accountCode],
    ["email", account?.email],
    ["mobile", account?.mobileNumber],
  ]
    .map(([kind, value]) => {
      const normalized = normalize(value);
      return normalized ? `${kind}:${normalized}` : "";
    })
    .filter(Boolean);
}

const currentAccounts = readAccountList(accountsPath);
const backupAccounts = readAccountList(backupPath);
const currentBuyerKeys = new Set(
  currentAccounts
    .filter(isAppUser)
    .flatMap(getBuyerIdentityKeys),
);
const recoveredUsers = [];

for (const account of backupAccounts.filter(isAppUser)) {
  const keys = getBuyerIdentityKeys(account);
  if (keys.some((key) => currentBuyerKeys.has(key))) {
    continue;
  }
  recoveredUsers.push(account);
  keys.forEach((key) => currentBuyerKeys.add(key));
}

if (!recoveredUsers.length) {
  console.log("No missing app users found; accounts.json was left unchanged.");
  process.exit(0);
}

const snapshotPath = path.join(
  dataDir,
  `accounts.json.pre-user-data-restore-${Date.now()}.json`,
);
fs.copyFileSync(accountsPath, snapshotPath, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(
  accountsPath,
  `${JSON.stringify([...currentAccounts, ...recoveredUsers], null, 2)}\n`,
  "utf8",
);

console.log(`Recovered ${recoveredUsers.length} app users.`);
console.log(`Current accounts preserved: ${currentAccounts.length}.`);
console.log(`Safety snapshot: ${path.basename(snapshotPath)}.`);
