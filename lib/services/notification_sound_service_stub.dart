import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

const MethodChannel _notificationSoundChannel = MethodChannel(
  'gms_shopping/notification_sound',
);

Future<void> playNotificationSound() async {
  if (defaultTargetPlatform == TargetPlatform.android) {
    try {
      await _notificationSoundChannel.invokeMethod<void>('playNotificationSound');
      return;
    } catch (_) {
      // Falls back to the platform alert sound below when the native channel
      // is unavailable.
    }
  }

  try {
    await SystemSound.play(SystemSoundType.alert);
  } catch (_) {
    // Ignore sound playback failures to keep chat refresh resilient.
  }
}
