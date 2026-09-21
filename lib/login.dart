// =============================================================================
// FILE: login.dart
// =============================================================================
// PURPOSE: Login page for the Switch App.
// This screen allows users to sign in with their email and password,
// continue as a guest, or sign up for a new account.
// It also provides placeholder buttons for Google and Facebook sign-in.
// =============================================================================

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/chat_support.dart';
import 'package:switch_app/error_validation.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/forgotpassword.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/l10n/app_login_languages.dart';
import 'package:switch_app/order_store.dart';
import 'package:switch_app/register.dart';
import 'package:switch_app/services/app_language_preference.dart';
import 'package:switch_app/services/google_auth_service.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/login_service.dart';
import 'package:switch_app/services/account_devices_service.dart';
import 'package:switch_app/services/unified_account_service.dart';
import 'package:switch_app/services/verification_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/theme/app_theme.dart';
import 'package:switch_app/theme/loadingscreen.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/widgets/password_visibility_icon.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';

const int _googleVerifyCodeLength = 6;
const Duration _googleVerifyResendCooldown = Duration(seconds: 60);

// =============================================================================
// LoginPage
// =============================================================================
// Main login screen widget. Displays a sign-in form with email/password fields,
// options to continue as guest, forgot password, and social sign-in buttons.
// Automatically redirects to home if user is already logged in.
// =============================================================================
class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.themeModeNotifier,
  });

  // Notifier for theme mode changes (light/dark mode)
  final ValueNotifier<ThemeMode> themeModeNotifier;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

// =============================================================================
// _LoginPageState
// =============================================================================
// Manages the state of the login page including form validation,
// authentication, and navigation to other screens.
// =============================================================================
class _LoginPageState extends State<LoginPage> {
  // Form key for validating the login form
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  // Controllers for email and password text fields
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // Notifier for tracking validation state (when to show errors)
  final ValueNotifier<_LoginValidationState> _validationStateNotifier =
      ValueNotifier(const _LoginValidationState());

  // Platform-specific login service (web or native)
  final LoginService _loginService = createLoginService();
  final GoogleAuthService _googleAuthService = createGoogleAuthService();
  final UnifiedAccountService _unifiedAccountService =
      createUnifiedAccountService();
  final VerificationService _verificationService = createVerificationService();

  String _languageCode = 'en';

