import 'package:switch_app/services/store_type_repository_base.dart';

import 'store_type_repository_stub.dart'
    if (dart.library.io) 'store_type_repository_io.dart'
    if (dart.library.html) 'store_type_repository_web.dart' as repository;

export 'store_type_repository_base.dart';

final Map<String, StoreTypeRepository> _storeTypeRepositoriesByBaseUrl =
    <String, StoreTypeRepository>{};

StoreTypeRepository createStoreTypeRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _storeTypeRepositoriesByBaseUrl.putIfAbsent(
    cacheKey,
    () => repository.createStoreTypeRepository(baseUrl: baseUrl),
  );
}
