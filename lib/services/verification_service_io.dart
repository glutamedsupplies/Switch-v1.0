import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/local_api_base_urls.dart';
import 'package:gms_shopping/services/verification_service_base.dart';

VerificationService createVerificationService({String? baseUrl}) {
  return _HttpVerificationService(
    baseUrls: buildLocalApiBaseUrls(
      baseUrl: baseUrl,
      isAndroid: Platform.isAndroid,
    ),
  );
}

class _HttpVerificationService implements VerificationService {
  _HttpVerificationService({required this.baseUrls});

  final List<String> baseUrls;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 10);

  Future<Map<String, dynamic>> _postJson(
    String path,
    Map<String, dynamic> payload,
  ) async {
    Object? lastError;

    for (final baseUrl in baseUrls) {
      try {
        final request = await _client.postUrl(Uri.parse('$baseUrl$path'));
        request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.write(jsonEncode(payload));

        final response = await request.close().timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Request timed out'),
        );
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return decoded;
        }

        throw VerificationException(
          decoded['message']?.toString() ?? 'Verification request failed.',
        );
      } on VerificationException {
        rethrow;
      } on SocketException catch (error) {
        lastError = error;
      } on TimeoutException catch (error) {
        lastError = error;
      } on HttpException catch (error) {
        lastError = error;
      } on FormatException catch (error) {
        lastError = error;
      }
    }

    throw VerificationException(
      lastError == null
          ? 'Unable to connect to server.'
          : 'Unable to connect to server. Please try again.',
    );
  }

  Map<String, dynamic> _channelPayload({
    required String purpose,
    required String channel,
    required String email,
    required String mobileNumber,
    String? code,
  }) {
    final normalizedChannel =
        channel.trim().toLowerCase() == 'mobile' ? 'mobile' : 'email';
    final trimmedEmail = email.trim();
    final trimmedMobile = mobileNumber.trim();
    final target =
        normalizedChannel == 'mobile' ? trimmedMobile : trimmedEmail;

    return <String, dynamic>{
      'purpose': purpose,
      'channel': normalizedChannel,
      'email': trimmedEmail,
      if (trimmedMobile.isNotEmpty) 'mobileNumber': trimmedMobile,
      'target': target,
      if (code != null) 'code': code.trim(),
    };
  }

  @override
  Future<VerificationSendResult> sendVerificationCode({
    required String purpose,
    required String channel,
    String email = '',
    String mobileNumber = '',
  }) async {
    final payload = _channelPayload(
      purpose: purpose,
      channel: channel,
      email: email,
      mobileNumber: mobileNumber,
    );
    final decoded = await _postJson('/api/auth/verification/send', payload);

    DateTime? parseDate(Object? value) {
      final raw = value?.toString().trim() ?? '';
      if (raw.isEmpty) return null;
      return DateTime.tryParse(raw)?.toLocal();
    }

    final cooldownRaw = decoded['resendCooldownSeconds'];
    final cooldownSeconds = cooldownRaw is num
        ? cooldownRaw.round()
        : int.tryParse(cooldownRaw?.toString() ?? '');

    return VerificationSendResult(
      channel: decoded['channel']?.toString() ?? channel,
      target: decoded['target']?.toString() ??
          (payload['target']?.toString() ?? ''),
      debugCode: decoded['debugCode']?.toString(),
      expiresAt: parseDate(decoded['expiresAt']),
      createdAt: parseDate(decoded['createdAt']),
      resendAvailableAt: parseDate(decoded['resendAvailableAt']),
      resendCooldownSeconds: cooldownSeconds,
    );
  }

  @override
  Future<VerificationVerifyResult> verifyVerificationCode({
    required String purpose,
    required String channel,
    required String code,
    String email = '',
    String mobileNumber = '',
  }) async {
    final payload = _channelPayload(
      purpose: purpose,
      channel: channel,
      email: email,
      mobileNumber: mobileNumber,
      code: code,
    );
    final decoded = await _postJson('/api/auth/verification/verify', payload);

    final token = decoded['verificationToken']?.toString() ?? '';
    if (token.isEmpty) {
      throw const VerificationException('Invalid verification response.');
    }

    return VerificationVerifyResult(
      verificationToken: token,
      channel: decoded['channel']?.toString() ?? channel,
      target: decoded['target']?.toString() ??
          (payload['target']?.toString() ?? ''),
    );
  }
}
