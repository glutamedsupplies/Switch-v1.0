import 'package:switch_app/services/listing_report_service_base.dart';

ListingReportService createListingReportService() =>
    _StubListingReportService();

class _StubListingReportService implements ListingReportService {
  @override
  Future<ListingReportEligibility> checkListingReportEligibility({
    required String productId,
    String adminId = '',
    String companyId = '',
  }) async {
    return const ListingReportEligibility(
      eligible: false,
      message: 'Listing reports are available on the mobile app.',
    );
  }

  @override
  Future<ListingReportResult> submitListingReport({
    required String productId,
    required String productName,
    required String reasonCategory,
    required String reasonText,
    String adminId = '',
    String companyId = '',
    String companyName = '',
    String orderId = '',
  }) async {
    return ListingReportResult.failure(
      'Listing reports are available on the mobile app.',
    );
  }
}
