const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.join(__dirname, "..", "..");
const DEFAULT_SKETCH_DIR = path.join(REPO_ROOT, "hardware", "gms_biometric_controller");
const DEFAULT_FQBN = String(process.env.GMS_BIOMETRIC_FQBN || "esp32:esp32:esp32s3").trim();
const COMPILE_TIMEOUT_MS = 8 * 60 * 1000;
const MAX_UPLOAD_SKETCH_BYTES = 512 * 1024;

const FLASH_ARTIFACTS = [
  { matcher: (name) => name.endsWith(".bootloader.bin"), address: 0x0 },
  { matcher: (name) => name.endsWith(".partitions.bin"), address: 0x8000 },
  {
    matcher: (name) => name === "boot_app0.bin" || name.endsWith(".boot_app0.bin"),
    address: 0xe000,
  },
  {
    // Prefer the app image only — never the huge .merged.bin full-flash image.
    matcher: (name) => name.endsWith(".ino.bin") && !name.includes("merged"),
    address: 0x10000,
  },
];

const FLASH_PACKAGE_ROOT = path.join(os.tmpdir(), "gms-biometric-flash-packages");
const FLASH_PACKAGE_TTL_MS = 2 * 60 * 60 * 1000;

const WINDOWS_ARDUINO_CLI_CANDIDATES = [
  process.env.GMS_ARDUINO_CLI,
  process.env.ARDUINO_CLI,
  "C:\\Program Files\\Arduino CLI\\arduino-cli.exe",
  path.join(process.env.LOCALAPPDATA || "", "Programs", "arduino-cli", "arduino-cli.exe"),
].filter(Boolean);

let resolvedArduinoCliPath = null;
let resolvedArduinoCliChecked = false;

