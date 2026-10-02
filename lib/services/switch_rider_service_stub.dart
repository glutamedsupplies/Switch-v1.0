import 'dart:typed_data';

import 'package:switch_app/services/switch_rider_service_base.dart';

SwitchRiderService createSwitchRiderService() => _StubSwitchRiderService();

const _unsupported = SwitchRiderApiException(
  'Switch Rider is available on the mobile app.',
  code: 'SWITCH_RIDER_UNSUPPORTED_PLATFORM',
);

class _StubSwitchRiderService implements SwitchRiderService {
  @override
  Future<SwitchRiderQuote> fetchQuote({
    required String sellerAdminId,
    required double latitude,
    required double longitude,
  }) async {
    return const SwitchRiderQuote(
      available: false,
      code: 'SWITCH_RIDER_UNSUPPORTED_PLATFORM',
      message: 'Switch Rider is available on the mobile app.',
      deliveryFee: 0,
      distanceKm: 0,
      estimatedMinutes: 0,
      estimateLabel: '',
      quoteToken: '',
      expiresAt: null,
    );
  }

  @override
  Future<List<SwitchRiderBuyerNotification>> fetchBuyerNotifications() async =>
      const <SwitchRiderBuyerNotification>[];

  @override
  Future<SwitchRiderTracking?> fetchTracking(String orderReference) async =>
      null;

  @override
  Future<SwitchRiderRating> rateRider(
    String orderReference, {
    required int stars,
    String comment = '',
  }) async {
    throw _unsupported;
  }

  @override
  Future<Uint8List?> fetchRiderPhoto(String photoPath) async => null;
}
