class ListingReportResult {
  const ListingReportResult._({
    required this.ok,
    required this.message,
    this.reportId = '',
  });

  final bool ok;
  final String message;
  final String reportId;

  factory ListingReportResult.success(String message, {String reportId = ''}) {
    return ListingReportResult._(
      ok: true,
      message: message,
      reportId: reportId,
    );
  }

  factory ListingReportResult.failure(String message) {
    return ListingReportResult._(ok: false, message: message);
  }
}

class ListingReportEligibility {
  const ListingReportEligibility({required this.eligible, this.message = ''});

  final bool eligible;
  final String message;
}

abstract class ListingReportService {
  Future<ListingReportEligibility> checkListingReportEligibility({
    required String productId,
    String adminId = '',
    String companyId = '',
  });

  Future<ListingReportResult> submitListingReport({
    required String productId,
    required String productName,
    required String reasonCategory,
    required String reasonText,
    String adminId = '',
    String companyId = '',
    String companyName = '',
    String orderId = '',
  });
}