  /// Google Instant Sign-In register: swap login form → enter verification code.
  bool _googleVerifyMode = false;
  GoogleAuthProfile? _pendingGoogleProfile;
  final List<TextEditingController> _googleCodeControllers = List.generate(
    _googleVerifyCodeLength,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _googleCodeFocusNodes = List.generate(
    _googleVerifyCodeLength,
    (_) => FocusNode(),
  );
  bool _showGoogleCodeError = false;
  bool _isSendingGoogleCode = false;
  bool _isVerifyingGoogleCode = false;
  int _googleResendRemainingSeconds = 0;
  Timer? _googleResendTimer;

  String _t(String key) => AppLoginLanguages.t(_languageCode, key);

  // =========================================================================
  // initState
  // =========================================================================
  // Called when this widget is inserted into the widget tree.
  // Sets up post-frame callback to check if user is already logged in.
  // =========================================================================
  @override
  void initState() {
    super.initState();
    unawaited(_loadSavedLanguage());
    // Use addPostFrameCallback to avoid calling setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_redirectIfSessionExists());
    });
  }

  Future<void> _loadSavedLanguage() async {
    await AppLanguagePreference.ensureLoaded();
    final saved = AppLanguagePreference.code;
    if (!mounted || saved == _languageCode) {
      return;
    }
    setState(() => _languageCode = saved);
  }

  Future<void> _setLanguage(String code) async {
    final next = await AppLanguagePreference.setLanguage(code);
    if (!mounted || next == _languageCode) {
      return;
    }
    setState(() => _languageCode = next);
  }

  Future<void> _openLanguagePicker() async {
    _dismissKeyboard();
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return LoginLanguagePickerSheet(selectedCode: _languageCode);
      },
    );
    if (!mounted || selected == null) {
      return;
    }
    await _setLanguage(selected);
  }

  // =========================================================================
  // _dismissKeyboard
  // =========================================================================
  // Hides the on-screen keyboard by unfocusing the current text field.
  // Called before navigating to other screens or performing actions.
  // =========================================================================
  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  // =========================================================================
  // dispose
  // =========================================================================
  // Called when this widget is removed from the widget tree permanently.
  // Cleans up all controllers and notifiers to prevent memory leaks.
  // =========================================================================
  @override
  void dispose() {
    _googleResendTimer?.cancel();
    _validationStateNotifier.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    for (final controller in _googleCodeControllers) {
      controller.dispose();
    }
    for (final node in _googleCodeFocusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  // =========================================================================
  // _updateValidationState
  // =========================================================================
  // Updates the validation state notifier with new values.
  // Parameters:
  //   - showValidationErrors: Whether to show validation errors on form fields
  //   - showEmailError: Whether to show email validation error
  // Only updates if the new state differs from the current state.
  // =========================================================================
  void _updateValidationState({
    bool? showValidationErrors,
    bool? showEmailError,
  }) {
    final currentState = _validationStateNotifier.value;
    final nextState = currentState.copyWith(
      showValidationErrors: showValidationErrors,
      showEmailError: showEmailError,
    );

    if (currentState == nextState) {
      return;
    }

    _validationStateNotifier.value = nextState;
  }

  // =========================================================================
  // _validateLoginPassword
  // =========================================================================
  // Validates the password field input.
  // Returns an error message if validation fails, or null if valid.
  // Validation rules:
  //   - Password cannot be empty
  //   - Password must be at least 8 characters long
  // =========================================================================
  String? _validateLoginPassword(String? value) {
    final password = value?.trim() ?? '';

    if (password.isEmpty) {
      return _t('app.passwordRequired');
    }

    if (password.length < 8) {
      return _t('app.passwordMin');
    }

    return null;
  }

  // =========================================================================
  // _loginErrorMessage
  // =========================================================================
  // Returns the appropriate error message for login validation failures.
  // Checks email first, then password, then returns a generic message.
  // =========================================================================
  String _loginErrorMessage() {
    return ErrorValidation.validateEmail(_emailController.text) ??
        _validateLoginPassword(_passwordController.text) ??
        _t('app.checkDetails');
  }

  // =========================================================================
  // _redirectIfSessionExists
  // =========================================================================
  // Checks if user is already logged in via AuthSession.
  // If logged in, clears guest session, reloads user-specific stores
  // (cart, favorites, orders), and navigates to home page.
  // Called automatically on page load to prevent already-logged-in users
  // from seeing the login screen.
  // =========================================================================
  Future<void> _redirectIfSessionExists() async {
    await AuthSession.ensureLoaded();
    if (!mounted || !AuthSession.isLoggedInSync) {
      return;
    }

    await GuestSession.clear();
    await CartStore.instance.reloadForCurrentAccount();
    await FavoriteProductsStore.instance.reloadForCurrentAccount();
    await OrderStore.instance.reloadForCurrentAccount();

    if (!mounted) {
      return;
    }

    // Navigate to home and remove all previous routes
    Navigator.of(context).pushNamedAndRemoveUntil(
      '/',
      (route) => false,
    );
  }

  // =========================================================================
  // _firstAccountValue
  // =========================================================================
  // Extracts the first non-empty value from an account map using a list of
  // possible keys. This handles different API response formats.
  // Parameters:
  //   - account: Map containing account data from the API
  //   - keys: List of possible key names to check (in order of priority)
  // Returns the first non-empty value found, or empty string if none found.
  // =========================================================================
  String _firstAccountValue(
    Map<String, dynamic> account,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = account[key]?.toString().trim() ?? '';
      if (value.isNotEmpty) {
        return value;
      }
    }

    return '';
  }

  // =========================================================================
  // _persistSignedInAccount
  // =========================================================================
  // Saves the logged-in account information to AuthSession and SharedPreferences.
  // This ensures user data persists across app restarts.
  // Parameters:
  //   - account: Map containing account data from the login API response
  // Extracts and saves: account ID, email, first name, last name, display name.
  // Also reloads ChatSupportStore for the new account.
  // =========================================================================
  Future<void> _persistSignedInAccount(Map<String, dynamic> account) async {
    // Extract email from various possible key names
    final email = _firstAccountValue(account, const [
      'email',
      'accountEmail',
    ]);

    // Extract account ID from various possible key names
    final accountId = _firstAccountValue(account, const [
      '_id',
      'id',
      'accountId',
      'accountCode',
      'employeeId',
      'userId',
      'uid',
    ]);

    // Extract first name from various possible key names
    final firstName = _firstAccountValue(account, const [
      'firstName',
      'first_name',
    ]);

    // Extract last name from various possible key names
    final lastName = _firstAccountValue(account, const [
      'lastName',
      'last_name',
    ]);

    // Extract display name or construct from first/last name
    final displayName = _firstAccountValue(account, const [
      'name',
      'displayName',
      'fullName',
    ]);
    final resolvedName = displayName.isNotEmpty
        ? displayName
        : [firstName, lastName].where((value) => value.isNotEmpty).join(' ');

    // Save to AuthSession for app-wide access
    await AuthSession.setAccountId(accountId.isNotEmpty ? accountId : email);
    await AuthSession.setAccountEmail(email);
    await AuthSession.setAccountName(resolvedName);

    // Apply per-account language (guest selection stays if account has none).
    await AppLanguagePreference.applyForSignedInAccount(
      accountId: accountId.isNotEmpty ? accountId : email,
      accountPreferredLanguage:
          AppLanguagePreference.preferredLanguageFromAccount(account),
    );
    if (mounted) {
      setState(() => _languageCode = AppLanguagePreference.code);
    }

    // Save to SharedPreferences for persistence
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_first_name', firstName);
    await prefs.setString('profile_last_name', lastName);
    await prefs.setString('profile_email', email);

    try {
      final result = await _unifiedAccountService.fetchSession(
        accountId: accountId.isNotEmpty ? accountId : null,
        email: email.isNotEmpty ? email : null,
      );
      await AuthSession.setUnifiedSession(result.session);
    } catch (_) {
      await AuthSession.setAvailableModes(const ['buyer']);
      await AuthSession.setActiveMode('buyer');
      await AuthSession.setActiveCompanyId(null);
    }

    try {
      final deviceAccountId = accountId.isNotEmpty ? accountId : email;
      if (deviceAccountId.isNotEmpty) {
        await createAccountDevicesService().registerAndList(
          accountId: deviceAccountId,
          email: email,
          reactivate: true,
        );
      }
    } catch (_) {
      // Device registry is best-effort; login still succeeds.
    }

    // Reload chat support for the new account
    await ChatSupportStore.instance.reloadForCurrentAccount();
  }

// =========================================================================
  // _handleSignIn
  // =========================================================================
  // Handles the main email/password sign-in process.
  // Steps:
  //   1. Dismiss keyboard
  //   2. Enable validation error display
  //   3. Validate form fields
  //   4. Call login service with credentials
  //   5. On success: persist account, clear guest session, reload stores,
  //      and navigate to home
  //   6. On failure: show error message via snackbar
  // =========================================================================
  Future<void> _handleSignIn() async {
    _dismissKeyboard();

    // Enable validation display when user attempts to sign in
    final validationState = _validationStateNotifier.value;
    if (!validationState.showValidationErrors || !validationState.showEmailError) {
      _updateValidationState(
        showValidationErrors: true,
        showEmailError: true,
      );
    }

    // Validate form fields
    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid) {
      AppSnackBar.showError(
        context,
        message: _loginErrorMessage(),
      );
      return;
    }

    // Call login service while showing loading screen
    final result = await LoadingScreen.showWhile(context, () async {
      return await _loginService.loginWithEmail(
        email: _emailController.text,
        password: _passwordController.text,
      );
    });

    if (!mounted) {
      return;
    }

    // Handle login failure
    if (result.isFailure) {
      AppSnackBar.showError(
        context,
        message: result.errorMessage ?? 'Unable to sign in.',
      );
      return;
    }

    // Login successful - persist account info and clear guest session
    final account = result.account;
    if (account == null) {
      AppSnackBar.showError(
        context,
        message: 'Unable to save your login session.',
      );
      return;
    }

    await _persistSignedInAccount(account);
    await GuestSession.clear();

    // Reload cart/favorites/orders for the new account
    await CartStore.instance.reloadForCurrentAccount();
    await FavoriteProductsStore.instance.reloadForCurrentAccount();
    await OrderStore.instance.reloadForCurrentAccount();

    if (!mounted) {
      return;
    }

    // Navigate to home and remove all previous routes
    Navigator.of(context).pushNamedAndRemoveUntil(
      '/',
      (route) => false,
    );
  }

  // =========================================================================
  // _handleContinueAsGuest
  // =========================================================================
  // Allows user to continue browsing without signing in.
  // Sets up a guest session and navigates to home.
  // Guest users have limited functionality (cannot checkout, etc.)
  // =========================================================================
  Future<void> _handleContinueAsGuest() async {
    _dismissKeyboard();
    await LoadingScreen.showWhile(context, () async {
      await GuestSession.continueAsGuest();
    });

    if (!mounted) {
      return;
    }

    Navigator.of(context).pushNamedAndRemoveUntil(
      '/',
      (route) => false,
    );
  }

  // =========================================================================
  // _handleGoogleSignIn
  // =========================================================================
  // Existing Google-linked Switch account → sign in and go to home.
  // New Google email → swap login content to enter verification code, then
  // create the Switch account after OTP.
  // =========================================================================
  Future<void> _handleGoogleSignIn() async {
    _dismissKeyboard();

    // Do not wrap the Google account picker in LoadingScreen — Credential
    // Manager needs an unobstructed activity and fails under a modal barrier.
    GoogleAuthProfile? profile;
    try {
      profile = await _googleAuthService.signIn();
    } on GoogleAuthException catch (error) {
      if (!mounted) {
        return;
      }
      AppSnackBar.showError(context, message: error.message);
      return;
    } catch (error) {
      if (!mounted) {
        return;
      }
      AppSnackBar.showError(
        context,
        message: 'Google sign-in failed. ${error.toString()}',
      );
      return;
    }

    if (!mounted) {
      return;
    }

    if (profile == null) {
      AppSnackBar.showInfo(
        context,
        message: 'Google sign-in cancelled.',
      );
      return;
    }

    // Existing linked account → sign in directly.
    final result = await LoadingScreen.showWhile(context, () async {
      return await _loginService.loginWithGoogle(
        idToken: profile!.idToken,
        createIfMissing: false,
        preferredLanguage: await AppLanguagePreference.getGuestLanguage(),
      );
    });

    if (!mounted) {
      return;
    }

    // New Google email → verify inbox before creating the account.
    if (result.isNotFound || result.code == 'verification_required') {
      await _beginGoogleVerification(profile);
      return;
    }

    if (result.isFailure) {
      AppSnackBar.showError(
        context,
        message: result.errorMessage ?? 'Unable to sign in with Google.',
      );
      return;
    }

    await _completeGoogleLogin(result);
  }

  Future<void> _beginGoogleVerification(GoogleAuthProfile profile) async {
    final email = profile.email.trim();
    if (email.isEmpty) {
      AppSnackBar.showError(
        context,
        message: 'Google did not provide an email address.',
      );
      return;
    }

    setState(() {
      _pendingGoogleProfile = profile;
      _googleVerifyMode = true;
      _showGoogleCodeError = false;
    });
    _clearGoogleCodeInputs();

    final sent = await _sendGoogleVerificationCode(isResend: false);
    if (!mounted) {
      return;
    }
    if (!sent) {
      setState(() {
        _googleVerifyMode = false;
        _pendingGoogleProfile = null;
      });
    }
  }

  void _clearGoogleCodeInputs() {
    for (final controller in _googleCodeControllers) {
      controller.clear();
    }
  }

  void _cancelGoogleVerification() {
    _googleResendTimer?.cancel();
    setState(() {
      _googleVerifyMode = false;
      _pendingGoogleProfile = null;
      _showGoogleCodeError = false;
      _googleResendRemainingSeconds = 0;
      _isSendingGoogleCode = false;
      _isVerifyingGoogleCode = false;
    });
    _clearGoogleCodeInputs();
  }

  void _startGoogleResendTimer({
    DateTime? resendAvailableAt,
    int? cooldownSeconds,
  }) {
    _googleResendTimer?.cancel();
    final availableAt = resendAvailableAt ??
        DateTime.now().add(
          Duration(
            seconds: cooldownSeconds ?? _googleVerifyResendCooldown.inSeconds,
          ),
        );

    void tick() {
      final remaining = availableAt.difference(DateTime.now()).inSeconds;
      if (!mounted) {
        return;
      }
      setState(() {
        _googleResendRemainingSeconds = remaining > 0 ? remaining : 0;
      });
      if (remaining <= 0) {
        _googleResendTimer?.cancel();
      }
    }

    tick();
    _googleResendTimer = Timer.periodic(const Duration(seconds: 1), (_) => tick());
  }

  Future<bool> _sendGoogleVerificationCode({required bool isResend}) async {
    final profile = _pendingGoogleProfile;
    if (profile == null || _isSendingGoogleCode) {
      return false;
    }

    setState(() => _isSendingGoogleCode = true);
    try {
      final result = await LoadingScreen.showWhile(context, () async {
        return await _verificationService.sendVerificationCode(
          purpose: 'registration',
          channel: 'email',
          email: profile.email.trim(),
        );
      });

      if (!mounted) {
        return false;
      }

      setState(() => _showGoogleCodeError = false);
      _clearGoogleCodeInputs();
      _startGoogleResendTimer(
        resendAvailableAt: result.resendAvailableAt,
        cooldownSeconds: result.resendCooldownSeconds,
      );
      _googleCodeFocusNodes.first.requestFocus();

      AppSnackBar.showSuccess(
        context,
        message: isResend
            ? 'Code resent to ${profile.email.trim()}.'
            : 'Code sent to ${profile.email.trim()}.',
      );
      return true;
    } on VerificationException catch (error) {
      if (!mounted) {
        return false;
      }
      AppSnackBar.showError(context, message: error.message);
      return false;
    } catch (error) {
      if (!mounted) {
        return false;
      }
      AppSnackBar.showError(context, message: error.toString());
      return false;
    } finally {
      if (mounted) {
        setState(() => _isSendingGoogleCode = false);
      }
    }
  }

  String get _googleEnteredCode =>
      _googleCodeControllers.map((c) => c.text).join();

  void _onGoogleCodeDigitChanged(int index, String value) {
    if (value.length > 1) {
      final digits = value.replaceAll(RegExp(r'\D'), '');
      for (var i = 0; i < _googleVerifyCodeLength; i++) {
        _googleCodeControllers[i].text =
            i < digits.length ? digits[i] : '';
      }
      final focusIndex = digits.length.clamp(0, _googleVerifyCodeLength - 1);
      _googleCodeFocusNodes[focusIndex].requestFocus();
      if (digits.length >= _googleVerifyCodeLength) {
        unawaited(_verifyGoogleEnteredCode(showIncompleteError: false));
      }
      return;
    }

    if (value.isNotEmpty && index < _googleVerifyCodeLength - 1) {
      _googleCodeFocusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _googleCodeFocusNodes[index - 1].requestFocus();
    }
    if (_googleEnteredCode.length == _googleVerifyCodeLength) {
      unawaited(_verifyGoogleEnteredCode(showIncompleteError: false));
    }
  }

  Future<void> _verifyGoogleEnteredCode({
    bool showIncompleteError = true,
  }) async {
    if (_isVerifyingGoogleCode) {
      return;
    }
    final profile = _pendingGoogleProfile;
    if (profile == null) {
      return;
    }

    final code = _googleEnteredCode;
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      if (showIncompleteError) {
        setState(() => _showGoogleCodeError = true);
        AppSnackBar.showError(
          context,
          message: 'Enter the 6-digit verification code.',
        );
      }
      return;
    }

    setState(() {
      _isVerifyingGoogleCode = true;
      _showGoogleCodeError = false;
    });

    try {
      final verifyResult = await LoadingScreen.showWhile(context, () async {
        return await _verificationService.verifyVerificationCode(
          purpose: 'registration',
          channel: 'email',
          email: profile.email.trim(),
          code: code,
        );
      });

      if (!mounted) {
        return;
      }

      final loginResult = await LoadingScreen.showWhile(context, () async {
        return await _loginService.loginWithGoogle(
          idToken: profile.idToken,
          createIfMissing: true,
          verificationToken: verifyResult.verificationToken,
          preferredLanguage: await AppLanguagePreference.getGuestLanguage(),
        );
      });

      if (!mounted) {
        return;
      }

      if (loginResult.isFailure) {
        setState(() => _showGoogleCodeError = true);
        AppSnackBar.showError(
          context,
          message:
              loginResult.errorMessage ?? 'Unable to create your Switch account.',
        );
        return;
      }

      _googleResendTimer?.cancel();
      setState(() {
        _googleVerifyMode = false;
        _pendingGoogleProfile = null;
      });
      await _completeGoogleLogin(loginResult);
    } on VerificationException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _showGoogleCodeError = true);
      AppSnackBar.showError(context, message: error.message);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _showGoogleCodeError = true);
      AppSnackBar.showError(context, message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isVerifyingGoogleCode = false);
      }
    }
  }

  Future<void> _completeGoogleLogin(LoginResult result) async {
    final account = result.account;
    if (account == null) {
      AppSnackBar.showError(
        context,
        message: 'Unable to save your login session.',
      );
      return;
    }

    await _persistSignedInAccount(account);
    await GuestSession.clear();
    await CartStore.instance.reloadForCurrentAccount();
    await FavoriteProductsStore.instance.reloadForCurrentAccount();
    await OrderStore.instance.reloadForCurrentAccount();

    if (!mounted) {
      return;
    }

    final signedInEmail = _firstAccountValue(account, const [
      'email',
      'accountEmail',
    ]);
    final defaultMessage = result.created
        ? 'Welcome! Your Switch account was created with Google.'
        : 'Signed in with Google.';
    final baseMessage = result.successMessage?.trim().isNotEmpty == true
        ? result.successMessage!
        : defaultMessage;
    AppSnackBar.showSuccess(
      context,
      message: signedInEmail.isNotEmpty
          ? '$baseMessage ($signedInEmail)'
          : baseMessage,
    );

    Navigator.of(context).pushNamedAndRemoveUntil(
      '/',
      (route) => false,
    );
  }

  // =========================================================================
  // _handleFacebookSignIn
  // =========================================================================
  // Placeholder handler for Facebook sign-in functionality.
  // Shows a "coming soon" message. To be implemented in future.
  // =========================================================================
  Future<void> _handleFacebookSignIn() async {
    _dismissKeyboard();
    await LoadingScreen.showWhile(context, () async {});

    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message: _t('feedback.method.comingSoon'),
    );
  }

  // =========================================================================
  // _openRegisterPage
  // =========================================================================
  // Navigates to the registration page for new users to create an account.
  // Passes the theme mode notifier to maintain theme preference.
  // =========================================================================
  void _openRegisterPage() {
    _dismissKeyboard();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => RegisterPage(
          themeModeNotifier: widget.themeModeNotifier,
        ),
      ),
    );
  }

  // =========================================================================
  // _openForgotPasswordPage
  // =========================================================================
  // Navigates to the forgot password page where users can reset their
  // password via email verification.
  // =========================================================================
  void _openForgotPasswordPage() {
    _dismissKeyboard();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => const ForgotPasswordPage(),
      ),
    );
  }

  Future<void> _handleBack() async {
    _dismissKeyboard();
    if (_googleVerifyMode) {
      _cancelGoogleVerification();
      return;
    }
    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.pop();
      return;
    }
    await _handleContinueAsGuest();
  }

  Future<void> _openSupportLink(String path) async {
    _dismissKeyboard();
    final base = (localApiEnvironmentBaseUrl.trim().isNotEmpty
            ? localApiEnvironmentBaseUrl
            : localApiLoopbackBaseUrl)
        .replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.parse('$base$path');
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && mounted) {
        AppSnackBar.showInfo(context, message: 'Example link: $uri');
      }
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showInfo(context, message: 'Example link: $uri');
    }
  }

  // =========================================================================
  // build
  // =========================================================================
  // Builds the main login page UI.
  // Structure:
  //   - Scaffold with background color based on theme
  //   - SafeArea to avoid system UI overlap
  //   - SingleChildScrollView for smaller screens
  //   - ConstrainedBox to limit max width (620px) for larger screens
  //   - Header with logo
  //   - Welcome text
  //   - Login form fields
  //   - Forgot password link
  //   - Sign In button
  //   - Secondary actions (guest, social sign-in, register)
  //   - Support footer (privacy, terms, help)
  // =========================================================================
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Secondary text color adapts to light/dark mode
    final secondaryTextColor = isDark ? Colors.white70 : Colors.black54;

    // Create a scoped theme with custom input decoration
    final scopedTheme = theme.copyWith(
      inputDecorationTheme: _buildLoginInputDecorationTheme(
        theme.inputDecorationTheme,
        isDark,
      ),
    );

    final scaffoldColor = isDark ? appDarkScaffoldColor : Colors.white;
    final iconColor = appIconColorForBrightness(theme.brightness);

    return Directionality(
      textDirection:
          _languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: scaffoldColor,
        appBar: AppBar(
          backgroundColor: scaffoldColor,
          elevation: 0,
          scrolledUnderElevation: 0,
          surfaceTintColor: Colors.transparent,
          toolbarHeight: 48,
          automaticallyImplyLeading: false,
          leading: IconButton(
            onPressed: _handleBack,
            tooltip: 'Back',
            icon: SvgPicture.asset(
              'assets/icons/arrow-left.svg',
              width: 24,
              height: 24,
              colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
            ),
          ),
          actions: [
            IconButton(
              onPressed: _openLanguagePicker,
              tooltip: _t('app.language'),
              icon: SvgPicture.asset(
                'assets/icons/globe.svg',
                width: 22,
                height: 22,
                colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 620),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
                  child: Theme(
                    data: scopedTheme,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _LoginHeader(),
                        Text(
                          _googleVerifyMode
                              ? 'Enter verification code'
                              : _t('app.welcome'),
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _googleVerifyMode
                              ? 'We sent a 6-digit code to ${_pendingGoogleProfile?.email.trim() ?? 'your email'}.'
                              : _t('panel.subtitle'),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: secondaryTextColor,
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_googleVerifyMode)
                          _LoginGoogleVerifyPanel(
                            theme: theme,
                            secondaryTextColor: secondaryTextColor,
                            controllers: _googleCodeControllers,
                            focusNodes: _googleCodeFocusNodes,
                            hasError: _showGoogleCodeError,
                            resendRemainingSeconds: _googleResendRemainingSeconds,
                            isSending: _isSendingGoogleCode,
                            isVerifying: _isVerifyingGoogleCode,
                            onDigitChanged: _onGoogleCodeDigitChanged,
                            onResend: () =>
                                _sendGoogleVerificationCode(isResend: true),
                            onCancel: _cancelGoogleVerification,
                          )
                        else ...[
                          _LoginFormFields(
                            formKey: _formKey,
                            emailController: _emailController,
                            passwordController: _passwordController,
                            validationStateNotifier: _validationStateNotifier,
                            onEmailErrorChanged: (showEmailError) {
                              _updateValidationState(
                                showEmailError: showEmailError,
                              );
                            },
                            passwordValidator: _validateLoginPassword,
                            onSignIn: _handleSignIn,
                            emailLabel: _t('app.email'),
                            passwordLabel: _t('role.admin.passwordLabel'),
                          ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: _openForgotPasswordPage,
                              style: TextButton.styleFrom(
                                foregroundColor: theme.colorScheme.primary,
                                visualDensity: VisualDensity.compact,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                _t('role.admin.helpText'),
                                style: TextStyle(
                                  color: theme.colorScheme.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _handleSignIn,
                              child: Text(_t('role.admin.submitText')),
                            ),
                          ),
                          const SizedBox(height: 10),
                          _LoginSecondaryActions(
                            theme: theme,
                            secondaryTextColor: secondaryTextColor,
                            onGoogleSignIn: _handleGoogleSignIn,
                            onFacebookSignIn: _handleFacebookSignIn,
                            onOpenRegister: _openRegisterPage,
                            orContinueLabel: _t('app.orContinue'),
                            signupPrompt: _t('signup.prompt'),
                            signupLink: _t('signup.link'),
                          ),
                        ],
                        const SizedBox(height: 10),
                        _LoginSupportLinks(
                          secondaryTextColor: secondaryTextColor,
                          accentColor: theme.colorScheme.primary,
                          onPrivacyPolicy: () =>
                              _openSupportLink('/privacy_policy.html'),
                          onTerms: () =>
                              _openSupportLink('/terms_conditions.html'),
                          onHelpCentre: () =>
                              _openSupportLink('/help_centre.html'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// =========================================================================
// _buildLoginInputDecorationTheme
// =========================================================================
// Creates a custom InputDecorationTheme for login form fields.
// Applies consistent styling across email and password fields.
// Parameters:
//   - decorationTheme: The existing input decoration theme from the app theme
//   - isDark: Whether dark mode is active
// Returns a customized InputDecorationTheme with:
//   - Filled background (dark grey in dark mode, light grey in light mode)
//   - Rounded border (8px radius)
//   - Consistent border styling for all states (enabled, focused, disabled, error)
// =========================================================================
dynamic _buildLoginInputDecorationTheme(dynamic decorationTheme, bool isDark) {
  return decorationTheme.copyWith(
    filled: true,
    fillColor: Colors.transparent,
    floatingLabelStyle: WidgetStateTextStyle.resolveWith((states) {
      if (states.contains(WidgetState.error)) {
        return const TextStyle(color: appInputErrorColor);
      }
      if (states.contains(WidgetState.focused)) {
        return TextStyle(color: isDark ? Colors.white : Colors.black);
      }
      return TextStyle(
        color: isDark ? Colors.white70 : appLightTextSecondary,
      );
    }),
    border: _copyInputBorderWithRadius(decorationTheme.border),
    enabledBorder: _copyInputBorderWithRadius(decorationTheme.enabledBorder),
    focusedBorder: _copyInputBorderWithRadius(decorationTheme.focusedBorder),
    disabledBorder: _copyInputBorderWithRadius(decorationTheme.disabledBorder),
    errorBorder: _copyInputBorderWithRadius(decorationTheme.errorBorder),
    focusedErrorBorder: _copyInputBorderWithRadius(
      decorationTheme.focusedErrorBorder,
    ),
  );
}

// =========================================================================
// _copyInputBorderWithRadius
// =========================================================================
// Helper function to create a copy of an InputBorder with rounded corners.
// Used to maintain consistent border styling while changing corner radius.
// Parameters:
//   - border: The InputBorder to copy (typically OutlineInputBorder)
// Returns a new OutlineInputBorder with 8px border radius, or the original
// border if it's not an OutlineInputBorder.
// =========================================================================
InputBorder? _copyInputBorderWithRadius(InputBorder? border) {
  if (border is OutlineInputBorder) {
    return border.copyWith(
      borderRadius: BorderRadius.circular(8),
    );
  }

  return border;
}

// =========================================================================
// _LoginGoogleVerifyPanel
// =========================================================================
// Replaces login form content when a new Google email must verify OTP before
// Instant Sign-In account create. Digit UI mirrors register verification step.
class _LoginGoogleVerifyPanel extends StatelessWidget {
  const _LoginGoogleVerifyPanel({
    required this.theme,
    required this.secondaryTextColor,
    required this.controllers,
    required this.focusNodes,
    required this.hasError,
    required this.resendRemainingSeconds,
    required this.isSending,
    required this.isVerifying,
    required this.onDigitChanged,
    required this.onResend,
    required this.onCancel,
  });

  final ThemeData theme;
  final Color secondaryTextColor;
  final List<TextEditingController> controllers;
  final List<FocusNode> focusNodes;
  final bool hasError;
  final int resendRemainingSeconds;
  final bool isSending;
  final bool isVerifying;
  final void Function(int index, String value) onDigitChanged;
  final Future<bool> Function() onResend;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark
        ? const Color(0xFF9AA0A6)
        : const Color.fromARGB(255, 204, 204, 204);
    final focusedColor = isDark ? Colors.white : Colors.black;
    final valueColor = isDark ? Colors.white : Colors.black;
    final resendLabel = resendRemainingSeconds > 0
        ? 'Resend code (${resendRemainingSeconds}s)'
        : 'Resend code';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Verification code',
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 10),
        LayoutBuilder(
          builder: (context, constraints) {
            const gap = 8.0;
            final boxSize = (constraints.maxWidth - gap * 5) / 6;
            return Row(
              children: [
                for (var index = 0; index < _googleVerifyCodeLength; index++) ...[
                  _LoginGoogleCodeDigitBox(
                    size: boxSize,
                    controller: controllers[index],
                    focusNode: focusNodes[index],
                    borderColor: borderColor,
                    focusedColor: focusedColor,
                    valueColor: valueColor,
                    hasError: hasError,
                    textStyle: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      height: 1,
                    ),
                    onChanged: (value) => onDigitChanged(index, value),
                  ),
                  if (index != _googleVerifyCodeLength - 1)
                    const SizedBox(width: gap),
                ],
              ],
            );
          },
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            'Did not receive the code?',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryTextColor,
            ),
          ),
        ),
        Center(
          child: TextButton(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
            onPressed: resendRemainingSeconds > 0 || isSending || isVerifying
                ? null
                : () => onResend(),
            child: Text(resendLabel),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: isSending || isVerifying ? null : onCancel,
            child: const Text('Back to sign in'),
          ),
        ),
      ],
    );
  }
}

class _LoginGoogleCodeDigitBox extends StatelessWidget {
  const _LoginGoogleCodeDigitBox({
    required this.size,
    required this.controller,
    required this.focusNode,
    required this.borderColor,
    required this.focusedColor,
    required this.valueColor,
    required this.hasError,
    required this.textStyle,
    required this.onChanged,
  });

  final double size;
  final TextEditingController controller;
  final FocusNode focusNode;
  final Color borderColor;
  final Color focusedColor;
  final Color valueColor;
  final bool hasError;
  final TextStyle? textStyle;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: focusNode,
      builder: (context, _) {
        final focused = focusNode.hasFocus;
        final Color activeBorderColor;
        final double borderWidth;
        if (hasError) {
          activeBorderColor = appInputErrorColor;
          borderWidth = focused ? 1.2 : 1.05;
        } else if (focused) {
          activeBorderColor = focusedColor;
          borderWidth = 1.05;
        } else {
          activeBorderColor = borderColor;
          borderWidth = 0.85;
        }

        return AnimatedContainer(
          duration: appMotionFrames(10),
          curve: Curves.easeOutCubic,
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: activeBorderColor,
              width: borderWidth,
            ),
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            textAlign: TextAlign.center,
            textAlignVertical: TextAlignVertical.center,
            keyboardType: TextInputType.number,
            maxLength: 1,
            style: textStyle?.copyWith(
              color: hasError ? appInputErrorColor : valueColor,
            ),
            cursorHeight: (textStyle?.fontSize ?? 22) * 1.1,
            cursorColor: hasError ? appInputErrorColor : focusedColor,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
            ],
            onChanged: onChanged,
            decoration: const InputDecoration(
              counterText: '',
              isDense: true,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              filled: false,
              contentPadding: EdgeInsets.zero,
            ),
          ),
        );
      },
    );
  }
}

