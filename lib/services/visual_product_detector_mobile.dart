import 'dart:io';
import 'dart:typed_data';

import 'visual_product_detector_io.dart';
import 'visual_product_detector_stub.dart';
import 'visual_product_detector_stub.dart' as fallback;

export 'visual_product_detector_stub.dart' show VisualProductDetectionResult;

Future<VisualProductDetectionResult> prepareVisualSearchImage({
  required String imagePath,
  required Uint8List imageBytes,
  required String filename,
}) {
  if (Platform.isAndroid || Platform.isIOS) {
    return prepareMobileVisualSearchImage(
      imagePath: imagePath,
      imageBytes: imageBytes,
      filename: filename,
    );
  }

  return fallback.prepareVisualSearchImage(
    imagePath: imagePath,
    imageBytes: imageBytes,
    filename: filename,
  );
}
