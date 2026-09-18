const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const FACE_ORDER = Object.freeze(["front", "right", "back", "left", "top", "bottom"]);
const TEXTURE_MAX_SIZE = 1280;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = nextValue;
    index += 1;
  }
  return args;
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
}

function alignBufferLength(length) {
  return (4 - (length % 4)) % 4;
}

function padBuffer(buffer, padValue = 0) {
  const padding = alignBufferLength(buffer.length);
  if (!padding) {
    return buffer;
  }
  return Buffer.concat([buffer, Buffer.alloc(padding, padValue)]);
}

function createFloat32Buffer(values) {
  return Buffer.from(new Float32Array(values).buffer);
}

function createUint16Buffer(values) {
  return Buffer.from(new Uint16Array(values).buffer);
}

function getVectorBounds(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = values[index + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max };
}

function sanitizeFileStem(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "six-frame-product";
}

function parseCropSpec(value) {
  const parts = String(value ?? "")
    .split(",")
    .map((part) => Math.round(Number(part.trim())));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [left, top, width, height] = parts;
  if (left < 0 || top < 0 || width <= 0 || height <= 0) {
    return null;
  }

  return { left, top, width, height };
}

async function clampCropToImage(inputPath, requestedCrop) {
  if (!requestedCrop) {
    return null;
  }

  const metadata = await sharp(inputPath).rotate().metadata();
  const imageWidth = Math.max(1, Number(metadata.width || 1));
  const imageHeight = Math.max(1, Number(metadata.height || 1));
  const left = Math.min(imageWidth - 1, requestedCrop.left);
  const top = Math.min(imageHeight - 1, requestedCrop.top);
  const width = Math.max(1, Math.min(requestedCrop.width, imageWidth - left));
  const height = Math.max(1, Math.min(requestedCrop.height, imageHeight - top));
  return { left, top, width, height };
}

function isProductYellowPixel(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max > 0 ? (max - min) / max : 0;
  const yellowLead = (red + green) / 2 - blue;

  return (
    red > 75
    && green > 70
    && blue < 160
    && yellowLead > 18
    && saturation > 0.16
  );
}

async function detectProductCrop(inputPath) {
  const { data, info } = await sharp(inputPath)
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];

      if (!isProductYellowPixel(red, green, blue)) {
        continue;
      }

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return {
      left: 0,
      top: 0,
      width: info.width,
      height: info.height,
    };
  }

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const marginX = Math.max(18, Math.round(cropWidth * 0.035));
  const marginY = Math.max(18, Math.round(cropHeight * 0.055));
  const cropLeft = Math.max(0, left - marginX);
  const cropTop = Math.max(0, top - marginY);
  const cropRight = Math.min(info.width - 1, right + marginX);
  const cropBottom = Math.min(info.height - 1, bottom + marginY);

  return {
    left: cropLeft,
    top: cropTop,
    width: cropRight - cropLeft + 1,
    height: cropBottom - cropTop + 1,
  };
}

async function prepareTexture(face, inputPath, outputDirectory, fileStem, cropOverride = null) {
  const crop = await clampCropToImage(inputPath, cropOverride) || await detectProductCrop(inputPath);
  const textureFileName = `${fileStem}-${face}.jpg`;
  const texturePath = path.join(outputDirectory, textureFileName);
  const image = sharp(inputPath).rotate().extract(crop);
  const textureBuffer = await image
    .clone()
    .resize({
      width: TEXTURE_MAX_SIZE,
      height: TEXTURE_MAX_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 90,
      mozjpeg: true,
    })
    .toBuffer();
  await fs.writeFile(texturePath, textureBuffer);
  const metadata = await sharp(textureBuffer).metadata();

  return {
    face,
    inputPath,
    texturePath,
    textureBuffer,
    crop,
    width: metadata.width || crop.width,
    height: metadata.height || crop.height,
    cropWidth: crop.width,
    cropHeight: crop.height,
  };
}

