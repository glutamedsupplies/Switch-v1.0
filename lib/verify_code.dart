// Core Flutter async utilities (unawaited futures, timers)
import 'dart:async';

// Flutter material design widgets and theming
import 'package:flutter/material.dart';
// Input formatting utilities (digit-only filter, length limiter)
import 'package:flutter/services.dart';
// Navigates to the Change Password screen after successful verification
import 'package:gms_shopping/change_password.dart';
// Custom snackbar helper for showing success/error messages
import 'package:gms_shopping/theme/app_snack_bar.dart';
// App-wide theme constants (colors, gradients, motion durations)
import 'package:gms_shopping/theme/app_theme.dart';
// Full-screen loading overlay shown during API calls
import 'package:gms_shopping/theme/loadingscreen.dart';

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
    List<String>? digits,
  }) : resendAvailableAt =
           resendAvailableAt ?? DateTime.now().add(_resendCooldown),
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
  });

  /// The email address the verification code was sent to
  final String email;

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

  /// Gradient background colors for the page (adapts to light/dark mode)
  late List<Color> _backgroundColors;

  /// Whether to show validation error styling on empty digit fields
  final ValueNotifier<bool> _showCodeErrorNotifier = ValueNotifier(false);

  /// Live countdown (in seconds) until the resend button becomes active
  final ValueNotifier<int> _remainingSecondsNotifier = ValueNotifier(0);

  /// Periodic timer that decrements the resend countdown every second
  Timer? _countdownTimer;

  /// Guard flag to prevent duplicate verification requests
  bool _isVerifyingCode = false;

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
    _backgroundColors = appLoginBackgroundColors(
      theme: _theme,
      isDark: isDark,
    );
  }

  @override
  void initState() {
    super.initState();

    // Restore existing session or create a new one for this email
    _session = _sessions.putIfAbsent(
      _sessionKey,
      () => _VerifyCodeSession(),
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
      // Show loading spinner while the API call runs
      await LoadingScreen.showWhile(context, () async {});
    } finally {
      _isVerifyingCode = false;
    }

    if (!mounted) {
      return;
    }

    // Remove session from cache so a fresh code is required next time
    _sessions.remove(_sessionKey);

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
    await LoadingScreen.showWhile(context, () async {});

    // Reset the cooldown: user must wait another 60 seconds
    _session.resendAvailableAt = DateTime.now().add(_resendCooldown);
    _startCountdownTicker();

    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message: 'A new code is on the way.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          // Full-screen gradient background (adapts to light/dark mode)
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: _backgroundColors,
          ),
        ),
        child: SafeArea(
          child: _VerifyCodeViewport(
            theme: _theme,
            email: widget.email,
            secondaryTextColor: _secondaryTextColor,
            resendCountdownColor: _resendCountdownColor,
            controllers: _controllers,
            focusNodes: _focusNodes,
            showCodeErrorNotifier: _showCodeErrorNotifier,
            remainingSecondsNotifier: _remainingSecondsNotifier,
            onBack: () {
              _dismissKeyboard();
              Navigator.of(context).pop();
            },
            onSelectDigit: _selectDigit,
            onCodeChanged: _handleCodeChanged,
            onVerifyCode: _handleVerifyCode,
            onResendCode: _handleResendCode,
          ),
        ),
      ),
    );
  }
}

// ─── Viewport (Scrollable Layout) ────────────────────────────────────────────

/// Stateless layout widget that arranges the verification code UI
/// inside a scrollable container. Handles responsive constraints
/// so the content is centered and scrollable on small screens.
class _VerifyCodeViewport extends StatelessWidget {
  const _VerifyCodeViewport({
    required this.theme,
    required this.email,
    required this.secondaryTextColor,
    required this.resendCountdownColor,
    required this.controllers,
    required this.focusNodes,
    required this.showCodeErrorNotifier,
    required this.remainingSecondsNotifier,
    required this.onBack,
    required this.onSelectDigit,
    required this.onCodeChanged,
    required this.onVerifyCode,
    required this.onResendCode,
  });

