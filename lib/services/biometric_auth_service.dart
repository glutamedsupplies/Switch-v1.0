import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

/// Optional biometric step for **Google One-Tap Register** only.
///
/// Existing Google-linked Switch accounts skip this entirely (auto One-Tap).
/// For new register:
/// - If fingerprint/face is enrolled → user must confirm before account create.
/// - If none is set up → One-Tap Register proceeds immediately.
class BiometricAuthService {
  BiometricAuthService({LocalAuthentication? auth})
      : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  Future<BiometricGateResult> confirmGoogleOneTapRegister({
    String accountEmail = '',
  }) async {
    if (kIsWeb) {
      return const BiometricGateResult.skipped();
    }

    try {
      final supported = await _auth.isDeviceSupported();
      final canCheck = await _auth.canCheckBiometrics;
      final enrolled = await _auth.getAvailableBiometrics();

      // No fingerprint/face enrolled → auto One-Tap Register.
      if (!supported || !canCheck || enrolled.isEmpty) {
        return const BiometricGateResult.skipped();
      }

      final emailHint = accountEmail.trim().isEmpty
          ? 'your Google account'
          : accountEmail.trim();
      final ok = await _auth.authenticate(
        localizedReason:
            'Confirm with fingerprint or biometrics to create your Switch '
            'account as $emailHint',
        biometricOnly: true,
        sensitiveTransaction: true,
        persistAcrossBackgrounding: true,
      );

      if (!ok) {
        return const BiometricGateResult.canceled(
          'Biometric confirmation canceled. Google registration was not completed.',
        );
      }

      return const BiometricGateResult.success();
    } on LocalAuthException catch (error) {
      if (error.code == LocalAuthExceptionCode.userCanceled ||
          error.code == LocalAuthExceptionCode.systemCanceled) {
        return const BiometricGateResult.canceled(
          'Biometric confirmation canceled. Google registration was not completed.',
        );
      }

      // Treat "no biometrics" as skip — One-Tap continues.
      if (error.code == LocalAuthExceptionCode.noBiometricsEnrolled ||
          error.code == LocalAuthExceptionCode.noCredentialsSet ||
          error.code == LocalAuthExceptionCode.noBiometricHardware ||
          error.code ==
              LocalAuthExceptionCode.biometricHardwareTemporarilyUnavailable) {
        return const BiometricGateResult.skipped();
      }

      return BiometricGateResult.failed(
        error.description?.trim().isNotEmpty == true
            ? error.description!.trim()
            : 'Biometric confirmation failed. Google registration was not completed.',
      );
    } on PlatformException catch (error) {
      final details = '${error.code} ${error.message ?? ''}'.toLowerCase();
      // Plugin not ready / channel issues → don't block One-Tap Register.
      if (details.contains('channel-error') ||
          details.contains('unable to establish connection')) {
        return const BiometricGateResult.skipped();
      }

      return BiometricGateResult.failed(
        error.message?.trim().isNotEmpty == true
            ? error.message!.trim()
            : 'Biometric confirmation failed. Google registration was not completed.',
      );
    } catch (error) {
      final text = error.toString().toLowerCase();
      if (text.contains('unable to establish connection') ||
          text.contains('channel-error')) {
        return const BiometricGateResult.skipped();
      }

      return BiometricGateResult.failed(
        'Biometric confirmation failed. ${error.toString()}',
      );
    }
  }
}

enum BiometricGateStatus { success, skipped, canceled, failed }

class BiometricGateResult {
  const BiometricGateResult._(this.status, [this.message]);

  const BiometricGateResult.success() : this._(BiometricGateStatus.success);

  /// No biometrics enrolled (or unavailable) — Instant One-Tap may continue.
  const BiometricGateResult.skipped() : this._(BiometricGateStatus.skipped);

  const BiometricGateResult.canceled(String message)
      : this._(BiometricGateStatus.canceled, message);

  const BiometricGateResult.failed(String message)
      : this._(BiometricGateStatus.failed, message);

  final BiometricGateStatus status;
  final String? message;

  /// True when sign-in may proceed (confirmed OR skipped because none enrolled).
  bool get allowsContinue =>
      status == BiometricGateStatus.success ||
      status == BiometricGateStatus.skipped;
}