// =========================================================================
// _LoginHeader
// =========================================================================
// Stateless widget that displays the app logo at the top of the login page.
// Shows the Switch logo image centered with padding below.
// =========================================================================
class _LoginHeader extends StatelessWidget {
  const _LoginHeader();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: Image(
          image: AssetImage('assets/images/switch-logo.png'),
          width: 72,
          height: 72,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

// =========================================================================
// _LoginFormFields
// =========================================================================
// Stateless widget that renders the email and password input fields.
// Uses ValueListenableBuilder to reactively update validation state.
// Manages form validation mode based on user interaction.
// =========================================================================
class _LoginFormFields extends StatelessWidget {
  const _LoginFormFields({
    required this.formKey,
    required this.emailController,
    required this.passwordController,
    required this.validationStateNotifier,
    required this.onEmailErrorChanged,
    required this.passwordValidator,
    required this.onSignIn,
    required this.emailLabel,
    required this.passwordLabel,
  });

  // Form key for validation
  final GlobalKey<FormState> formKey;
  // Controller for email input
  final TextEditingController emailController;
  // Controller for password input
  final TextEditingController passwordController;
  // Notifier for validation state (when to show errors)
  final ValueNotifier<_LoginValidationState> validationStateNotifier;
  // Callback when email error display state changes
  final ValueChanged<bool> onEmailErrorChanged;
  // Password validation function
  final String? Function(String?) passwordValidator;
  // Sign in callback when password field is submitted
  final Future<void> Function() onSignIn;
  final String emailLabel;
  final String passwordLabel;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<_LoginValidationState>(
      valueListenable: validationStateNotifier,
      builder: (context, validationState, child) {
        return Form(
          key: formKey,
          // Enable validation display only when user has interacted
          autovalidateMode: validationState.showValidationErrors
              ? AutovalidateMode.onUserInteraction
              : AutovalidateMode.disabled,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Email input field
              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                // Show email error when field becomes empty
                onChanged: (value) {
                  final shouldShowError = value.trim().isEmpty;

                  if (validationState.showEmailError != shouldShowError) {
                    onEmailErrorChanged(shouldShowError);
                  }
                },
                // Email validation - only shows when showEmailError is true
                validator: (value) {
                  if (!validationStateNotifier.value.showEmailError) {
                    return null;
                  }

                  return ErrorValidation.validateEmail(value);
                },
                decoration: InputDecoration(
                  labelText: emailLabel,
                  errorStyle: appInputBorderOnlyErrorStyle,
                ),
              ),
              const SizedBox(height: 16),
              // Password field with visibility toggle
              _LoginPasswordField(
                controller: passwordController,
                validator: passwordValidator,
                onFieldSubmitted: (_) => onSignIn(),
                labelText: passwordLabel,
              ),
            ],
          ),
        );
      },
    );
  }
}

