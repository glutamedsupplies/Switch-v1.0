import 'dart:typed_data';

class VisualProductDetectionResult {
  const VisualProductDetectionResult({
    required this.imageBytes,
    required this.filename,
    required this.usedDetection,
    this.label = '',
    this.confidence = 0,
    this.originalImageBytes,
  });

  /// Cropped bytes used to identify the listing class.
  final Uint8List imageBytes;
  final String filename;
  final bool usedDetection;
  final String label;
  final double confidence;

  /// Full camera frame (optional) for review context.
  final Uint8List? originalImageBytes;
}

Future<VisualProductDetectionResult> prepareVisualSearchImage({
  required String imagePath,
  required Uint8List imageBytes,
  required String filename,
}) async {
  return VisualProductDetectionResult(
    imageBytes: imageBytes,
    filename: filename.trim().isEmpty ? 'camera.jpg' : filename,
    usedDetection: false,
    originalImageBytes: imageBytes,
  );
}
