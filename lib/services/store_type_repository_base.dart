import 'package:switch_app/models/store_type_summary.dart';

abstract class StoreTypeRepository {
  Future<List<StoreTypeSummary>> fetchStoreTypes({bool forceRefresh = false});
}

class StoreTypeRepositoryException implements Exception {
  StoreTypeRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}
