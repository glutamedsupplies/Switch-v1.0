import 'package:switch_app/services/company_report_service_base.dart';

CompanyReportService createCompanyReportService() =>
    _StubCompanyReportService();

class _StubCompanyReportService implements CompanyReportService {
  @override
  Future<CompanyReportEligibility> checkSellerReportEligibility({
    required String adminId,
    String companyId = '',
    String productId = '',
  }) async {
    return const CompanyReportEligibility(
      eligible: false,
      message: 'Seller reports are available on the mobile app.',
    );
  }

  @override
  Future<CompanyReportResult> submitSellerReport({
    required String adminId,
    required String companyName,
    required String reasonCategory,
    required String reasonText,
    String companyId = '',
    String productId = '',
    String productName = '',
    String orderId = '',
  }) async {
    return CompanyReportResult.failure(
      'Seller reports are available on the mobile app.',
    );
  }
}
