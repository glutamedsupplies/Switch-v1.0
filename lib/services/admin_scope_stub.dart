const _environmentAdminId = String.fromEnvironment('ADMIN_ID');

String get activeAdminId => _environmentAdminId.trim();

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
