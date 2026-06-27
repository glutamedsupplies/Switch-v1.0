import 'package:gms_shopping/services/category_repository_base.dart';

import 'category_repository_stub.dart'
    if (dart.library.io) 'category_repository_io.dart'
    if (dart.library.html) 'category_repository_web.dart' as repository;

export 'category_repository_base.dart';

final Map<String, CategoryRepository> _categoryRepositoriesByBaseUrl =
    <String, CategoryRepository>{};

CategoryRepository createCategoryRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _categoryRepositoriesByBaseUrl.putIfAbsent(
    cacheKey,
    () => repository.createCategoryRepository(baseUrl: baseUrl),
  );
}
