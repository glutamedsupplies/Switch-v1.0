import 'dart:typed_data';

class VisualProductDetectionResult {
  const VisualProductDetectionResult({
    required this.imageBytes,
    required this.filename,
    required this.usedDetection,
    this.label = '',
  });

  final Uint8List imageBytes;
  final String filename;
  final bool usedDetection;
  final String label;
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
  );
}