// =========================================================================
// _LoginSecondaryActions
// =========================================================================
// Stateless widget that displays secondary login options:
// - Social sign-in buttons (Google, Facebook)
// - "Don't have an account? Sign up" link
// =========================================================================
class _LoginSecondaryActions extends StatelessWidget {
  const _LoginSecondaryActions({
    required this.theme,
    required this.secondaryTextColor,
    required this.onGoogleSignIn,
    required this.onFacebookSignIn,
    required this.onOpenRegister,
    required this.orContinueLabel,
    required this.signupPrompt,
    required this.signupLink,
  });

  // App theme for styling
  final ThemeData theme;
  // Color for secondary text elements
  final Color secondaryTextColor;
  // Callback for Google sign-in button
  final Future<void> Function() onGoogleSignIn;
  // Callback for Facebook sign-in button
  final Future<void> Function() onFacebookSignIn;
  // Callback for "Sign up" link
  final VoidCallback onOpenRegister;
  final String orContinueLabel;
  final String signupPrompt;
  final String signupLink;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Divider with "or continue with" text
        Row(
          children: [
            Expanded(
              child: Divider(
                color: secondaryTextColor.withValues(alpha: 0.35),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                orContinueLabel,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: secondaryTextColor,
                ),
              ),
            ),
            Expanded(
              child: Divider(
                color: secondaryTextColor.withValues(alpha: 0.35),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Social sign-in buttons row
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _LoginSocialSignInButton(
              assetPath: 'assets/images/google_logo.png',
              onTap: onGoogleSignIn,
            ),
            const SizedBox(width: 12),
            _LoginSocialSignInButton(
              assetPath: 'assets/images/facebook_logo.png',
              onTap: onFacebookSignIn,
            ),
          ],
        ),
        const SizedBox(height: 10),
        // "Don't have an account? Sign up" link
        Center(
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 4,
            children: [
              Text(
                signupPrompt,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: secondaryTextColor,
                ),
              ),
              TextButton(
                onPressed: onOpenRegister,
                style: TextButton.styleFrom(
                  foregroundColor: theme.colorScheme.primary,
                  visualDensity: VisualDensity.compact,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  signupLink,
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LoginSupportLinks extends StatelessWidget {
  const _LoginSupportLinks({
    required this.secondaryTextColor,
    required this.accentColor,
    required this.onPrivacyPolicy,
    required this.onTerms,
    required this.onHelpCentre,
  });

  final Color secondaryTextColor;
  final Color accentColor;
  final VoidCallback onPrivacyPolicy;
  final VoidCallback onTerms;
  final VoidCallback onHelpCentre;

  @override
  Widget build(BuildContext context) {
    final linkStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
          color: accentColor,
          fontWeight: FontWeight.w700,
          fontSize: 12.5,
        );
    final promptStyle = Theme.of(context).textTheme.bodySmall?.copyWith(
          color: secondaryTextColor,
          fontSize: 12.5,
        );

    Widget link(String label, VoidCallback onTap) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
          child: Text(label, style: linkStyle),
        ),
      );
    }

    return Center(
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        alignment: WrapAlignment.center,
        runAlignment: WrapAlignment.center,
        spacing: 12,
        runSpacing: 6,
        children: [
          link('Privacy Policy', onPrivacyPolicy),
          link('Terms & Conditions', onTerms),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text('Need support?', style: promptStyle),
              link('Help Centre', onHelpCentre),
            ],
          ),
        ],
      ),
    );
  }
}

