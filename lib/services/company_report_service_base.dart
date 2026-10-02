class CompanyReportResult {
  const CompanyReportResult._({
    required this.ok,
    required this.message,
    this.reportId = '',
  });

  final bool ok;
  final String message;
  final String reportId;

  factory CompanyReportResult.success(String message, {String reportId = ''}) {
    return CompanyReportResult._(
      ok: true,
      message: message,
      reportId: reportId,
    );
  }

  factory CompanyReportResult.failure(String message) {
    return CompanyReportResult._(ok: false, message: message);
  }
}

class CompanyReportEligibility {
  const CompanyReportEligibility({required this.eligible, this.message = ''});

  final bool eligible;
  final String message;
}

abstract class CompanyReportService {
  Future<CompanyReportEligibility> checkSellerReportEligibility({
    required String adminId,
    String companyId = '',
    String productId = '',
  });

  Future<CompanyReportResult> submitSellerReport({
    required String adminId,
    required String companyName,
    required String reasonCategory,
    required String reasonText,
    String companyId = '',
    String productId = '',
    String productName = '',
    String orderId = '',
  });
}
