// ignore_for_file: avoid_web_libraries_in_flutter

import 'dart:html' as html;

html.AudioElement? _notificationAudio;

Future<void> playNotificationSound() async {
  _notificationAudio ??=
      html.AudioElement('assets/sounds/notif.mp3')..preload = 'auto';

  final audio = _notificationAudio!;
  audio.pause();
  audio.currentTime = 0;

  try {
    await audio.play();
  } catch (_) {
    // Ignore browser playback failures so chat updates continue normally.
  }
}