function getModelDimensions(textureByFace) {
  const front = textureByFace.front;
  const right = textureByFace.right;
  const top = textureByFace.top;
  const frontAspect = front?.cropWidth && front?.cropHeight
    ? front.cropWidth / front.cropHeight
    : 1.55;
  const rightAspect = right?.cropWidth && right?.cropHeight
    ? right.cropWidth / right.cropHeight
    : 0.5;
  const topAspect = top?.cropWidth && top?.cropHeight
    ? top.cropWidth / top.cropHeight
    : 4.6;

  const height = 2;
  const width = clampNumber(frontAspect * height, 1.1, 3.2);
  const sideDepth = clampNumber(rightAspect * height, 0.35, 1.4);
  const topDepth = topAspect > 0 ? clampNumber(width / topAspect, 0.35, 1.4) : sideDepth;
  const depth = clampNumber((sideDepth * 0.45) + (topDepth * 0.55), 0.35, 1.4);

  return { width, height, depth };
}

function createBoxGeometry(textureByFace) {
  const { width, height, depth } = getModelDimensions(textureByFace);
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const faceDefinitions = [
    {
      key: "front",
      normal: [0, 0, 1],
      vertices: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]],
    },
    {
      key: "right",
      normal: [1, 0, 0],
      vertices: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]],
    },
    {
      key: "back",
      normal: [0, 0, -1],
      vertices: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
    },
    {
      key: "left",
      normal: [-1, 0, 0],
      vertices: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]],
    },
    {
      key: "top",
      normal: [0, 1, 0],
      vertices: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]],
    },
    {
      key: "bottom",
      normal: [0, -1, 0],
      vertices: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]],
    },
  ];

  const positions = [];
  const normals = [];
  const texcoords = [];
  const indices = [];

  for (const face of faceDefinitions) {
    const baseIndex = positions.length / 3;
    for (const vertex of face.vertices) {
      positions.push(...vertex);
      normals.push(...face.normal);
    }
    texcoords.push(0, 1, 1, 1, 1, 0, 0, 0);
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
  }

  return {
    dimensions: { width, height, depth },
    faceDefinitions,
    positions,
    normals,
    texcoords,
    indices,
  };
}

function createBufferBuilder() {
  const chunks = [];
  const bufferViews = [];
  let byteLength = 0;

  function append(buffer, target = undefined) {
    const offsetPadding = alignBufferLength(byteLength);
    if (offsetPadding) {
      chunks.push(Buffer.alloc(offsetPadding));
      byteLength += offsetPadding;
    }

    const byteOffset = byteLength;
    const paddedBuffer = padBuffer(buffer);
    chunks.push(paddedBuffer);
    byteLength += paddedBuffer.length;

    const bufferView = {
      buffer: 0,
      byteOffset,
      byteLength: buffer.length,
    };
    if (target) {
      bufferView.target = target;
    }
    bufferViews.push(bufferView);
    return bufferViews.length - 1;
  }

  return {
    append,
    bufferViews,
    toBuffer: () => Buffer.concat(chunks),
  };
}

function createGlb(textureRecords, fileStem) {
  const textureByFace = Object.fromEntries(textureRecords.map((record) => [record.face, record]));
  const geometry = createBoxGeometry(textureByFace);
  const builder = createBufferBuilder();
  const positionBufferView = builder.append(createFloat32Buffer(geometry.positions), 34962);
  const normalBufferView = builder.append(createFloat32Buffer(geometry.normals), 34962);
  const texcoordBufferView = builder.append(createFloat32Buffer(geometry.texcoords), 34962);
  const indexBufferView = builder.append(createUint16Buffer(geometry.indices), 34963);
  const imageBufferViews = textureRecords.map((record) => builder.append(record.textureBuffer));
  const positionBounds = getVectorBounds(geometry.positions);
  const accessors = [
    {
      bufferView: positionBufferView,
      componentType: 5126,
      count: geometry.positions.length / 3,
      type: "VEC3",
      min: positionBounds.min,
      max: positionBounds.max,
    },
    {
      bufferView: normalBufferView,
      componentType: 5126,
      count: geometry.normals.length / 3,
      type: "VEC3",
    },
    {
      bufferView: texcoordBufferView,
      componentType: 5126,
      count: geometry.texcoords.length / 2,
      type: "VEC2",
    },
  ];

  for (let faceIndex = 0; faceIndex < geometry.faceDefinitions.length; faceIndex += 1) {
    accessors.push({
      bufferView: indexBufferView,
      byteOffset: faceIndex * 6 * 2,
      componentType: 5123,
      count: 6,
      type: "SCALAR",
    });
  }

  const gltf = {
    asset: {
      version: "2.0",
      generator: "Switch six-frame GLB generator",
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        mesh: 0,
        name: `${fileStem} textured product box`,
      },
    ],
    meshes: [
      {
        name: "Six-frame textured cuboid",
        primitives: geometry.faceDefinitions.map((face, index) => ({
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2,
          },
          indices: 3 + index,
          material: index,
          mode: 4,
        })),
      },
    ],
    materials: geometry.faceDefinitions.map((face, index) => ({
      name: `${face.key} photo`,
      pbrMetallicRoughness: {
        baseColorTexture: { index },
        metallicFactor: 0,
        roughnessFactor: 0.72,
      },
      doubleSided: true,
    })),
    textures: textureRecords.map((_, index) => ({ source: index })),
    images: imageBufferViews.map((bufferView) => ({
      bufferView,
      mimeType: "image/jpeg",
    })),
    buffers: [
      {
        byteLength: builder.toBuffer().length,
      },
    ],
    bufferViews: builder.bufferViews,
    accessors,
    extras: {
      dimensions: geometry.dimensions,
      faceOrder: geometry.faceDefinitions.map((face) => face.key),
    },
  };

  return buildGlb(gltf, builder.toBuffer());
}

