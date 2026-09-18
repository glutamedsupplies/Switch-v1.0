// Core Flutter async utilities (unawaited futures, timers)
import 'dart:async';

// Flutter material design widgets and theming
import 'package:flutter/material.dart';
// Input formatting utilities (digit-only filter, length limiter)
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
// Navigates to the Change Password screen after successful verification
import 'package:gms_shopping/change_password.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/login_redirect.dart';
import 'package:gms_shopping/models/registration_draft.dart';
import 'package:gms_shopping/services/account_registration.dart';
import 'package:gms_shopping/services/app_language_preference.dart';
import 'package:gms_shopping/services/verification_service.dart';
// Custom snackbar helper for showing success/error messages
import 'package:gms_shopping/theme/app_snack_bar.dart';
// App-wide theme constants (colors, gradients, motion durations)
import 'package:gms_shopping/theme/app_theme.dart';
// Full-screen loading overlay shown during API calls
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';

enum VerifyCodePurpose {
  passwordReset,
  registration,
}

// ─── Constants ───────────────────────────────────────────────────────────────

/// Number of digits in the verification code (6-digit OTP)
const int _verifyCodeLength = 6;

/// Cooldown period before the user can request a new code (60 seconds)
const Duration _resendCooldown = Duration(seconds: 60);

// ─── Session Model ───────────────────────────────────────────────────────────

/// Holds the state for a single verification session tied to an email address.
/// Tracks the entered digits and when the resend button becomes available again.
class _VerifyCodeSession {
  _VerifyCodeSession({
    DateTime? resendAvailableAt,
    int? resendCooldownSeconds,
    List<String>? digits,
  }) : resendAvailableAt = resendAvailableAt ??
           DateTime.now().add(
             Duration(
               seconds: resendCooldownSeconds ?? _resendCooldown.inSeconds,
             ),
           ),
       digits = digits ?? List.filled(_verifyCodeLength, '');

  /// Timestamp after which the "Resend code" button becomes active
  DateTime resendAvailableAt;

  /// The 6 individual digit strings entered by the user (index 0–5)
  final List<String> digits;
}

// ─── Page Widget ─────────────────────────────────────────────────────────────

/// Full-screen page where the user enters the 6-digit verification code
/// sent to their email. On success, navigates to [ChangePasswordPage].
class VerifyCodePage extends StatefulWidget {
  const VerifyCodePage({
    super.key,
    required this.email,
    this.purpose = VerifyCodePurpose.passwordReset,
    this.registrationDraft,
    this.themeModeNotifier,
    this.resendAvailableAt,
    this.resendCooldownSeconds,
  });

  /// The email address the verification code was sent to
  final String email;
  final VerifyCodePurpose purpose;
  final RegistrationDraft? registrationDraft;
  final ValueNotifier<ThemeMode>? themeModeNotifier;

  /// Absolute time when resend becomes available (from a prior send response).
  final DateTime? resendAvailableAt;

  /// Cooldown seconds when creating a new session without [resendAvailableAt].
  final int? resendCooldownSeconds;

  @override
  State<VerifyCodePage> createState() => _VerifyCodePageState();
}

// ─── Page State ──────────────────────────────────────────────────────────────

/// Manages all business logic for the verification code screen:
/// - Digit input handling and auto-advance
/// - Countdown timer for the resend button
/// - Code validation and submission
/// - Session persistence across rebuilds (static map)
class _VerifyCodePageState extends State<VerifyCodePage> {
  /// Static cache of verification sessions keyed by normalized email.
  /// Survives widget rebuilds so the user doesn't lose entered digits
  /// when navigating away and back.
  static final Map<String, _VerifyCodeSession> _sessions = {};

  /// Text controllers for each of the 6 digit input fields
  late final List<TextEditingController> _controllers;

  /// Focus nodes for each digit field, used to programmatically move focus
  late final List<FocusNode> _focusNodes;

  /// The current session (either restored from cache or newly created)
  late final _VerifyCodeSession _session;

  /// Current theme data, resolved in didChangeDependencies
  late ThemeData _theme;

  /// Muted text color for secondary labels (adapts to light/dark mode)
  late Color _secondaryTextColor;

  /// Color used for the resend countdown label text
  late Color _resendCountdownColor;

