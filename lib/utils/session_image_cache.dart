import 'package:flutter/material.dart';

class SessionImageCache {
  SessionImageCache._();

  static final Set<String> _loadedUrls = <String>{};

  static String _normalizeUrl(String? imageUrl) => imageUrl?.trim() ?? '';

  static bool wasLoaded(String? imageUrl) {
    final normalizedUrl = _normalizeUrl(imageUrl);
    return normalizedUrl.isNotEmpty && _loadedUrls.contains(normalizedUrl);
  }

  static void markLoaded(String? imageUrl) {
    final normalizedUrl = _normalizeUrl(imageUrl);
    if (normalizedUrl.isNotEmpty) {
      _loadedUrls.add(normalizedUrl);
    }
  }

  static void precache(BuildContext context, String? imageUrl) {
    final normalizedUrl = _normalizeUrl(imageUrl);
    if (normalizedUrl.isEmpty || wasLoaded(normalizedUrl)) {
      return;
    }

    precacheImage(NetworkImage(normalizedUrl), context)
        .then((_) => markLoaded(normalizedUrl))
        .catchError((_) {});
  }

  static void precacheAll(BuildContext context, Iterable<String> imageUrls) {
    for (final imageUrl in imageUrls) {
      precache(context, imageUrl);
    }
  }

  static ImageLoadingBuilder loadingBuilder({
    required String imageUrl,
    Widget? loadingFallback,
  }) {
    return (context, child, loadingProgress) {
      if (loadingProgress == null) {
        markLoaded(imageUrl);
        return child;
      }

      if (wasLoaded(imageUrl)) {
        return child;
      }

      return loadingFallback ?? child;
    };
  }
}