function buildGlb(gltf, binaryChunk) {
  const jsonBuffer = padBuffer(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
  const binBuffer = padBuffer(binaryChunk);
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer], totalLength);
}

async function writePreviewHtml({ outputPath, modelUrl, fileStem }) {
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${fileStem} GLB Preview</title>
    <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
    <style>
      html,
      body {
        height: 100%;
        margin: 0;
        background: #f4f4f1;
        font-family: Arial, sans-serif;
      }

      model-viewer {
        display: block;
        width: 100%;
        height: 100%;
        background: #f4f4f1;
      }
    </style>
  </head>
  <body>
    <model-viewer
      src="${modelUrl}"
      camera-controls
      auto-rotate
      shadow-intensity="0.7"
      exposure="1"
      ar
    ></model-viewer>
  </body>
</html>
`;
  await fs.writeFile(outputPath, previewHtml, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const missingFace = FACE_ORDER.find((face) => !args[face]);
  if (missingFace) {
    throw new Error(`Missing --${missingFace} image path.`);
  }

  const fileStem = sanitizeFileStem(args.name || "six-frame-product");
  const outputPath = path.resolve(args.out || `backend/public/uploads/${fileStem}.glb`);
  const outputDirectory = path.dirname(outputPath);
  const textureDirectory = path.resolve(args["texture-dir"] || path.join(outputDirectory, `${fileStem}-textures`));
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(textureDirectory, { recursive: true });

  const textureRecords = [];
  for (const face of FACE_ORDER) {
    const inputPath = path.resolve(args[face]);
    textureRecords.push(await prepareTexture(
      face,
      inputPath,
      textureDirectory,
      fileStem,
      parseCropSpec(args[`${face}-crop`]),
    ));
  }

  const glbBuffer = createGlb(textureRecords, fileStem);
  await fs.writeFile(outputPath, glbBuffer);

  const publicRoot = path.resolve("backend/public");
  const relativeOutput = path.relative(publicRoot, outputPath).replace(/\\/g, "/");
  const modelUrl = relativeOutput.startsWith("..") ? outputPath : `/${relativeOutput}`;
  const previewOutputPath = path.join(outputDirectory, `${fileStem}-preview.html`);
  const relativePreview = path.relative(publicRoot, previewOutputPath).replace(/\\/g, "/");
  const previewUrl = relativePreview.startsWith("..") ? previewOutputPath : `/${relativePreview}`;
  await writePreviewHtml({
    outputPath: previewOutputPath,
    modelUrl,
    fileStem,
  });

  console.log(JSON.stringify({
    modelPath: outputPath,
    modelUrl,
    previewPath: previewOutputPath,
    previewUrl,
    textures: textureRecords.map((record) => ({
      face: record.face,
      texturePath: record.texturePath,
      crop: record.crop,
      width: record.width,
      height: record.height,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
