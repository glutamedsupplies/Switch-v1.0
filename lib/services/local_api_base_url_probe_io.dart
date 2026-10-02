import 'dart:async';
import 'dart:io';

import 'package:switch_app/services/local_api_base_urls.dart';

const _probePath = '/api/workspace-theme';
const _probeTimeout = Duration(seconds: 3);

Future<String?>? _ongoingProbe;

/// Races every local backend candidate at once and remembers the first one
/// that answers, so sequential callers never wait on unreachable LAN or
/// emulator addresses one by one.
Future<String?> resolveWorkingLocalApiBaseUrl() {
  final known = preferredLocalApiBaseUrl;
  if (known != null) {
    return Future<String?>.value(known);
  }
  return _ongoingProbe ??= _probeCandidates().whenComplete(() {
    _ongoingProbe = null;
  });
}

Future<String?> _probeCandidates() async {
  final baseUrls = buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);
  if (baseUrls.isEmpty) {
    return null;
  }

  final client = HttpClient()..connectionTimeout = _probeTimeout;
  final completer = Completer<String?>();
  var remaining = baseUrls.length;

  for (final baseUrl in baseUrls) {
    unawaited(() async {
      try {
        final request = await client
            .getUrl(Uri.parse('$baseUrl$_probePath'))
            .timeout(_probeTimeout);
        final response = await request.close().timeout(_probeTimeout);
        await response.drain<void>();
        if (response.statusCode == HttpStatus.ok && !completer.isCompleted) {
          rememberWorkingLocalApiBaseUrl(baseUrl);
          completer.complete(baseUrl);
        }
      } catch (_) {
        // Unreachable candidate.
      } finally {
        remaining -= 1;
        if (remaining == 0 && !completer.isCompleted) {
          completer.complete(null);
        }
      }
    }());
  }

  try {
    return await completer.future;
  } finally {
    client.close(force: true);
  }
}
