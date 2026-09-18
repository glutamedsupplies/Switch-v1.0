import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/local_api_base_urls.dart';
import 'package:gms_shopping/services/platform_feedback_service_base.dart';

const _requestTimeout = Duration(seconds: 10);
const _uploadTimeout = Duration(minutes: 2);

PlatformFeedbackService createPlatformFeedbackService() =>
    _IoPlatformFeedbackService(buildLocalApiBaseUrls(isAndroid: Platform.isAndroid));

class _IoPlatformFeedbackService implements PlatformFeedbackService {
  _IoPlatformFeedbackService(this._baseUrls);

  final List<String> _baseUrls;
  final HttpClient _client = HttpClient();

  @override
  Future<PlatformFeedbackResult> submitUserFeedback({
    required String accountId,
    required String email,
    required int rating,
    required String message,
    List<PlatformFeedbackAttachmentUpload> attachments = const [],
  }) async {
    var receivedServerResponse = false;

    for (final baseUrl in _baseUrls) {
      try {
        final uploadedAttachments = <Map<String, dynamic>>[];
        for (final attachment in attachments) {
          uploadedAttachments.add(
            await _uploadAttachment(
              baseUrl: baseUrl,
              accountId: accountId,
              email: email,
              attachment: attachment,
            ),
          );
        }

        final payload = jsonEncode(<String, dynamic>{
          'type': 'user',
          'accountId': accountId.trim(),
          'email': email.trim(),
          'rating': rating,
          'message': message.trim(),
          'attachments': uploadedAttachments,
        });
        final request = await _client
            .postUrl(Uri.parse('$baseUrl/api/platform-feedback'))
            .timeout(_requestTimeout);
        request.headers.contentType = ContentType.json;
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.write(payload);

        final response = await request.close().timeout(_requestTimeout);
        receivedServerResponse = true;
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;

        if (response.statusCode == HttpStatus.ok ||
            response.statusCode == HttpStatus.created) {
          return PlatformFeedbackResult.success(
            decoded['message']?.toString() ??
                'Thanks! Your feedback was sent to Super Admin.',
          );
        }

        return PlatformFeedbackResult.failure(
          decoded['message']?.toString() ?? 'Unable to send feedback.',
        );
      } on SocketException {
        // Try the next local address.
      } on TimeoutException {
        // Try the next local address.
      } on HttpException {
        // Try the next address.
      } on _PlatformFeedbackServerException catch (error) {
        return PlatformFeedbackResult.failure(error.message);
      } on FormatException {
        return PlatformFeedbackResult.failure(
          'The server returned an invalid response.',
        );
      }
    }

    return PlatformFeedbackResult.failure(
      receivedServerResponse
          ? 'Unable to send feedback. Please try again.'
          : 'Cannot reach the backend. Check that it is running.',
    );
  }

  Future<Map<String, dynamic>> _uploadAttachment({
    required String baseUrl,
    required String accountId,
    required String email,
    required PlatformFeedbackAttachmentUpload attachment,
  }) async {
    final file = File(attachment.path);
    final actualSize = await file.length();
    if (attachment.kind == 'video' && actualSize > 50 * 1024 * 1024) {
      throw const _PlatformFeedbackServerException(
        'Each video must be 50 MB or smaller.',
      );
    }

    final request = await _client
        .postUrl(Uri.parse('$baseUrl/api/platform-feedback/uploads'))
        .timeout(_requestTimeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    request.headers.set(HttpHeaders.contentTypeHeader, attachment.contentType);
    request.headers.set('X-File-Name', Uri.encodeComponent(attachment.name));
    request.headers.set('X-Feedback-Type', 'user');
    request.headers.set('X-GMS-Account-ID', accountId.trim());
    if (email.trim().isNotEmpty) {
      request.headers.set('X-GMS-Account-Email', email.trim());
    }
    request.contentLength = actualSize;
    await request.addStream(file.openRead()).timeout(_uploadTimeout);

    final response = await request.close().timeout(_uploadTimeout);
    final body = await response.transform(utf8.decoder).join();
    final decoded = body.trim().isEmpty
        ? const <String, dynamic>{}
        : jsonDecode(body) as Map<String, dynamic>;
    if (response.statusCode != HttpStatus.ok &&
        response.statusCode != HttpStatus.created) {
      throw _PlatformFeedbackServerException(
        decoded['message']?.toString() ?? 'Unable to upload feedback media.',
      );
    }

    final uploaded = decoded['attachment'];
    if (uploaded is! Map) {
      throw const _PlatformFeedbackServerException(
        'The server returned an invalid media upload response.',
      );
    }
    return Map<String, dynamic>.from(uploaded);
  }
}

class _PlatformFeedbackServerException implements Exception {
  const _PlatformFeedbackServerException(this.message);

  final String message;
}
