import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class PickedPhoto {
  const PickedPhoto(this.bytes, this.contentType);

  final Uint8List bytes;
  final String contentType;
}

String _contentTypeFor(XFile file) {
  final declared = file.mimeType ?? '';
  if (declared.startsWith('image/')) return declared;
  final name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

/// Lets the rider take or choose a photo. Proof photos should pass
/// `cameraOnly: true` so they are captured on the spot.
Future<PickedPhoto?> pickPhoto(BuildContext context, {bool cameraOnly = false}) async {
  ImageSource? source = ImageSource.camera;
  if (!cameraOnly) {
    source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }
  if (source == null) return null;
  final file = await ImagePicker().pickImage(source: source, maxWidth: 1800, maxHeight: 1800, imageQuality: 82);
  if (file == null) return null;
  return PickedPhoto(await file.readAsBytes(), _contentTypeFor(file));
}