// =========================================================================
// _LoginSocialSignInButton
// =========================================================================
// Stateless widget for social sign-in buttons (Google, Facebook).
// Displays a circular button with the social platform's logo.
// Uses Material InkWell for ripple effect on tap.
// =========================================================================
class _LoginSocialSignInButton extends StatelessWidget {
  const _LoginSocialSignInButton({
    required this.assetPath,
    required this.onTap,
  });

  // Path to the social platform's logo image
  final String assetPath;
  // Callback when button is tapped
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Get fill color from theme or use surface color as fallback
    final fillColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return Material(
      color: fillColor,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: () {
          onTap();
        },
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 58,
          height: 58,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Image.asset(
              assetPath,
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }
}

// =========================================================================
// _LoginValidationState
// =========================================================================
// Immutable class that holds validation state for the login form.
// Used with ValueNotifier to reactively update the UI when validation
// state changes.
// =========================================================================
class _LoginValidationState {
  // Constructor with optional named parameters
  const _LoginValidationState({
    this.showValidationErrors = false,
    this.showEmailError = false,
  });

  // Whether to show validation errors on form fields
  // Set to true after user attempts to sign in with empty fields
  final bool showValidationErrors;
  // Whether to show email validation error
  // Set to true when email field is empty
  final bool showEmailError;

