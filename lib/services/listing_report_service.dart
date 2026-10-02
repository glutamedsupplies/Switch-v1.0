import 'package:switch_app/services/listing_report_service_base.dart';

import 'listing_report_service_stub.dart'
    if (dart.library.io) 'listing_report_service_io.dart' as service;

export 'listing_report_service_base.dart';

ListingReportService createListingReportService() =>
    service.createListingReportService();
