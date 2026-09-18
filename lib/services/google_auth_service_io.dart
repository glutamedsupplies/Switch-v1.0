import 'package:google_sign_in/google_sign_in.dart';
import 'package:gms_shopping/services/google_auth_service_base.dart';

/// Web OAuth client ID (Google Cloud → Credentials → OAuth 2.0 Client IDs → Web).
/// Required on Android as `serverClientId` so Google returns an ID token the
/// backend can verify. Override with --dart-define=GOOGLE_SERVER_CLIENT_ID=...
const _googleServerClientId = String.fromEnvironment(
  'GOOGLE_SERVER_CLIENT_ID',
  defaultValue:
      '507231387011-kq7ef8tlkvbovbjehnmcsm26j70vhstt.apps.googleusercontent.com',
);

GoogleAuthService createGoogleAuthService({String? baseUrl}) {
  return const _IoGoogleAuthService();
}

class _IoGoogleAuthService implements GoogleAuthService {
  const _IoGoogleAuthService();

  static Future<void>? _initializeFuture;

  Future<void> _ensureInitialized() {
    return _initializeFuture ??= GoogleSignIn.instance.initialize(
      serverClientId: _googleServerClientId,
    );
  }

  @override
  Future<GoogleAuthProfile?> signIn() async {
    await _ensureInitialized();

    if (!GoogleSignIn.instance.supportsAuthenticate()) {
      throw const GoogleAuthException(
        'Google sign-in is not supported on this device.',
      );
    }

    final GoogleSignInAccount account;
    try {
      account = await GoogleSignIn.instance.authenticate(
        scopeHint: const ['email', 'profile'],
      );
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        return null;
      }

      final details = <String>[
        if (error.description?.trim().isNotEmpty == true)
          error.description!.trim(),
        error.code.name,
      ].join(' · ');

      throw GoogleAuthException(
        details.isNotEmpty
            ? 'Google sign-in failed: $details'
            : 'Google sign-in failed.',
      );
    }

    final idToken = account.authentication.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw const GoogleAuthException(
        'Google sign-in did not return an ID token. '
        'Set GOOGLE_SERVER_CLIENT_ID / GOOGLE_CLIENT_ID.',
      );
    }

    // Build the profile from Google Sign-In directly. Backend verification
    // happens on login/register so we avoid a slow extra network round-trip.
    final displayName = account.displayName?.trim() ?? '';
    final nameParts = displayName
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    final firstName = nameParts.isEmpty ? '' : nameParts.first;
    final lastName =
        nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

    return GoogleAuthProfile(
      idToken: idToken,
      email: account.email,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      picture: account.photoUrl ?? '',
      subject: account.id,
    );
  }
}
