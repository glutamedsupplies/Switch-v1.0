"use strict";

const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) {
      continue;
    }
    let value = trimmedLine.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArguments(argv) {
  const options = {
    write: false,
    filePath: path.join(__dirname, "..", "data", "accounts.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--write") {
      options.write = true;
      continue;
    }
    if (argument === "--dry-run") {
      options.write = false;
      continue;
    }
    if (argument === "--file") {
      index += 1;
      if (!argv[index]) {
        throw new Error("--file requires a path.");
      }
      options.filePath = path.resolve(argv[index]);
      continue;
    }
    if (argument.startsWith("--file=")) {
      options.filePath = path.resolve(argument.slice("--file=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

async function migrateAccountsPasswords(accounts, options = {}) {
  const { hashPassword, looksLikeBcryptHash } = options.passwordTools
    ?? require("../db/password");
  const shouldHash = options.write === true;
  const migratedAccounts = [];
  let changed = 0;
  let alreadyHashed = 0;
  let withoutPassword = 0;

  for (const account of accounts) {
    const password = typeof account?.password === "string" ? account.password : "";
    if (!password) {
      withoutPassword += 1;
      migratedAccounts.push(account);
      continue;
    }
    if (looksLikeBcryptHash(password)) {
      alreadyHashed += 1;
      migratedAccounts.push(account);
      continue;
    }

    changed += 1;
    migratedAccounts.push(
      shouldHash
        ? { ...account, password: await hashPassword(password) }
        : account,
    );
  }

  return {
    accounts: migratedAccounts,
    changed,
    alreadyHashed,
    withoutPassword,
  };
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const options = parseArguments(process.argv.slice(2));
  const raw = await fsPromises.readFile(options.filePath, "utf8");
  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts)) {
    throw new Error("Accounts JSON must contain an array.");
  }

  const result = await migrateAccountsPasswords(accounts, { write: options.write });
  const mode = options.write ? "WRITE" : "DRY RUN";
  console.log(
    `${mode}: total=${accounts.length} plaintext=${result.changed} bcrypt=${result.alreadyHashed} noPassword=${result.withoutPassword}`,
  );

  if (!options.write || result.changed === 0) {
    if (!options.write && result.changed > 0) {
      console.log("No file was changed. Re-run with --write after reviewing the counts.");
    }
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${options.filePath}.backup-${timestamp}`;
  await fsPromises.copyFile(options.filePath, backupPath, fs.constants.COPYFILE_EXCL);
  await fsPromises.writeFile(
    options.filePath,
    `${JSON.stringify(result.accounts, null, 2)}\n`,
    "utf8",
  );
  console.log(`Migrated ${result.changed} password(s). Backup: ${backupPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Password migration failed:", error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  migrateAccountsPasswords,
  parseArguments,
};
