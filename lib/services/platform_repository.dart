import 'package:switch_app/services/platform_repository_base.dart';

import 'platform_repository_stub.dart'
    if (dart.library.io) 'platform_repository_io.dart'
    if (dart.library.html) 'platform_repository_web.dart' as repository;

export 'platform_repository_base.dart';

final Map<String, PlatformRepository> _platformRepositoriesByBaseUrl =
    <String, PlatformRepository>{};

PlatformRepository createPlatformRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _platformRepositoriesByBaseUrl.putIfAbsent(
    cacheKey,
    () => repository.createPlatformRepository(baseUrl: baseUrl),
  );
}