  final ThemeData theme;
  final String email;
  final Color secondaryTextColor;
  final Color resendCountdownColor;
  final List<TextEditingController> controllers;
  final List<FocusNode> focusNodes;
  final ValueNotifier<bool> showCodeErrorNotifier;
  final ValueNotifier<int> remainingSecondsNotifier;
  final VoidCallback onBack;
  final ValueChanged<int> onSelectDigit;
  final void Function(int, String) onCodeChanged;
  final Future<void> Function({bool showIncompleteError}) onVerifyCode;
  final Future<void> Function() onResendCode;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 8,
          ),
          child: ConstrainedBox(
            // Ensure the content fills at least the full viewport height
            constraints: BoxConstraints(
              minHeight: constraints.maxHeight,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header section: back button, icon, title, and email hint
                _VerifyCodeIntro(
                  theme: theme,
                  email: email,
                  secondaryTextColor: secondaryTextColor,
                  onBack: onBack,
                ),
                const SizedBox(height: 36),
                Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    // Limit the input area width for readability on wide screens
                    constraints: const BoxConstraints(maxWidth: 360),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Row of 6 individual digit input fields
                          Row(
                            children: [
                              for (var index = 0;
                                  index < _verifyCodeLength;
                                  index++) ...[
                                Expanded(
                                  child: _VerifyCodeDigitField(
                                    theme: theme,
                                    index: index,
                                    controller: controllers[index],
                                    focusNode: focusNodes[index],
                                    showCodeErrorListenable:
                                        showCodeErrorNotifier,
                                    onTap: () => onSelectDigit(index),
                                    onChanged: (value) =>
                                        onCodeChanged(index, value),
                                    onSubmitted: (_) {
                                      // Submit when user presses "done" on the last field
                                      if (index == _verifyCodeLength - 1) {
                                        onVerifyCode();
                                      }
                                    },
                                  ),
                                ),
                                if (index != _verifyCodeLength - 1)
                                  const SizedBox(width: 8),
                              ],
                            ],
                          ),
                          const SizedBox(height: 16),
                          // Resend code button with countdown
                          _VerifyCodeResendButton(
                            remainingSecondsListenable: remainingSecondsNotifier,
                            primaryColor: theme.colorScheme.primary,
                            disabledForegroundColor: resendCountdownColor,
                            textStyle: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                            onPressed: onResendCode,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ─── Header Section ──────────────────────────────────────────────────────────

/// Displays the back button, verification icon, title, and email hint
/// at the top of the verification code screen.
class _VerifyCodeIntro extends StatelessWidget {
  const _VerifyCodeIntro({
    required this.theme,
    required this.email,
    required this.secondaryTextColor,
    required this.onBack,
  });

  final ThemeData theme;
  final String email;
  final Color secondaryTextColor;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Back navigation arrow
          IconButton(
            onPressed: onBack,
            padding: EdgeInsets.zero,
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
          const SizedBox(height: 12),
          // Shield/verified icon in the primary theme color
          Icon(
            Icons.verified_user_outlined,
            color: theme.colorScheme.primary,
            size: 72,
          ),
          const SizedBox(height: 20),
          // Page title
          Text(
            'Verification code',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          // Instruction text showing which email the code was sent to
          Text(
            'Enter the 6-digit code sent to $email.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryTextColor,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Helper: Input Decoration Builder ────────────────────────────────────────

/// Builds the [InputDecoration] for a single digit field.
/// Applies error border styling when [hasError] is true.
InputDecoration _buildCodeDecoration(ThemeData theme, bool hasError) {
  final isDark = theme.brightness == Brightness.dark;
  final fillColor = isDark ? const Color(0xFF2A2A2A) : const Color(0xFFFAFAFA);

  return InputDecoration(
    counterText: '', // Hide the character counter
    filled: true,
    fillColor: fillColor,
    contentPadding: const EdgeInsets.symmetric(
      horizontal: 0,
      vertical: 18,
    ),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: hasError
          ? const BorderSide(
              color: appInputErrorColor,
              width: 1.35,
            )
          : BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: hasError
          ? const BorderSide(
              color: appInputErrorColor,
              width: 1.55,
            )
          : BorderSide.none,
    ),
  );
}

// ─── Helper: Resend Label Formatter ──────────────────────────────────────────

/// Formats the resend button label based on remaining seconds.
/// Returns "Resend code" when ready, or "Resend code in MM:SS" during cooldown.
String _resendLabelFromSeconds(int remainingSeconds) {
  if (remainingSeconds == 0) {
    return 'Resend code';
  }

  final minutes = (remainingSeconds ~/ 60).toString().padLeft(2, '0');
  final seconds = (remainingSeconds % 60).toString().padLeft(2, '0');

  return 'Resend code in $minutes:$seconds';
}

// ─── Digit Input Field ───────────────────────────────────────────────────────

/// A single digit input field in the 6-digit verification code row.
/// - Accepts only numeric input (0-9)
/// - Limited to 1 character
/// - Shows error styling when validation fails
/// - Auto-selects all text on tap for easy overwrite
class _VerifyCodeDigitField extends StatelessWidget {
  const _VerifyCodeDigitField({
    required this.theme,
    required this.index,
    required this.controller,
    required this.focusNode,
    required this.showCodeErrorListenable,
    required this.onTap,
    required this.onChanged,
    required this.onSubmitted,
  });

  final ThemeData theme;
  final int index;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueNotifier<bool> showCodeErrorListenable;
  final VoidCallback onTap;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: showCodeErrorListenable,
      builder: (context, showCodeError, child) {
        return ValueListenableBuilder<TextEditingValue>(
          valueListenable: controller,
          builder: (context, value, child) {
            // Show error border only when validation is active AND the field is empty
            final hasError = showCodeError && value.text.trim().isEmpty;

            return SizedBox(
              height: 58,
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                textAlignVertical: TextAlignVertical.center,
                // "Done" action on the last field, "Next" on all others
                textInputAction: index == _verifyCodeLength - 1
                    ? TextInputAction.done
                    : TextInputAction.next,
                maxLength: 1,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly, // Only allow 0-9
                  LengthLimitingTextInputFormatter(1), // Max 1 character
                ],
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
                onTap: onTap,
                onChanged: onChanged,
                onSubmitted: onSubmitted,
                decoration: _buildCodeDecoration(theme, hasError),
              ),
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
        return Center(
          child: TextButton(
            style: TextButton.styleFrom(
              foregroundColor: primaryColor,
              disabledForegroundColor: disabledForegroundColor,
              textStyle: textStyle,
            ),
            // Disabled (null) while countdown is active; enabled when 0
            onPressed: remainingSeconds == 0 ? onPressed : null,
            child: Text(_resendLabelFromSeconds(remainingSeconds)),
          ),
        );
      },
    );
  }
}
