import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/theme/app_snack_bar.dart';

/// Public host for share links, e.g.
/// `--dart-define=SHARE_BASE_URL=https://shop.example.com`.
const _shareBaseUrlOverride = String.fromEnvironment('SHARE_BASE_URL');

const _deviceOnlyHosts = <String>{'localhost', '127.0.0.1', '10.0.2.2', '::1'};

String _stripTrailingSlash(String value) =>
    value.trim().replaceAll(RegExp(r'/+$'), '');

String shareBaseUrl() {
  final override = _shareBaseUrlOverride.trim();
  if (override.isNotEmpty) {
    return _stripTrailingSlash(override);
  }
  if (kIsWeb && Uri.base.hasScheme && Uri.base.host.isNotEmpty) {
    return Uri.base.origin;
  }
  final candidates = buildLocalApiBaseUrls(
    isAndroid: defaultTargetPlatform == TargetPlatform.android,
  );
  // Loopback and emulator hosts only resolve on this device, so prefer a
  // LAN address that other phones on the network can open.
  for (final candidate in candidates) {
    final host = Uri.tryParse(candidate)?.host ?? '';
    if (host.isNotEmpty && !_deviceOnlyHosts.contains(host)) {
      return _stripTrailingSlash(candidate);
    }
  }
  return _stripTrailingSlash(
    candidates.isNotEmpty ? candidates.first : localApiLoopbackBaseUrl,
  );
}

String listingShareUrl(String productId) =>
    '${shareBaseUrl()}/l/${Uri.encodeComponent(productId.trim())}';

String companyShareUrl(String adminId) =>
    '${shareBaseUrl()}/s/${Uri.encodeComponent(adminId.trim())}';

Future<void> _shareLink(
  BuildContext context, {
  required String url,
  required String text,
  required String subject,
}) async {
  Rect? origin;
  final box = context.findRenderObject();
  if (box is RenderBox && box.hasSize) {
    origin = box.localToGlobal(Offset.zero) & box.size;
  }
  try {
    await SharePlus.instance.share(
      ShareParams(
        text: '$text\n$url',
        subject: subject,
        sharePositionOrigin: origin,
      ),
    );
  } catch (error) {
    debugPrint('Share link failed: $error');
    if (context.mounted) {
      AppSnackBar.showError(context, message: 'Unable to open share.');
    }
  }
}

Future<void> shareListingLink(
  BuildContext context, {
  required String productId,
  required String productName,
}) {
  final name = productName.trim().isEmpty ? 'this listing' : productName.trim();
  return _shareLink(
    context,
    url: listingShareUrl(productId),
    text: 'Check out $name on Switch:',
    subject: name,
  );
}

Future<void> shareCompanyLink(
  BuildContext context, {
  required String adminId,
  required String companyName,
}) {
  final name = companyName.trim().isEmpty ? 'this store' : companyName.trim();
  return _shareLink(
    context,
    url: companyShareUrl(adminId),
    text: 'Check out $name on Switch:',
    subject: name,
  );
}
