import 'package:gms_shopping/models/store_type_summary.dart';
import 'package:gms_shopping/services/store_type_repository_base.dart';

StoreTypeRepository createStoreTypeRepository({String? baseUrl}) {
  return _StubStoreTypeRepository();
}

class _StubStoreTypeRepository implements StoreTypeRepository {
  @override
  Future<List<StoreTypeSummary>> fetchStoreTypes({bool forceRefresh = false}) {
    return Future<List<StoreTypeSummary>>.value(const <StoreTypeSummary>[]);
  }
}
