import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:google_mlkit_object_detection/google_mlkit_object_detection.dart';
import 'package:image/image.dart' as img;

import 'visual_product_detector_stub.dart';

Future<VisualProductDetectionResult> prepareMobileVisualSearchImage({
  required String imagePath,
  required Uint8List imageBytes,
  required String filename,
}) async {
  final normalizedFilename = filename.trim().isEmpty ? 'camera.jpg' : filename;
  if ((!Platform.isAndroid && !Platform.isIOS) || imagePath.trim().isEmpty) {
    return VisualProductDetectionResult(
      imageBytes: imageBytes,
      filename: normalizedFilename,
      usedDetection: false,
    );
  }

  final decodedImage = img.decodeImage(imageBytes);
  if (decodedImage == null) {
    return VisualProductDetectionResult(
      imageBytes: imageBytes,
      filename: normalizedFilename,
      usedDetection: false,
    );
  }

  final orientedImage = img.bakeOrientation(decodedImage);
  final objectDetector = ObjectDetector(
    options: ObjectDetectorOptions(
      mode: DetectionMode.single,
      classifyObjects: true,
      multipleObjects: true,
    ),
  );

  try {
    final inputImage = InputImage.fromFilePath(imagePath);
    final detectedObjects = await objectDetector.processImage(inputImage);
    final detectedObject = _chooseProductObject(
      detectedObjects,
      orientedImage.width,
      orientedImage.height,
    );

    if (detectedObject == null) {
      return VisualProductDetectionResult(
        imageBytes: imageBytes,
        filename: normalizedFilename,
        usedDetection: false,
      );
    }

    final cropRect = _buildCropRect(
      detectedObject.boundingBox,
      orientedImage.width,
      orientedImage.height,
    );
    if (cropRect == null) {
      return VisualProductDetectionResult(
        imageBytes: imageBytes,
        filename: normalizedFilename,
        usedDetection: false,
      );
    }

    final croppedImage = img.copyCrop(
      orientedImage,
      x: cropRect.x,
      y: cropRect.y,
      width: cropRect.width,
      height: cropRect.height,
    );
    final croppedBytes = Uint8List.fromList(img.encodeJpg(croppedImage, quality: 88));
    final label = _bestObjectLabel(detectedObject);

    return VisualProductDetectionResult(
      imageBytes: croppedBytes,
      filename: _detectedFilename(normalizedFilename),
      usedDetection: true,
      label: label,
    );
  } catch (_) {
    return VisualProductDetectionResult(
      imageBytes: imageBytes,
      filename: normalizedFilename,
      usedDetection: false,
    );
  } finally {
    await objectDetector.close();
  }
}

DetectedObject? _chooseProductObject(
  List<DetectedObject> objects,
  int imageWidth,
  int imageHeight,
) {
  if (objects.isEmpty || imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }

  final imageArea = imageWidth * imageHeight;
  final centerX = imageWidth / 2;
  final centerY = imageHeight / 2;
  DetectedObject? bestObject;
  var bestScore = double.negativeInfinity;

  for (final object in objects) {
    final rect = object.boundingBox;
    final width = rect.width;
    final height = rect.height;
    if (width < 32 || height < 32) {
      continue;
    }

    final areaRatio = (width * height) / imageArea;
    if (areaRatio < 0.02) {
      continue;
    }

    final labelConfidence = _bestObjectConfidence(object);
    final objectCenterX = rect.left + width / 2;
    final objectCenterY = rect.top + height / 2;
    final centerDistance = math.sqrt(
      math.pow((objectCenterX - centerX) / imageWidth, 2) +
          math.pow((objectCenterY - centerY) / imageHeight, 2),
    );
    final score = labelConfidence + math.min(areaRatio, 0.55) * 0.7 - centerDistance * 0.24;

    if (score > bestScore) {
      bestScore = score;
      bestObject = object;
    }
  }

  return bestObject;
}

_ImageCropRect? _buildCropRect(Rect boundingBox, int imageWidth, int imageHeight) {
  final padding = math.max(boundingBox.width, boundingBox.height) * 0.16;
  final left = _clampDouble(boundingBox.left - padding, 0, imageWidth - 1).round();
  final top = _clampDouble(boundingBox.top - padding, 0, imageHeight - 1).round();
  final right = _clampDouble(boundingBox.right + padding, left + 1, imageWidth).round();
  final bottom = _clampDouble(boundingBox.bottom + padding, top + 1, imageHeight).round();
  final width = right - left;
  final height = bottom - top;

  if (width < 32 || height < 32) {
    return null;
  }

  return _ImageCropRect(x: left, y: top, width: width, height: height);
}

double _bestObjectConfidence(DetectedObject object) {
  if (object.labels.isEmpty) {
    return 0.55;
  }

  return object.labels
      .map((label) => label.confidence)
      .fold<double>(0, (best, confidence) => math.max(best, confidence));
}

String _bestObjectLabel(DetectedObject object) {
  if (object.labels.isEmpty) {
    return '';
  }

  final labels = object.labels.toList()
    ..sort((first, second) => second.confidence.compareTo(first.confidence));
  return labels.first.text;
}

String _detectedFilename(String filename) {
  final dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0) {
    return 'detected-$filename.jpg';
  }

  return '${filename.substring(0, dotIndex)}-detected.jpg';
}

double _clampDouble(double value, num min, num max) {
  return math.min(math.max(value, min.toDouble()), max.toDouble());
}

class _ImageCropRect {
  const _ImageCropRect({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  final int x;
  final int y;
  final int width;
  final int height;
}
