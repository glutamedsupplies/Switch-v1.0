import 'package:gms_shopping/services/category_repository_base.dart';

CategoryRepository createCategoryRepository({String? baseUrl}) {
  return _UnsupportedCategoryRepository();
}

class _UnsupportedCategoryRepository implements CategoryRepository {
  @override
  Future<List<String>> fetchCategories({bool forceRefresh = false}) {
    throw UnsupportedError(
      'Category loading is not supported on this platform.',
    );
  }
}
