const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
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
  { matcher: (name) => name.endsWith(".boot_app0.bin"), address: 0xe000 },
  {
    matcher: (name) =>
      name.endsWith(".bin")
      && !name.includes("bootloader")
      && !name.includes("partitions")
      && !name.includes("boot_app0"),
    address: 0x10000,
  },
];

async function commandExists(command) {
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
    segments.push({
      name: fileName,
      address: rule.address,
      size: data.length,
      base64: data.toString("base64"),
    });
  }
  if (!segments.some((entry) => entry.address === 0x10000)) {
    throw new Error("Compile finished but the main application binary was not found.");
  }
  return segments;
}

async function compileSketchDirectory(sketchDir) {
  const buildDir = path.join(
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
  try {
    const { stdout, stderr } = await execFileAsync("arduino-cli", args, {
      timeout: COMPILE_TIMEOUT_MS,
      maxBuffer: 24 * 1024 * 1024,
      cwd: REPO_ROOT,
    });
    return {
      buildDir,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
      files: collectFlashArtifacts(buildDir),
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
  const sketchExists = fs.existsSync(sketchPath);
  const sketchText = sketchExists ? fs.readFileSync(sketchPath, "utf8") : "";
  return {
    arduinoCli: await commandExists("arduino-cli"),
    fqbn: DEFAULT_FQBN,
    sketchPath,
    sketchExists,
    protocolVersion: readProtocolVersion(sketchText),
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
  const compiled = await compileSketchDirectory(DEFAULT_SKETCH_DIR);
  return {
    source: "repo",
    fqbn: DEFAULT_FQBN,
    protocolVersion: readProtocolVersion(sketchText),
    files: compiled.files,
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
    files: compiled.files,
  };
}

module.exports = {
  getBiometricFirmwareToolingStatus,
  compileBiometricFirmwareFromRepo,
  compileBiometricFirmwareFromSketchText,
};
