import 'dart:html';

const _environmentAdminId = String.fromEnvironment('ADMIN_ID');

String get activeAdminId {
  final environmentAdminId = _environmentAdminId.trim();
  if (environmentAdminId.isNotEmpty) {
    return environmentAdminId;
  }

  final queryAdminId = Uri.base.queryParameters['adminId']?.trim() ?? '';
  if (queryAdminId.isNotEmpty) {
    return queryAdminId;
  }

  return window.localStorage['gms-admin-id']?.trim() ?? '';
}

Map<String, String> withAdminScopeHeaders(Map<String, String> headers) {
  final adminId = activeAdminId;
  if (adminId.isEmpty || headers.containsKey('X-GMS-Admin-ID')) {
    return headers;
  }
  return <String, String>{
    ...headers,
    'X-GMS-Admin-ID': adminId,
  };
}

Uri withAdminScopeUri(Uri uri) {
  final adminId = activeAdminId;
  if (adminId.isEmpty || uri.queryParameters.containsKey('adminId')) {
    return uri;
  }
  return uri.replace(
    queryParameters: <String, String>{
      ...uri.queryParameters,
      'adminId': adminId,
    },
  );
}

String withAdminScopeUrl(String url) => withAdminScopeUri(Uri.parse(url)).toString();

Map<String, dynamic> withAdminScopePayload(Map<String, dynamic> payload) {
  final adminId = activeAdminId;
  if (adminId.isEmpty || payload.containsKey('adminId')) {
    return payload;
  }
  return <String, dynamic>{
    ...payload,
    'adminId': adminId,
  };
}