  // Creates a copy with optional new values
  _LoginValidationState copyWith({
    bool? showValidationErrors,
    bool? showEmailError,
  }) {
    return _LoginValidationState(
      showValidationErrors:
          showValidationErrors ?? this.showValidationErrors,
      showEmailError: showEmailError ?? this.showEmailError,
    );
  }

  // Equality comparison for ValueNotifier updates
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }

    return other is _LoginValidationState &&
        other.showValidationErrors == showValidationErrors &&
        other.showEmailError == showEmailError;
  }

  // Hash code for use in collections
  @override
  int get hashCode => Object.hash(showValidationErrors, showEmailError);
}

// =========================================================================
// _LoginPasswordField
// =========================================================================
// Stateful widget for the password input field.
// Features:
//   - Password visibility toggle (show/hide password)
//   - Form validation support
//   - Submit callback when user presses done on keyboard
// =========================================================================
class _LoginPasswordField extends StatefulWidget {
  const _LoginPasswordField({
    required this.controller,
    required this.validator,
    required this.onFieldSubmitted,
    required this.labelText,
  });

  // Controller for the password text input
  final TextEditingController controller;
  // Validation function for the password field
  final String? Function(String?) validator;
  // Callback when user submits the field (presses done on keyboard)
  final ValueChanged<String> onFieldSubmitted;
  final String labelText;