async function resolveArduinoCliPath() {
  if (resolvedArduinoCliChecked) {
    return resolvedArduinoCliPath;
  }
  resolvedArduinoCliChecked = true;

  for (const candidate of WINDOWS_ARDUINO_CLI_CANDIDATES) {
    const normalized = String(candidate || "").trim();
    if (!normalized) {
      continue;
    }
    if (fs.existsSync(normalized)) {
      resolvedArduinoCliPath = normalized;
      return resolvedArduinoCliPath;
    }
  }

  try {
    const check = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(check, ["arduino-cli"], { timeout: 8000 });
    const firstLine = String(stdout || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (firstLine && fs.existsSync(firstLine)) {
      resolvedArduinoCliPath = firstLine;
      return resolvedArduinoCliPath;
    }
  } catch (error) {
    // fall through
  }

  resolvedArduinoCliPath = null;
  return resolvedArduinoCliPath;
}

async function commandExists(command) {
  if (command === "arduino-cli") {
    return Boolean(await resolveArduinoCliPath());
  }
  try {
    const check = process.platform === "win32" ? "where" : "which";
    await execFileAsync(check, [command], { timeout: 8000 });
    return true;
  } catch (error) {
    return false;
  }
}

function readProtocolVersion(sketchText) {
  const match = String(sketchText || "").match(/#define\s+DEVICE_PROTOCOL_VERSION\s+(\d+)/);
  return match ? Number(match[1]) : null;
}

function readSketchHash(sketchText) {
  return crypto
    .createHash("sha256")
    .update(String(sketchText || ""), "utf8")
    .digest("hex")
    .slice(0, 16);
}

function readSketchMetadata(sketchPath) {
  if (!fs.existsSync(sketchPath)) {
    return {
      sketchExists: false,
      sketchText: "",
      protocolVersion: null,
      sketchHash: "",
      sketchModifiedAt: null,
    };
  }
  const sketchText = fs.readFileSync(sketchPath, "utf8");
  const stats = fs.statSync(sketchPath);
  return {
    sketchExists: true,
    sketchText,
    protocolVersion: readProtocolVersion(sketchText),
    sketchHash: readSketchHash(sketchText),
    sketchModifiedAt: stats.mtime ? new Date(stats.mtime).toISOString() : null,
  };
}

function cleanupOldFlashPackages() {
  if (!fs.existsSync(FLASH_PACKAGE_ROOT)) {
    return;
  }
  const now = Date.now();
  for (const entry of fs.readdirSync(FLASH_PACKAGE_ROOT)) {
    const packageDir = path.join(FLASH_PACKAGE_ROOT, entry);
    try {
      const stats = fs.statSync(packageDir);
      if (!stats.isDirectory()) {
        continue;
      }
      if (now - stats.mtimeMs > FLASH_PACKAGE_TTL_MS) {
        fs.rmSync(packageDir, { recursive: true, force: true });
      }
    } catch (error) {
      // ignore cleanup failures
    }
  }
}

function publishFlashPackage(segments) {
  cleanupOldFlashPackages();
  const flashId = crypto.randomBytes(8).toString("hex");
  const packageDir = path.join(FLASH_PACKAGE_ROOT, flashId);
  fs.mkdirSync(packageDir, { recursive: true });
  const files = segments.map((segment) => {
    const safeName = path.basename(String(segment.name || "firmware.bin"));
    const destination = path.join(packageDir, safeName);
    fs.copyFileSync(segment.filePath, destination);
    return {
      name: safeName,
      address: segment.address,
      size: segment.size,
    };
  });
  return { flashId, files };
}

function getFlashArtifactPath(flashId, fileName) {
  const safeId = String(flashId || "").trim();
  const safeName = path.basename(String(fileName || "").trim());
  if (!/^[a-f0-9]{8,32}$/i.test(safeId) || !safeName || safeName !== String(fileName || "").trim()) {
    return null;
  }
  const filePath = path.join(FLASH_PACKAGE_ROOT, safeId, safeName);
  if (!filePath.startsWith(path.join(FLASH_PACKAGE_ROOT, safeId))) {
    return null;
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return filePath;
}

function collectFlashArtifacts(buildDir) {
  if (!fs.existsSync(buildDir)) {
    throw new Error("Build output folder was not created.");
  }
  const fileNames = fs.readdirSync(buildDir);
  const segments = [];
  for (const rule of FLASH_ARTIFACTS) {
    const fileName = fileNames.find((entry) => rule.matcher(entry));
    if (!fileName) {
      continue;
    }
    const filePath = path.join(buildDir, fileName);
    const data = fs.readFileSync(filePath);
    if (!data.length) {
      throw new Error(`Compiled artifact ${fileName} is empty.`);
    }
    segments.push({
      name: fileName,
      address: rule.address,
      size: data.length,
      filePath,
    });
  }
  if (!segments.some((entry) => entry.address === 0x10000)) {
    throw new Error("Compile finished but the main application binary (.ino.bin) was not found.");
  }
  return publishFlashPackage(segments);
}

async function compileSketchDirectory(sketchDir, options = {}) {
  const reuseCache = options.reuseCache === true;
  const buildDir = reuseCache
    ? path.join(os.tmpdir(), "gms-biometric-build-cache")
    : path.join(
      os.tmpdir(),
      `gms-biometric-build-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    );
  await fsPromises.mkdir(buildDir, { recursive: true });
  const args = [
    "compile",
    "--fqbn",
    DEFAULT_FQBN,
    "--build-path",
    buildDir,
    "--export-binaries",
    sketchDir,
  ];
  const arduinoCliPath = await resolveArduinoCliPath();
  if (!arduinoCliPath) {
    throw new Error(
      "arduino-cli is not installed on this server. Install Arduino CLI and the esp32 board core, then retry.",
    );
  }
  try {
    const { stdout, stderr } = await execFileAsync(arduinoCliPath, args, {
      timeout: COMPILE_TIMEOUT_MS,
      maxBuffer: 24 * 1024 * 1024,
      cwd: REPO_ROOT,
    });
    return {
      buildDir,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
      flashPackage: collectFlashArtifacts(buildDir),
    };
  } catch (error) {
    const stdout = String(error?.stdout || "");
    const stderr = String(error?.stderr || "");
    const detail = [stderr, stdout, error?.message]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000);
    throw new Error(detail || "Unable to compile the biometric firmware sketch.");
  }
}

async function getBiometricFirmwareToolingStatus() {
  const sketchPath = path.join(DEFAULT_SKETCH_DIR, "gms_biometric_controller.ino");
  const sketch = readSketchMetadata(sketchPath);
  const arduinoCliPath = await resolveArduinoCliPath();
  return {
    arduinoCli: Boolean(arduinoCliPath),
    arduinoCliPath: arduinoCliPath || null,
    fqbn: DEFAULT_FQBN,
    sketchPath,
    sketchExists: sketch.sketchExists,
    protocolVersion: sketch.protocolVersion,
    sketchHash: sketch.sketchHash,
    sketchModifiedAt: sketch.sketchModifiedAt,
  };
}

async function compileBiometricFirmwareFromRepo() {
  const sketchPath = path.join(DEFAULT_SKETCH_DIR, "gms_biometric_controller.ino");
  if (!fs.existsSync(sketchPath)) {
    throw new Error("Project firmware sketch was not found on the server.");
  }
  if (!(await commandExists("arduino-cli"))) {
    throw new Error(
      "arduino-cli is not installed on this server. Install Arduino CLI and the esp32 board core, then retry.",
    );
  }
  const sketchText = fs.readFileSync(sketchPath, "utf8");
  const compiled = await compileSketchDirectory(DEFAULT_SKETCH_DIR, { reuseCache: true });
  return {
    source: "repo",
    fqbn: DEFAULT_FQBN,
    protocolVersion: readProtocolVersion(sketchText),
    sketchHash: readSketchHash(sketchText),
    flashId: compiled.flashPackage.flashId,
    files: compiled.flashPackage.files,
  };
}

async function compileBiometricFirmwareFromSketchText(sketchText) {
  const normalized = String(sketchText || "");
  if (!normalized.trim()) {
    throw new Error("The uploaded sketch file is empty.");
  }
  if (Buffer.byteLength(normalized, "utf8") > MAX_UPLOAD_SKETCH_BYTES) {
    throw new Error("Keep uploaded .ino files under 512 KB.");
  }
  if (!(await commandExists("arduino-cli"))) {
    throw new Error(
      "arduino-cli is not installed on this server. Install Arduino CLI and the esp32 board core, then retry.",
    );
  }
  const workDir = path.join(
    os.tmpdir(),
    `gms-biometric-upload-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  );
  const sketchDir = path.join(workDir, "gms_biometric_controller");
  await fsPromises.mkdir(sketchDir, { recursive: true });
  await fsPromises.writeFile(path.join(sketchDir, "gms_biometric_controller.ino"), normalized, "utf8");
  const compiled = await compileSketchDirectory(sketchDir);
  return {
    source: "upload",
    fqbn: DEFAULT_FQBN,
    protocolVersion: readProtocolVersion(normalized),
    sketchHash: readSketchHash(normalized),
    flashId: compiled.flashPackage.flashId,
    files: compiled.flashPackage.files,
  };
}

module.exports = {
  getBiometricFirmwareToolingStatus,
  compileBiometricFirmwareFromRepo,
  compileBiometricFirmwareFromSketchText,
  getFlashArtifactPath,
};
