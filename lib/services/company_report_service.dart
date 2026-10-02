import 'package:switch_app/services/company_report_service_base.dart';

import 'company_report_service_stub.dart'
    if (dart.library.io) 'company_report_service_io.dart' as service;

export 'company_report_service_base.dart';

CompanyReportService createCompanyReportService() =>
    service.createCompanyReportService();