  @override
  State<_LoginPasswordField> createState() => _LoginPasswordFieldState();
}

// =========================================================================
// _LoginPasswordFieldState
// =========================================================================
// State class for _LoginPasswordField.
// Manages password visibility toggle state.
// =========================================================================
class _LoginPasswordFieldState extends State<_LoginPasswordField> {
  // Whether password text is obscured (hidden)
  bool _obscurePassword = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final passwordToggleColor = appIconColorForBrightness(theme.brightness);

    return TextFormField(
      controller: widget.controller,
      obscureText: _obscurePassword,
      textInputAction: TextInputAction.done,
      validator: widget.validator,
      onFieldSubmitted: widget.onFieldSubmitted,
      decoration: InputDecoration(
        labelText: widget.labelText,
        errorStyle: appInputBorderOnlyErrorStyle,
        // Toggle button to show/hide password
        suffixIcon: IconButton(
          onPressed: () {
            setState(() {
              _obscurePassword = !_obscurePassword;
            });
          },
          icon: PasswordVisibilityIcon(
            obscured: _obscurePassword,
            color: passwordToggleColor,
          ),
        ),
      ),
    );
  }
}

class LoginLanguagePickerSheet extends StatelessWidget {
  const LoginLanguagePickerSheet({
    super.key,
    required this.selectedCode,
  });

  final String selectedCode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final height = MediaQuery.sizeOf(context).height * 0.7;
    final selected = AppLoginLanguages.normalize(selectedCode);

    return SizedBox(
      height: height,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 8),
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.dividerColor,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              AppLoginLanguages.t(selected, 'app.language'),
              // Match `.md-right-panel__title strong` (font-weight: 500)
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: AppLoginLanguages.options.length,
              itemBuilder: (context, index) {
                final option = AppLoginLanguages.options[index];
                final isSelected = option.code == selected;
                return ListTile(
                  title: Text(
                    option.label,
                    // Match `.md-language-panel__option-label` (font-weight: 500)
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  trailing: isSelected
                      ? Icon(
                          Icons.check_rounded,
                          color: theme.colorScheme.primary,
                        )
                      : null,
                  selected: isSelected,
                  onTap: () => Navigator.of(context).pop(option.code),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
