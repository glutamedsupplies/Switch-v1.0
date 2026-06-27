abstract class CategoryRepository {
  Future<List<String>> fetchCategories({bool forceRefresh = false});
}