  late TextStyle? _headerTitleStyle;
  late TextStyle? _headerBodyStyle;

  /// Whether to show validation error styling on empty digit fields
  final ValueNotifier<bool> _showCodeErrorNotifier = ValueNotifier(false);

  /// Live countdown (in seconds) until the resend button becomes active
  final ValueNotifier<int> _remainingSecondsNotifier = ValueNotifier(0);

  /// Periodic timer that decrements the resend countdown every second
  Timer? _countdownTimer;

  /// Guard flag to prevent duplicate verification requests
  bool _isVerifyingCode = false;

  late final VerificationService _verificationService;
  late final AccountRegistrationService _accountRegistrationService;

  String get _verificationPurpose =>
      widget.purpose == VerifyCodePurpose.registration
          ? 'registration'
          : 'password_reset';

  /// Returns a normalized session key from the user's email (lowercased, trimmed)
  String get _sessionKey => widget.email.trim().toLowerCase();

  /// Dismisses the soft keyboard
  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    // Resolve theme-dependent colors whenever the theme changes
    _theme = Theme.of(context);
    final isDark = _theme.brightness == Brightness.dark;

    _secondaryTextColor = isDark ? Colors.white70 : Colors.black54;
    _resendCountdownColor =
        _theme.textTheme.bodyMedium?.color ??
        (isDark ? Colors.white : Colors.black87);
    _headerTitleStyle = _theme.textTheme.headlineSmall?.copyWith(
      fontWeight: FontWeight.w700,
    );
    _headerBodyStyle = _theme.textTheme.bodyMedium?.copyWith(
      color: _secondaryTextColor,
    );
  }

  @override
  void initState() {
    super.initState();
    _verificationService = createVerificationService();
    _accountRegistrationService = createAccountRegistrationService();

    // Restore existing session or create a new one for this email
    _session = _sessions.putIfAbsent(
      _sessionKey,
      () => _VerifyCodeSession(
        resendAvailableAt: widget.resendAvailableAt,
        resendCooldownSeconds: widget.resendCooldownSeconds,
      ),
    );

    // Create 6 text controllers and focus nodes (one per digit)
    _controllers = List.generate(
      _verifyCodeLength,
      (_) => TextEditingController(),
    );
    _focusNodes = List.generate(
      _verifyCodeLength,
      (_) => FocusNode(),
    );

    // Restore previously entered digits and attach focus listeners
    for (var index = 0; index < _controllers.length; index++) {
      final fieldIndex = index;

      _controllers[fieldIndex].text = _session.digits[fieldIndex];
      _focusNodes[fieldIndex].addListener(() {
        // Select all text when a field gains focus for easy overwrite
        if (_focusNodes[fieldIndex].hasFocus) {
          _selectDigit(fieldIndex);
        }
      });
    }

    // Start the resend countdown timer
    _updateRemainingSeconds();
    _startCountdownTicker();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _showCodeErrorNotifier.dispose();
    _remainingSecondsNotifier.dispose();
    for (final controller in _controllers) {
      controller.dispose();
    }
    for (final focusNode in _focusNodes) {
      focusNode.dispose();
    }
    super.dispose();
  }

  /// Concatenates all 6 digit fields into a single code string
  String get _verificationCode {
    return _controllers.map((controller) => controller.text.trim()).join();
  }

  /// Returns true when all 6 digits are filled (no empty/whitespace fields)
  bool get _isCodeComplete {
    return _verificationCode.length == _verifyCodeLength &&
        !_verificationCode.contains(RegExp(r'\s'));
  }

  /// Calculates how many seconds remain until the resend button is active
  int _computeRemainingSeconds() {
    final difference =
        _session.resendAvailableAt.difference(DateTime.now()).inSeconds;
    return difference > 0 ? difference : 0;
  }

  /// Updates the [ValueNotifier] with the latest remaining seconds,
  /// avoiding unnecessary rebuilds when the value hasn't changed
  void _updateRemainingSeconds() {
    final nextValue = _computeRemainingSeconds();
    if (_remainingSecondsNotifier.value == nextValue) {
      return;
    }

    _remainingSecondsNotifier.value = nextValue;
  }

  /// Starts a 1-second periodic timer that updates the resend countdown.
  /// Automatically stops when the countdown reaches zero.
  void _startCountdownTicker() {
    _countdownTimer?.cancel();
    _updateRemainingSeconds();

    if (_remainingSecondsNotifier.value == 0) {
      return;
    }

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      _updateRemainingSeconds();

      if (_remainingSecondsNotifier.value == 0) {
        timer.cancel();
      }
    });
  }

  /// Selects all text in the digit field at [index] so the user can
  /// easily overwrite it by typing a new digit
  void _selectDigit(int index) {
    final controller = _controllers[index];

    controller.selection = TextSelection(
      baseOffset: 0,
      extentOffset: controller.text.length,
    );
  }

  /// Handles digit input changes:
  /// - Persists the digit to the session
  /// - Clears error state when digits are filled
  /// - Auto-advances focus to the next field
  /// - Auto-submits when all 6 digits are entered
  void _handleCodeChanged(int index, String value) {
    _session.digits[index] = value;

    // Clear error styling once all fields have content
    if (_showCodeErrorNotifier.value) {
      final shouldShowCodeError = _controllers.any(
        (controller) => controller.text.trim().isEmpty,
      );
      if (_showCodeErrorNotifier.value != shouldShowCodeError) {
        _showCodeErrorNotifier.value = shouldShowCodeError;
      }
    }

    // Auto-advance to next field when a digit is entered
    if (value.isNotEmpty && index < _verifyCodeLength - 1) {
      _focusNodes[index + 1].requestFocus();
      _triggerAutoVerifyIfComplete();
      return;
    }

    // Dismiss keyboard and auto-submit when the last digit is entered
    if (value.isNotEmpty && index == _verifyCodeLength - 1) {
      _dismissKeyboard();
      _triggerAutoVerifyIfComplete();
      return;
    }

    // Move focus back to previous field when deleting an empty field
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
  }

  /// Automatically triggers verification when all 6 digits are filled,
  /// without showing an "incomplete" error message
  void _triggerAutoVerifyIfComplete() {
    if (!_isCodeComplete || _isVerifyingCode) {
      return;
    }

    unawaited(_handleVerifyCode(showIncompleteError: false));
  }

  /// Validates and submits the verification code:
  /// - Shows error if the code is incomplete (when [showIncompleteError] is true)
  /// - Shows a loading overlay during the API call
  /// - On success: clears the session and navigates to [ChangePasswordPage]
  Future<void> _handleVerifyCode({
    bool showIncompleteError = true,
  }) async {
    if (_isVerifyingCode) {
      return;
    }

    _dismissKeyboard();

    // Validate that all 6 digits are filled
    if (!_isCodeComplete) {
      if (showIncompleteError) {
        if (!_showCodeErrorNotifier.value) {
          _showCodeErrorNotifier.value = true;
        }
        AppSnackBar.showError(
          context,
          message: 'Enter the 6-digit verification code.',
        );
      }
      return;
    }

    _isVerifyingCode = true;

    try {
      if (widget.purpose == VerifyCodePurpose.registration) {
        final draft = widget.registrationDraft;
        if (draft == null) {
          throw const VerificationException(
            'Registration details are missing. Go back and try again.',
          );
        }

        await LoadingScreen.showWhile(context, () async {
          final verifyResult = await _verificationService.verifyVerificationCode(
            purpose: _verificationPurpose,
            channel: 'email',
            email: widget.email,
            code: _verificationCode,
          );

          await _accountRegistrationService.registerAppAccount(
            firstName: draft.firstName,
            lastName: draft.lastName,
            countryCode: draft.countryCode,
            mobileNumber: draft.mobileNumber,
            email: draft.email,
            password: draft.password,
            verificationToken: verifyResult.verificationToken,
            verificationChannel: verifyResult.channel,
            preferredLanguage: await AppLanguagePreference.getGuestLanguage(),
            googleProfile: draft.googleProfile,
          );
          await GuestSession.clear();
        });
      } else {
        await LoadingScreen.showWhile(context, () async {
          await _verificationService.verifyVerificationCode(
            purpose: _verificationPurpose,
            channel: 'email',
            email: widget.email,
            code: _verificationCode,
          );
        });
      }
    } on VerificationException catch (error) {
      if (mounted) {
        AppSnackBar.showError(context, message: error.message);
      }
      return;
    } on AccountRegistrationException catch (error) {
      if (mounted) {
        AppSnackBar.showError(context, message: error.message);
      }
      return;
    } catch (error) {
      if (mounted) {
        AppSnackBar.showError(
          context,
          message: error.toString(),
        );
      }
      return;
    } finally {
      _isVerifyingCode = false;
    }

    if (!mounted) {
      return;
    }

    // Remove session from cache so a fresh code is required next time
    _sessions.remove(_sessionKey);

    if (widget.purpose == VerifyCodePurpose.registration) {
      AppSnackBar.showSuccess(
        context,
        message: 'Account created!',
      );

      await Future.delayed(const Duration(milliseconds: 800));

      if (!mounted) {
        return;
      }

      final themeModeNotifier = widget.themeModeNotifier;
      if (themeModeNotifier != null) {
        redirectGuestToLogin(context, themeModeNotifier: themeModeNotifier);
      } else {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
      return;
    }

    // Navigate to the change password screen, replacing this page
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (context) => ChangePasswordPage(
          email: widget.email,
        ),
      ),
    );
  }

  /// Requests a new verification code from the server.
  /// Only available when the countdown has reached zero.
  /// Resets the resend cooldown timer on success.
  Future<void> _handleResendCode() async {
    if (_remainingSecondsNotifier.value != 0) {
      return;
    }

    _dismissKeyboard();

    late final VerificationSendResult result;
    try {
      result = await LoadingScreen.showWhile(context, () async {
        return await _verificationService.sendVerificationCode(
          purpose: _verificationPurpose,
          channel: 'email',
          email: widget.email,
        );
      });
    } on VerificationException catch (error) {
      if (mounted) {
        AppSnackBar.showError(context, message: error.message);
      }
      return;
    }

    if (!mounted) {
      return;
    }

    if (result.debugCode != null && result.debugCode!.isNotEmpty) {
      AppSnackBar.showSuccess(
        context,
        message: 'Dev code: ${result.debugCode}',
      );
    }

    // Prefer server-provided resend window; fall back to cooldown / 60s
    _session.resendAvailableAt = result.resendAvailableAt ??
        DateTime.now().add(
          Duration(
            seconds: result.resendCooldownSeconds ?? _resendCooldown.inSeconds,
          ),
        );
    _startCountdownTicker();

    AppSnackBar.showSuccess(
      context,
      message: 'A new code is on the way.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = _theme.brightness == Brightness.dark;
    final scaffoldColor = isDark ? appDarkScaffoldColor : Colors.white;
    final iconColor = appIconColorForBrightness(_theme.brightness);

    return Scaffold(
      backgroundColor: scaffoldColor,
      appBar: AppBar(
        backgroundColor: scaffoldColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        automaticallyImplyLeading: false,
        leading: IconButton(
          onPressed: () {
            _dismissKeyboard();
            Navigator.of(context).pop();
          },
          tooltip: 'Back',
          icon: SvgPicture.asset(
            'assets/icons/arrow-left.svg',
            width: 24,
            height: 24,
            colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
          ),
        ),
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 650),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Verification code',
                      style: _headerTitleStyle,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enter the 6-digit code sent to ${widget.email}.',
                      style: _headerBodyStyle,
                    ),
                    const SizedBox(height: 24),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        const gap = 8.0;
                        final boxSize =
                            (constraints.maxWidth - gap * (_verifyCodeLength - 1)) /
                                _verifyCodeLength;
                        final borderColor = isDark
                            ? const Color(0xFF9AA0A6)
                            : const Color.fromARGB(255, 204, 204, 204);
                        final focusedColor =
                            isDark ? Colors.white : Colors.black;
                        final valueColor =
                            isDark ? Colors.white : Colors.black;

                        return Row(
                          children: [
                            for (var index = 0;
                                index < _verifyCodeLength;
                                index++) ...[
                              _VerifyCodeDigitBox(
                                size: boxSize,
                                index: index,
                                controller: _controllers[index],
                                focusNode: _focusNodes[index],
                                borderColor: borderColor,
                                focusedColor: focusedColor,
                                valueColor: valueColor,
                                showCodeErrorListenable: _showCodeErrorNotifier,
                                textStyle: _theme.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  height: 1,
                                ),
                                onTap: () => _selectDigit(index),
                                onChanged: (value) =>
                                    _handleCodeChanged(index, value),
                                onSubmitted: (_) {
                                  if (index == _verifyCodeLength - 1) {
                                    _handleVerifyCode();
                                  }
                                },
                              ),
                              if (index != _verifyCodeLength - 1)
                                const SizedBox(width: gap),
                            ],
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        'Did not receive the code?',
                        textAlign: TextAlign.center,
                        style: _headerBodyStyle,
                      ),
                    ),
                    Center(
                      child: _VerifyCodeResendButton(
                        remainingSecondsListenable: _remainingSecondsNotifier,
                        primaryColor: _theme.colorScheme.primary,
                        disabledForegroundColor: _resendCountdownColor,
                        textStyle: _theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                        onPressed: _handleResendCode,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Helper: Resend Label Formatter ──────────────────────────────────────────

/// Formats the resend button label based on remaining seconds.
/// Returns "Resend code" when ready, or "Resend code (MM:SS)" during cooldown.
String _resendLabelFromSeconds(int remainingSeconds) {
  if (remainingSeconds == 0) {
    return 'Resend code';
  }

  final minutes = (remainingSeconds ~/ 60).toString().padLeft(2, '0');
  final seconds = (remainingSeconds % 60).toString().padLeft(2, '0');

  return 'Resend code ($minutes:$seconds)';
}

// ─── Digit Input Field ───────────────────────────────────────────────────────

/// A single square digit box matching the register OTP pattern.
class _VerifyCodeDigitBox extends StatelessWidget {
  const _VerifyCodeDigitBox({
    required this.size,
    required this.index,
    required this.controller,
    required this.focusNode,
    required this.borderColor,
    required this.focusedColor,
    required this.valueColor,
    required this.showCodeErrorListenable,
    required this.textStyle,
    required this.onTap,
    required this.onChanged,
    required this.onSubmitted,
  });

  final double size;
  final int index;
  final TextEditingController controller;
  final FocusNode focusNode;
  final Color borderColor;
  final Color focusedColor;
  final Color valueColor;
  final ValueNotifier<bool> showCodeErrorListenable;
  final TextStyle? textStyle;
  final VoidCallback onTap;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: showCodeErrorListenable,
      builder: (context, showCodeError, _) {
        return ValueListenableBuilder<TextEditingValue>(
          valueListenable: controller,
          builder: (context, value, _) {
            final hasError = showCodeError && value.text.trim().isEmpty;

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
                    textInputAction: index == _verifyCodeLength - 1
                        ? TextInputAction.done
                        : TextInputAction.next,
                    maxLength: 1,
                    style: textStyle?.copyWith(
                      color: hasError ? appInputErrorColor : valueColor,
                    ),
                    cursorHeight: (textStyle?.fontSize ?? 22) * 1.1,
                    cursorColor: hasError ? appInputErrorColor : focusedColor,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(1),
                    ],
                    onTap: onTap,
                    onChanged: onChanged,
                    onSubmitted: onSubmitted,
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
          },
        );
      },
    );
  }
}

// ─── Resend Button ───────────────────────────────────────────────────────────

/// Displays the "Resend code" button with a live countdown.
/// The button is disabled (greyed out) while the countdown is active,
/// and becomes tappable (primary color) when the countdown reaches zero.
class _VerifyCodeResendButton extends StatelessWidget {
  const _VerifyCodeResendButton({
    required this.remainingSecondsListenable,
    required this.primaryColor,
    required this.disabledForegroundColor,
    required this.textStyle,
    required this.onPressed,
  });

  final ValueNotifier<int> remainingSecondsListenable;
  final Color primaryColor;
  final Color disabledForegroundColor;
  final TextStyle? textStyle;
  final Future<void> Function() onPressed;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: remainingSecondsListenable,
      builder: (context, remainingSeconds, child) {
        return TextButton(
          style: TextButton.styleFrom(
            foregroundColor: primaryColor,
            disabledForegroundColor: disabledForegroundColor,
            textStyle: textStyle,
            padding: EdgeInsets.zero,
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
          ),
          // Disabled (null) while countdown is active; enabled when 0
          onPressed: remainingSeconds == 0 ? onPressed : null,
          child: Text(_resendLabelFromSeconds(remainingSeconds)),
        );
      },
    );
  }
}
