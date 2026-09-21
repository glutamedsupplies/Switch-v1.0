import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _requestTimeout = Duration(seconds: 8);
const _clientKeyPrefs = 'search_client_key';

class TrendingSearchTerm {
  const TrendingSearchTerm({
    required this.id,
    required this.term,
    this.hitCount = 0,
    this.isManual = false,
  });

  final String id;
  final String term;
  final int hitCount;
  final bool isManual;

  factory TrendingSearchTerm.fromJson(Map<String, dynamic> json) {
    return TrendingSearchTerm(
      id: (json['id'] ?? '').toString(),
      term: (json['term'] ?? '').toString(),
      hitCount: int.tryParse('${json['hitCount'] ?? 0}') ?? 0,
      isManual: json['isManual'] == true,
    );
  }
}

Future<String> resolveSearchClientKey() async {
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_clientKeyPrefs)?.trim() ?? '';
  if (existing.isNotEmpty) {
    return existing;
  }
  final generated =
      'app_${DateTime.now().millisecondsSinceEpoch}_${prefs.hashCode.abs()}';
  await prefs.setString(_clientKeyPrefs, generated);
  return generated;
}

final HttpClient _client = HttpClient();

Future<T?> _tryEachBaseUrl<T>(
  Future<T?> Function(String baseUrl) work,
) async {
  for (final baseUrl in buildLocalApiBaseUrls(isAndroid: Platform.isAndroid)) {
    try {
      final result = await work(baseUrl);
      if (result != null) {
        rememberWorkingLocalApiBaseUrl(baseUrl);
        return result;
      }
    } on SocketException {
      // Try next candidate.
    } on TimeoutException {
      // Try next candidate.
    } on HttpException {
      // Try next candidate.
    } catch (_) {
      // Try next candidate.
    }
  }
  return null;
}

Future<String> resolveBuyerRecentSearchesKey({String platformId = ''}) async {
  final accountId = await AuthSession.getAccountId();
  final base = accountId != null && accountId.trim().isNotEmpty
      ? 'recent_searches_${accountId.trim()}'
      : 'recent_searches';
  final scoped = platformId.trim().toLowerCase();
  if (scoped.isEmpty) return base;
  return '${base}_p_$scoped';
}

Future<List<TrendingSearchTerm>> fetchTrendingSearches({
  int limit = 12,
  String platformId = '',
}) async {
  final result = await _tryEachBaseUrl((baseUrl) async {
    final query = <String, String>{'limit': '$limit'};
    final scopedPlatform = platformId.trim().toLowerCase();
    if (scopedPlatform.isNotEmpty) {
      query['platformId'] = scopedPlatform;
    }
    final uri = Uri.parse('$baseUrl/api/trending-searches').replace(
      queryParameters: query,
    );
    final request = await _client.getUrl(uri).timeout(_requestTimeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final response = await request.close().timeout(_requestTimeout);
    final body = await response.transform(utf8.decoder).join();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }
    final decoded = body.isEmpty
        ? const <String, dynamic>{}
        : jsonDecode(body) as Map<String, dynamic>;
    final raw = decoded['trending'];
    if (raw is! List) {
      return const <TrendingSearchTerm>[];
    }
    return raw
        .whereType<Map>()
        .map(
          (item) => TrendingSearchTerm.fromJson(
            Map<String, dynamic>.from(item),
          ),
        )
        .where((item) => item.term.trim().isNotEmpty)
        .toList(growable: false);
  });
  return result ?? const <TrendingSearchTerm>[];
}

Future<void> recordBuyerSearchEvent(
  String term, {
  String platformId = '',
  String category = '',
  String storeType = '',
}) async {
  final trimmed = term.trim();
  if (trimmed.isEmpty) {
    return;
  }

  final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
  final clientKey = await resolveSearchClientKey();
  final client = Platform.isAndroid
      ? 'android'
      : Platform.isIOS
          ? 'ios'
          : 'app';

  await _tryEachBaseUrl((baseUrl) async {
    final request = await _client
        .postUrl(Uri.parse('$baseUrl/api/search-events'))
        .timeout(_requestTimeout);
    request.headers.contentType = ContentType.json;
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    request.write(
      jsonEncode(<String, dynamic>{
        'term': trimmed,
        'accountId': accountId,
        'clientKey': clientKey,
        'client': client,
        'platformId': platformId.trim(),
        'category': category.trim(),
        'storeType': storeType.trim(),
      }),
    );
    final response = await request.close().timeout(_requestTimeout);
    await response.drain<void>();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }
    return true;
  });
}
