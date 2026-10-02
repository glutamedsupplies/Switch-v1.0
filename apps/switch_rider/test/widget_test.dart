import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:switch_rider/main.dart';
import 'package:switch_rider/src/models.dart';
import 'package:switch_rider/src/runtime.dart';
import 'package:switch_rider/src/session.dart';

void main() {
  test('offer JSON keeps only area-level locations', () {
    final offer = RiderOffer.fromJson({
      'offerId': 'off_1',
      'deliveryId': 'dlv_1',
      'deliveryCode': 'SR-000123',
      'secondsRemaining': 30,
      'pickupArea': 'Makati, Metro Manila',
      'dropoffArea': 'Taguig, Metro Manila',
      'distanceKm': 4.2,
      'distanceToPickupKm': '0.8',
      'riderEarning': 79,
      'isCod': true,
      'codAmount': 450.5,
      'vehicleTypeRequired': 'MOTORCYCLE',
      'packageCount': 1,
    });
    expect(offer.pickupArea, 'Makati, Metro Manila');
    expect(offer.distanceToPickupKm, 0.8);
    expect(offer.codAmount, 450.5);
    expect(offer.isCod, isTrue);
  });

  test('job JSON exposes workflow helpers', () {
    final job = RiderJob.fromJson({
      'id': 'dlv_1',
      'status': 'ARRIVED_AT_PICKUP',
      'paymentMethod': 'COD',
      'codAmount': 200,
      'pickup': {
        'name': 'Shop',
        'address': '1 Main St',
        'lat': 14.5,
        'lng': 121.0,
      },
      'dropoff': {'area': 'Taguig', 'lat': null, 'lng': null},
      'history': [
        {'toStatus': 'RIDER_ASSIGNED', 'at': '2026-09-30T02:00:00Z'},
      ],
    });
    expect(job.isBeforePickup, isTrue);
    expect(job.isCod, isTrue);
    expect(job.pickup.hasCoordinates, isTrue);
    expect(job.dropoff.hasCoordinates, isFalse);
    expect(job.pickupPinAttemptsRemaining, 5);
    expect(job.history.single.toStatus, 'RIDER_ASSIGNED');
  });

  testWidgets('signed-out riders see unified social sign in and sign up', (
    tester,
  ) async {
    final session = RiderSession(baseUrl: 'http://127.0.0.1:1')
      ..phase = SessionPhase.signedOut;
    await tester.pumpWidget(
      SwitchRiderApp(session: session, runtime: RiderRuntime(session)),
    );

    expect(find.text('Switch Rider'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Continue with Facebook'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);
    expect(find.byType(TextFormField), findsNothing);
  });
}
