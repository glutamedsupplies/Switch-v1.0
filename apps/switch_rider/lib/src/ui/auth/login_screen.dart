import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:switch_core/switch_core.dart';

import '../../rider_api.dart';
import '../common.dart';
import 'register_screen.dart';

const _googleServerClientId = String.fromEnvironment(
  'GOOGLE_SERVER_CLIENT_ID',
  defaultValue:
      '507231387011-kq7ef8tlkvbovbjehnmcsm26j70vhstt.apps.googleusercontent.com',
);

String _authFailureText(Object error) {
  if (error is SwitchApiException) return error.message;
  if (error is StateError) return error.message.toString();
  if (error is PlatformException) {
    final message = error.message?.trim() ?? '';
    return message.isNotEmpty
        ? message
        : 'Google sign-in failed (${error.code}).';
  }
  final raw = error
      .toString()
      .replaceFirst(RegExp(r'^(Exception|Error):\s*'), '')
      .trim();
  return raw.isEmpty ? 'Unable to continue with Google.' : raw;
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static Future<void>? _googleInitialization;

  String? _busyProvider;
  String? _error;

  Future<void> _continueWithGoogle() async {
    if (_busyProvider != null) return;
    setState(() {
      _busyProvider = 'google';
      _error = null;
    });
    try {
      _googleInitialization ??= GoogleSignIn.instance.initialize(
        serverClientId: _googleServerClientId,
      );
      await _googleInitialization;
      if (!GoogleSignIn.instance.supportsAuthenticate()) {
        throw StateError('Google sign-in is not supported on this device.');
      }
      final account = await GoogleSignIn.instance.authenticate(
        scopeHint: const ['email', 'profile'],
      );
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw StateError('Google did not return a sign-in token.');
      }
      if (!mounted) return;
      final credential = RiderSocialCredential(
        provider: 'google',
        idToken: idToken,
      );
      final result = await context.session.continueWithSocial(credential);
      if (!mounted || !result.requiresApplication) return;
      final profile = result.profile;
      if (profile == null || profile.email.isEmpty) {
        throw StateError('Google did not return a verified Gmail address.');
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => RegisterScreen(
            socialProfile: profile,
            socialCredential: credential,
          ),
        ),
      );
    } on GoogleSignInException catch (error) {
      debugPrint(
        '[switch-rider] Google sign-in failed: ${error.code.name} ${error.description ?? ''}',
      );
      if (!mounted) return;

      final description = error.description?.trim();
      setState(
        () => _error = switch (error.code) {
          GoogleSignInExceptionCode.clientConfigurationError =>
            'Google Sign-In is not configured for this Switch Rider build. '
                'Register Android package com.example.switch_rider and this '
                'build\'s SHA-1 in Google Cloud.',
          // Android Credential Manager can report an OAuth package/SHA mismatch
          // as "canceled" after the user has already selected an account.
          GoogleSignInExceptionCode.canceled =>
            'Google could not finish signing in. If you already selected an '
                'account, register Android package com.example.switch_rider '
                'and this build\'s SHA-1 in Google Cloud, then try again.',
          _ =>
            description?.isNotEmpty == true
                ? description!
                : 'Unable to continue with Google (${error.code.name}).',
        },
      );
    } catch (error) {
      debugPrint('[switch-rider] Google sign-in failed: $error');
      if (mounted) setState(() => _error = _authFailureText(error));
    } finally {
      if (mounted) setState(() => _busyProvider = null);
    }
  }

  Future<void> _continueWithFacebook() async {
    if (_busyProvider != null) return;
    setState(() {
      _error =
          'Facebook sign-in needs the Switch Facebook App ID and client token before it can be connected.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final notice = context.session.notice;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Brand(),
                  const SizedBox(height: 36),
                  Text(
                    'Continue to sign in or apply as a new rider',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'One account button handles both sign in and sign up.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: SwitchBrand.muted),
                  ),
                  const SizedBox(height: 24),
                  if (notice != null && _error == null) ...[
                    _Banner(message: notice, color: SwitchBrand.warning),
                    const SizedBox(height: 16),
                  ],
                  if (_error != null) ...[
                    _Banner(message: _error!, color: SwitchBrand.danger),
                    const SizedBox(height: 16),
                  ],
                  _SocialButton(
                    label: 'Continue with Google',
                    assetPath: 'assets/images/google_logo.png',
                    busy: _busyProvider == 'google',
                    onPressed: _busyProvider == null
                        ? _continueWithGoogle
                        : null,
                  ),
                  const SizedBox(height: 12),
                  _SocialButton(
                    label: 'Continue with Facebook',
                    assetPath: 'assets/images/facebook_logo.png',
                    busy: _busyProvider == 'facebook',
                    onPressed: _busyProvider == null
                        ? _continueWithFacebook
                        : null,
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'By continuing, you agree to submit accurate rider and vehicle information for verification.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: SwitchBrand.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.label,
    required this.assetPath,
    required this.busy,
    required this.onPressed,
  });

  final String label;
  final String assetPath;
  final bool busy;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 54,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: SwitchBrand.ink,
          side: BorderSide(color: SwitchBrand.muted.withValues(alpha: 0.25)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: busy
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.2),
              )
            : Stack(
                alignment: Alignment.center,
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: SizedBox(
                      width: 30,
                      height: 30,
                      child: Image.asset(assetPath, fit: BoxFit.contain),
                    ),
                  ),
                  Text(
                    label,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: SwitchBrand.teal,
            borderRadius: BorderRadius.circular(22),
          ),
          child: const Icon(
            Icons.delivery_dining,
            color: Colors.white,
            size: 44,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Switch Rider',
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text(
          'Deliver for the Switch marketplace',
          style: TextStyle(color: SwitchBrand.muted),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.message, required this.color});

  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
