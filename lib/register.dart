import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:gms_shopping/data/country_dial_codes.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/login_redirect.dart';
import 'package:gms_shopping/services/account_registration.dart';
import 'package:gms_shopping/services/app_language_preference.dart';
import 'package:gms_shopping/services/google_auth_service.dart';
import 'package:gms_shopping/services/verification_service.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:gms_shopping/widgets/password_visibility_icon.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({
    super.key,
    required this.themeModeNotifier,
    this.initialGoogleProfile,
  });

  final ValueNotifier<ThemeMode> themeModeNotifier;
  final GoogleAuthProfile? initialGoogleProfile;

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  static const int _totalSteps = 5;
  static const Duration _fallbackResendCooldown = Duration(seconds: 60);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final List<TextEditingController> _codeControllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _codeFocusNodes = List.generate(6, (_) => FocusNode());

  late final VerificationService _verificationService;
  late final AccountRegistrationService _accountRegistrationService;

  Map<String, dynamic>? _googleProfile;
  CountryDialCode _selectedCountry = CountryDialCodes.philippines;
  int _currentStep = 1;
  /// 1 = forward (next), -1 = backward (back). Drives panel slide direction.
  int _stepDirection = 1;
  bool _acceptTerms = false;
  bool _showTermsError = false;
  bool _autovalidate = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _verificationSent = false;
  bool _verificationVerified = false;
  bool _showCodeError = false;
  bool _isSendingCode = false;
  bool _isVerifyingCode = false;
  bool _isCreatingAccount = false;
  String _verificationMode = 'email';
  String? _verificationToken;
  String _verificationChannel = 'email';
  DateTime? _resendAvailableAt;
  Timer? _resendTimer;
  int _resendRemainingSeconds = 0;

  late ThemeData _theme;
  late Color _secondaryTextColor;
  late Color _checkboxInactiveColor;
  late TextStyle? _headerTitleStyle;
  late TextStyle? _headerBodyStyle;
  late TextStyle? _passwordRequirementLabelStyle;
  late TextStyle? _passwordRequirementSuccessStyle;
  late TextStyle? _passwordRequirementErrorStyle;
  late TextStyle? _termsTextStyle;
  late TextStyle? _termsErrorTextStyle;
  late Duration _passwordRequirementDuration;
  late ThemeData _scopedTheme;

  @override
  void initState() {
    super.initState();
    _verificationService = createVerificationService();
    _accountRegistrationService = createAccountRegistrationService();

    final initial = widget.initialGoogleProfile;
    if (initial != null) {
      _googleProfile = initial.toRegistrationProfile();
      if (initial.firstName.isNotEmpty) {
        _firstNameController.text = initial.firstName;
      }
      if (initial.lastName.isNotEmpty) {
        _lastNameController.text = initial.lastName;
      }
      if (initial.email.isNotEmpty) {
        _emailController.text = initial.email;
      }
      // Google already provided email — start at name step.
      _currentStep = 2;
    }
  }

  bool get _isGoogleSignUp => widget.initialGoogleProfile != null;

  int get _minStep => _isGoogleSignUp ? 2 : 1;

  /// Google Instant Sign-In skips the local password step.
  int get _effectiveTotalSteps => _isGoogleSignUp ? 4 : _totalSteps;

  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    _theme = Theme.of(context);
    final isDark = _theme.brightness == Brightness.dark;

    _secondaryTextColor = isDark ? Colors.white70 : Colors.black54;
    _checkboxInactiveColor =
        _theme.iconTheme.color ?? _theme.colorScheme.onSurface;
    _headerTitleStyle = _theme.textTheme.headlineSmall?.copyWith(
      fontWeight: FontWeight.w700,
    );
    _headerBodyStyle = _theme.textTheme.bodyMedium?.copyWith(
      color: _secondaryTextColor,
    );
    _passwordRequirementLabelStyle = _theme.textTheme.bodySmall?.copyWith(
      color: _secondaryTextColor,
      fontWeight: FontWeight.w600,
    );
    _passwordRequirementSuccessStyle = _theme.textTheme.bodySmall?.copyWith(
      color: const Color(0xFF2E7D32),
      fontWeight: FontWeight.w700,
    );
    _passwordRequirementErrorStyle = _theme.textTheme.bodySmall?.copyWith(
      color: appInputErrorColor,
      fontWeight: FontWeight.w700,
    );
    _termsTextStyle = _theme.textTheme.bodySmall;
    _termsErrorTextStyle = _theme.textTheme.bodySmall?.copyWith(
      color: appInputErrorColor,
    );
    _passwordRequirementDuration = appMotionFrames(13);
    _scopedTheme = _theme.copyWith(
      inputDecorationTheme: _buildRegisterInputDecorationTheme(
        _theme.inputDecorationTheme,
        isDark,
      ),
    );
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _mobileNumberController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    for (final controller in _codeControllers) {
      controller.dispose();
    }
    for (final node in _codeFocusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  String get _enteredCode =>
      _codeControllers.map((controller) => controller.text).join();

  String get _mobileE164 {
    final digits = _mobileNumberController.text.replaceAll(RegExp(r'\D'), '');
    return digits.isEmpty ? '' : '${_selectedCountry.dialCode}$digits';
  }

  void _handleChromeBack() {
    _dismissKeyboard();
    if (_currentStep > _minStep) {
      _goToStep(_currentStep - 1);
      return;
    }
    Navigator.of(context).pop();
  }

  void _goToStep(int step) {
    final nextStep = step.clamp(_minStep, _effectiveTotalSteps);
    if (nextStep == _currentStep) {
      return;
    }
    setState(() {
      _stepDirection = nextStep > _currentStep ? 1 : -1;
      _currentStep = nextStep;
      _autovalidate = false;
    });
  }

  void _showValidationSnackBar(String message) {
    AppSnackBar.showError(context, message: message);
  }

  bool _validateEmailStep() {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _autovalidate = true);
      _showValidationSnackBar(
        ErrorValidation.validateEmail(_emailController.text) ??
            'Please check your email.',
      );
    }
    return isValid;
  }

  bool _validateNameStep() {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _autovalidate = true);
      _showValidationSnackBar(
        ErrorValidation.validateFirstName(_firstNameController.text) ??
            ErrorValidation.validateLastName(_lastNameController.text) ??
            'Please check your name.',
      );
    }
    return isValid;
  }

  bool _validateMobileStep() {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _autovalidate = true);
      _showValidationSnackBar(
        ErrorValidation.validateMobileNumber(
              _mobileNumberController.text,
              countryCode: _selectedCountry.dialCode,
            ) ??
            'Please check your mobile number.',
      );
    }
    return isValid;
  }

  bool _validatePasswordStep() {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      setState(() => _autovalidate = true);
      _showValidationSnackBar(
        ErrorValidation.validatePassword(_passwordController.text) ??
            ErrorValidation.validateConfirmPassword(
              _confirmPasswordController.text,
              password: _passwordController.text,
            ) ??
            'Please check your password.',
      );
      return false;
    }
    if (!_acceptTerms) {
      setState(() => _showTermsError = true);
      _showValidationSnackBar('Please accept the Terms and Conditions.');
      return false;
    }
    return true;
  }

  Future<void> _handleNext() async {
    _dismissKeyboard();

    if (_currentStep == 1) {
      if (!_validateEmailStep()) return;
      _goToStep(2);
      return;
    }

    if (_currentStep == 2) {
      if (!_validateNameStep()) return;
      _goToStep(3);
      return;
    }

    if (_currentStep == 3) {
      if (!_validateMobileStep()) return;
      _goToStep(4);
      return;
    }

    if (_currentStep == 4) {
      if (!_verificationVerified ||
          (_verificationToken?.trim().isEmpty ?? true)) {
        AppSnackBar.showError(
          context,
          message: 'Enter and verify the 6-digit code to continue.',
        );
        return;
      }
      if (_isGoogleSignUp) {
        await _handleCreateAccount();
        return;
      }
      _goToStep(5);
      return;
    }

    if (_currentStep == 5) {
      await _handleCreateAccount();
    }
  }

  void _startResendTimer({DateTime? resendAvailableAt, int? cooldownSeconds}) {
    _resendTimer?.cancel();
    final cooldown = Duration(
      seconds: (cooldownSeconds ?? _fallbackResendCooldown.inSeconds)
          .clamp(1, 60 * 30),
    );
    _resendAvailableAt =
        resendAvailableAt ?? DateTime.now().add(cooldown);

    void tick() {
      final remaining = _resendAvailableAt!
          .difference(DateTime.now())
          .inSeconds
          .clamp(0, cooldown.inSeconds);
      if (!mounted) return;
      setState(() => _resendRemainingSeconds = remaining);
      if (remaining <= 0) {
        _resendTimer?.cancel();
      }
    }

    tick();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (_) => tick());
  }

  String get _resendButtonLabel {
    if (_resendRemainingSeconds <= 0) {
      return 'Resend code';
    }
    final minutes =
        (_resendRemainingSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds =
        (_resendRemainingSeconds % 60).toString().padLeft(2, '0');
    return 'Resend code ($minutes:$seconds)';
  }

  void _clearCodeInputs() {
    for (final controller in _codeControllers) {
      controller.clear();
    }
    _showCodeError = false;
  }

  Future<void> _sendVerificationCode({bool isResend = false}) async {
    if (_isSendingCode) return;

    if (_verificationMode == 'email' && !_validateEmailStep()) return;
    if (_verificationMode == 'mobile' && !_validateMobileStep()) return;

    setState(() => _isSendingCode = true);
    try {
      final result = await LoadingScreen.showWhile(context, () async {
        return await _verificationService.sendVerificationCode(
          purpose: 'registration',
          channel: _verificationMode,
          email: _emailController.text.trim(),
          mobileNumber:
              _verificationMode == 'mobile' ? _mobileE164 : '',
        );
      });

      if (!mounted) return;

      setState(() {
        _verificationSent = true;
        _verificationVerified = false;
        _verificationToken = null;
        _verificationChannel = result.channel;
        _showCodeError = false;
      });
      _clearCodeInputs();
      _startResendTimer(
        resendAvailableAt: result.resendAvailableAt,
        cooldownSeconds: result.resendCooldownSeconds,
      );
      _codeFocusNodes.first.requestFocus();

      if (result.debugCode != null && result.debugCode!.isNotEmpty) {
        AppSnackBar.showSuccess(
          context,
          message: 'Dev code: ${result.debugCode}',
        );
      } else {
        AppSnackBar.showSuccess(
          context,
          message: _verificationMode == 'mobile'
              ? 'SMS code sent to $_mobileE164.'
              : 'Code sent to ${_emailController.text.trim()}.',
        );
      }
    } on VerificationException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isSendingCode = false);
      }
    }
  }

  Future<void> _verifyEnteredCode({bool showIncompleteError = true}) async {
    if (_isVerifyingCode || _verificationVerified) return;

    final code = _enteredCode;
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      if (showIncompleteError) {
        setState(() => _showCodeError = true);
        AppSnackBar.showError(
          context,
          message: 'Enter the 6-digit verification code.',
        );
      }
      return;
    }

    setState(() {
      _isVerifyingCode = true;
      _showCodeError = false;
    });
    try {
      final result = await LoadingScreen.showWhile(context, () async {
        return await _verificationService.verifyVerificationCode(
          purpose: 'registration',
          channel: _verificationMode,
          code: code,
          email: _emailController.text.trim(),
          mobileNumber:
              _verificationMode == 'mobile' ? _mobileE164 : '',
        );
      });

      if (!mounted) return;

      setState(() {
        _verificationVerified = true;
        _verificationToken = result.verificationToken;
        _verificationChannel = result.channel;
        _showCodeError = false;
      });
      AppSnackBar.showSuccess(context, message: 'Verification complete.');
      await Future<void>.delayed(const Duration(milliseconds: 220));
      if (!mounted) return;
      _goToStep(5);
    } on VerificationException catch (error) {
      if (!mounted) return;
      setState(() => _showCodeError = true);
      AppSnackBar.showError(context, message: error.message);
    } catch (error) {
      if (!mounted) return;
      setState(() => _showCodeError = true);
      AppSnackBar.showError(context, message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isVerifyingCode = false);
      }
    }
  }

  void _onCodeDigitChanged(int index, String value) {
    if (_showCodeError) {
      setState(() => _showCodeError = false);
    }

    final digit = value.replaceAll(RegExp(r'\D'), '');
    if (digit.length > 1) {
      _codeControllers[index].text = digit.substring(digit.length - 1);
      _codeControllers[index].selection = const TextSelection.collapsed(
        offset: 1,
      );
    }

    if (digit.isNotEmpty && index < _codeFocusNodes.length - 1) {
      _codeFocusNodes[index + 1].requestFocus();
    }

    if (digit.isEmpty && index > 0) {
      _codeFocusNodes[index - 1].requestFocus();
    }

    // Auto-submit as soon as all 6 digits are filled.
    if (RegExp(r'^\d{6}$').hasMatch(_enteredCode)) {
      _dismissKeyboard();
      unawaited(_verifyEnteredCode(showIncompleteError: false));
    }
  }

  Future<void> _handleCreateAccount() async {
    if (_isCreatingAccount) return;
    _dismissKeyboard();

    if (_isGoogleSignUp) {
      // Google accounts do not set a local password.
      if (!_acceptTerms) {
        // Terms live on the password step for email signup; Google Instant
        // Sign-In / Google register completes after OTP without that step.
        _acceptTerms = true;
      }
    } else if (!_validatePasswordStep()) {
      return;
    }

    final token = _verificationToken?.trim() ?? '';
    if (token.isEmpty) {
      AppSnackBar.showError(
        context,
        message: 'Verify your email or mobile first.',
      );
      _goToStep(4);
      return;
    }

    setState(() => _isCreatingAccount = true);
    try {
      await LoadingScreen.showWhile(context, () async {
        final preferredLanguage = await AppLanguagePreference.getGuestLanguage();
        await _accountRegistrationService.registerAppAccount(
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          countryCode: _selectedCountry.dialCode,
          mobileNumber: _mobileNumberController.text.trim(),
          email: _emailController.text.trim(),
          password: _isGoogleSignUp ? '' : _passwordController.text,
          verificationToken: token,
          verificationChannel: _verificationChannel,
          preferredLanguage: preferredLanguage,
          googleProfile: _googleProfile,
        );
        await GuestSession.clear();
      });

      if (!mounted) return;

      AppSnackBar.showSuccess(context, message: 'Account created!');
      await Future<void>.delayed(const Duration(milliseconds: 700));
      if (!mounted) return;

      await redirectGuestToLogin(
        context,
        themeModeNotifier: widget.themeModeNotifier,
      );
    } on AccountRegistrationException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } on VerificationException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isCreatingAccount = false);
      }
    }
  }

  String get _stepTitle {
    switch (_currentStep) {
      case 1:
        return 'What is your email address?';
      case 2:
        return 'Tell us about you';
      case 3:
        return 'What is your mobile number?';
      case 4:
        return 'Choose verification method';
      case 5:
        return 'Secure your account';
      default:
        return 'Create account';
    }
  }

  String get _stepSubtitle {
    switch (_currentStep) {
      case 1:
        return 'We will use this email for account access and important updates.';
      case 2:
        return 'Enter your first and last name to personalize your Switch account.';
      case 3:
        return 'Use an active mobile number for account notices.';
      case 4:
        if (_verificationSent) {
          return _verificationMode == 'mobile'
              ? 'Enter the 6-digit code sent to $_mobileE164.'
              : 'Enter the 6-digit code sent to ${_emailController.text.trim()}.';
        }
        return _verificationMode == 'mobile'
            ? 'We will send an SMS code to $_mobileE164.'
            : 'We will send a code to ${_emailController.text.trim()}.';
      case 5:
        return 'Create a strong password to protect your Switch account.';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final scaffoldColor = isDark ? appDarkScaffoldColor : Colors.white;
    final iconColor = appIconColorForBrightness(theme.brightness);

    return Scaffold(
      backgroundColor: scaffoldColor,
      appBar: AppBar(
        backgroundColor: scaffoldColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        automaticallyImplyLeading: false,
        leading: IconButton(
          onPressed: _handleChromeBack,
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
                child: Theme(
                  data: _scopedTheme,
                  child: Form(
                    key: _formKey,
                    autovalidateMode: _autovalidate
                        ? AutovalidateMode.onUserInteraction
                        : AutovalidateMode.disabled,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _RegisterProgress(
                          currentStep: _currentStep,
                          totalSteps: _effectiveTotalSteps,
                          secondaryTextColor: _secondaryTextColor,
                        ),
                        const SizedBox(height: 20),
                        _RegisterStepHeading(
                          stepKey: _currentStep,
                          direction: _stepDirection,
                          title: _stepTitle,
                          subtitle: _stepSubtitle,
                          titleStyle: _headerTitleStyle,
                          bodyStyle: _headerBodyStyle,
                          subtitleKey: _currentStep == 4
                              ? '$_verificationMode-$_verificationSent'
                              : null,
                        ),
                        const SizedBox(height: 24),
                        _RegisterStepPanel(
                          stepKey: _currentStep,
                          direction: _stepDirection,
                          child: _buildStepBody(),
                        ),
                        const SizedBox(height: 20),
                        AnimatedSwitcher(
                          duration: appMotionFrames(14),
                          switchInCurve: Curves.easeOutCubic,
                          switchOutCurve: Curves.easeInCubic,
                          child: KeyedSubtree(
                            key: ValueKey(
                              'actions-$_currentStep-$_verificationSent-$_verificationVerified',
                            ),
                            child: _buildStepActions(),
                          ),
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

  Widget _buildStepBody() {
    switch (_currentStep) {
      case 1:
        return TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          onFieldSubmitted: (_) => _handleNext(),
          validator: ErrorValidation.validateEmail,
          decoration: const InputDecoration(
            labelText: 'Email address',
            errorStyle: appInputBorderOnlyErrorStyle,
          ),
        );
      case 2:
        return Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _firstNameController,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                inputFormatters: [ErrorValidation.nameInputFormatter],
                validator: ErrorValidation.validateFirstName,
                decoration: const InputDecoration(
                  labelText: 'First name',
                  errorStyle: appInputBorderOnlyErrorStyle,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _lastNameController,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                inputFormatters: [ErrorValidation.nameInputFormatter],
                onFieldSubmitted: (_) => _handleNext(),
                validator: ErrorValidation.validateLastName,
                decoration: const InputDecoration(
                  labelText: 'Last name',
                  errorStyle: appInputBorderOnlyErrorStyle,
                ),
              ),
            ),
          ],
        );
      case 3:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _mobileNumberController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              maxLength: _selectedCountry.nationalNumberLength ?? 15,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onFieldSubmitted: (_) => _handleNext(),
              validator: (value) => ErrorValidation.validateMobileNumber(
                value,
                countryCode: _selectedCountry.dialCode,
              ),
              decoration: InputDecoration(
                labelText: 'Mobile number',
                counterText: '',
                errorStyle: appInputBorderOnlyErrorStyle,
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: _CountryDialCodeButton(
                    country: _selectedCountry,
                    onTap: _pickCountryDialCode,
                  ),
                ),
                prefixIconConstraints: const BoxConstraints(
                  minWidth: 0,
                  minHeight: 0,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _selectedCountry.hint ??
                  'Enter your mobile number without the country code.',
              style: _headerBodyStyle,
            ),
          ],
        );
      case 4:
        return _buildVerificationStep();
      case 5:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              validator: ErrorValidation.validatePassword,
              decoration: InputDecoration(
                labelText: 'Password',
                errorStyle: appInputBorderOnlyErrorStyle,
                suffixIcon: IconButton(
                  icon: PasswordVisibilityIcon(obscured: _obscurePassword),
                  onPressed: () {
                    setState(() => _obscurePassword = !_obscurePassword);
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),
            _RegisterPasswordRequirementIndicator(
              passwordController: _passwordController,
              labelStyle: _passwordRequirementLabelStyle,
              successStyle: _passwordRequirementSuccessStyle,
              errorStyle: _passwordRequirementErrorStyle,
              transitionDuration: _passwordRequirementDuration,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: _obscureConfirmPassword,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _handleNext(),
              validator: (value) => ErrorValidation.validateConfirmPassword(
                value,
                password: _passwordController.text,
              ),
              decoration: InputDecoration(
                labelText: 'Confirm password',
                errorStyle: appInputBorderOnlyErrorStyle,
                suffixIcon: IconButton(
                  icon: PasswordVisibilityIcon(
                    obscured: _obscureConfirmPassword,
                  ),
                  onPressed: () {
                    setState(
                      () => _obscureConfirmPassword = !_obscureConfirmPassword,
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Checkbox(
                  value: _acceptTerms,
                  shape: const CircleBorder(),
                  side: BorderSide(
                    color: _showTermsError
                        ? appInputErrorColor
                        : _checkboxInactiveColor,
                  ),
                  onChanged: (value) {
                    setState(() {
                      _acceptTerms = value ?? false;
                      if (_acceptTerms) {
                        _showTermsError = false;
                      }
                    });
                  },
                ),
                Expanded(
                  child: Text(
                    'I agree to the Terms and Conditions',
                    style: _showTermsError
                        ? _termsErrorTextStyle
                        : _termsTextStyle,
                  ),
                ),
              ],
            ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildVerificationStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _VerificationModeChip(
                label: 'Email',
                iconAsset: 'assets/icons/mail.svg',
                selected: _verificationMode == 'email',
                onTap: () {
                  if (_verificationMode == 'email') return;
                  setState(() {
                    _verificationMode = 'email';
                    _verificationSent = false;
                    _verificationVerified = false;
                    _verificationToken = null;
                    _showCodeError = false;
                  });
                  _clearCodeInputs();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _VerificationModeChip(
                label: 'Mobile number',
                iconAsset: 'assets/icons/smartphone.svg',
                selected: _verificationMode == 'mobile',
                onTap: () {
                  if (_verificationMode == 'mobile') return;
                  setState(() {
                    _verificationMode = 'mobile';
                    _verificationSent = false;
                    _verificationVerified = false;
                    _verificationToken = null;
                    _showCodeError = false;
                  });
                  _clearCodeInputs();
                },
              ),
            ),
          ],
        ),
        AnimatedSize(
          duration: appMotionFrames(16),
          curve: Curves.easeInOutCubic,
          alignment: Alignment.topCenter,
          child: AnimatedSwitcher(
            duration: appMotionFrames(16),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.12),
                    end: Offset.zero,
                  ).animate(
                    CurvedAnimation(
                      parent: animation,
                      curve: Curves.easeOutCubic,
                    ),
                  ),
                  child: child,
                ),
              );
            },
            child: !_verificationSent
                ? const SizedBox.shrink(key: ValueKey('verify-hint-hidden'))
                : Padding(
                    key: const ValueKey('verify-code-panel'),
                    padding: const EdgeInsets.only(top: 16),
                    child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Verification code',
                        style: _theme.textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          const gap = 8.0;
                          final boxSize =
                              (constraints.maxWidth - gap * 5) / 6;
                          final isDark =
                              _theme.brightness == Brightness.dark;
                          final borderColor = isDark
                              ? const Color(0xFF9AA0A6)
                              : const Color.fromARGB(255, 204, 204, 204);
                          final focusedColor =
                              isDark ? Colors.white : Colors.black;
                          final valueColor =
                              isDark ? Colors.white : Colors.black;

                          return Row(
                            children: [
                              for (var index = 0; index < 6; index++) ...[
                                _RegisterCodeDigitBox(
                                  size: boxSize,
                                  controller: _codeControllers[index],
                                  focusNode: _codeFocusNodes[index],
                                  borderColor: borderColor,
                                  focusedColor: focusedColor,
                                  valueColor: valueColor,
                                  hasError: _showCodeError,
                                  textStyle: _theme.textTheme.titleLarge
                                      ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    height: 1,
                                  ),
                                  onChanged: (value) =>
                                      _onCodeDigitChanged(index, value),
                                ),
                                if (index != 5) const SizedBox(width: gap),
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
                          style: _headerBodyStyle,
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
                          onPressed:
                              _resendRemainingSeconds > 0 || _isSendingCode
                                  ? null
                                  : () =>
                                      _sendVerificationCode(isResend: true),
                          child: Text(
                            _resendButtonLabel,
                          ),
                        ),
                      ),
                      AnimatedSwitcher(
                        duration: appMotionFrames(12),
                        child: _verificationVerified
                            ? Padding(
                                key: const ValueKey('verified-note'),
                                padding: const EdgeInsets.only(top: 8),
                                child: Center(
                                  child: Text(
                                    'Verified. You can continue.',
                                    textAlign: TextAlign.center,
                                    style: _passwordRequirementSuccessStyle,
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(
                                key: ValueKey('verified-note-hidden'),
                              ),
                      ),
                    ],
                  ),
                ),
          ),
        ),
      ],
    );
  }

  Future<void> _pickCountryDialCode() async {
    _dismissKeyboard();
    final selected = await showModalBottomSheet<CountryDialCode>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return _CountryDialCodePickerSheet(
          selected: _selectedCountry,
        );
      },
    );

    if (!mounted || selected == null) return;
    if (selected.dialCode == _selectedCountry.dialCode &&
        selected.iso2 == _selectedCountry.iso2) {
      return;
    }

    setState(() {
      _selectedCountry = selected;
      // Clear digits that may not fit the new country's rules.
      final maxLen = selected.nationalNumberLength ?? 15;
      final digits = _mobileNumberController.text.replaceAll(RegExp(r'\D'), '');
      if (digits.length > maxLen) {
        _mobileNumberController.text = digits.substring(0, maxLen);
      }
    });
  }

  Widget _buildStepActions() {
    // After send: code auto-submits when all 6 digits are entered — no Verify button.
    if (_currentStep == 4 && _verificationSent && !_verificationVerified) {
      return const SizedBox.shrink(
        key: ValueKey('actions-verify-hidden'),
      );
    }

    final primaryLabel = _currentStep == 4 && !_verificationSent
        ? 'Send code'
        : (_currentStep == 5 ||
                (_currentStep == 4 && _isGoogleSignUp && _verificationVerified))
            ? 'Create Account'
            : 'Continue';

    Future<void> onPrimary() async {
      if (_currentStep == 4 && !_verificationSent) {
        await _sendVerificationCode();
        return;
      }
      await _handleNext();
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isSendingCode || _isVerifyingCode || _isCreatingAccount
            ? null
            : onPrimary,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(primaryLabel),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_rounded, size: 18),
          ],
        ),
      ),
    );
  }
}

class _CountryDialCodeButton extends StatelessWidget {
  const _CountryDialCodeButton({
    required this.country,
    required this.onTap,
  });

  final CountryDialCode country;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final iconColor = appIconColorForBrightness(Theme.of(context).brightness);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.only(left: 10, right: 6, top: 12, bottom: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(country.flag, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 6),
            Text(
              country.dialCode,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            Icon(
              Icons.arrow_drop_down_rounded,
              size: 20,
              color: iconColor,
            ),
            const SizedBox(width: 4),
          ],
        ),
      ),
    );
  }
}

class _CountryDialCodePickerSheet extends StatefulWidget {
  const _CountryDialCodePickerSheet({
    required this.selected,
  });

  final CountryDialCode selected;

  @override
  State<_CountryDialCodePickerSheet> createState() =>
      _CountryDialCodePickerSheetState();
}

class _CountryDialCodePickerSheetState
    extends State<_CountryDialCodePickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  late List<CountryDialCode> _filtered;

  @override
  void initState() {
    super.initState();
    _filtered = CountryDialCodes.all;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    final q = query.trim().toLowerCase();
    setState(() {
      if (q.isEmpty) {
        _filtered = CountryDialCodes.all;
        return;
      }
      _filtered = CountryDialCodes.all
          .where((country) => country.searchText.contains(q))
          .toList(growable: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final height = MediaQuery.sizeOf(context).height * 0.72;

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
              'Select country code',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                labelText: 'Search country or code',
                prefixIcon: Padding(
                  padding: const EdgeInsets.all(12),
                  child: SvgPicture.asset(
                    'assets/icons/search.svg',
                    width: 22,
                    height: 22,
                    colorFilter: ColorFilter.mode(
                      appIconColorForBrightness(theme.brightness),
                      BlendMode.srcIn,
                    ),
                  ),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(
                    color: theme.brightness == Brightness.dark
                        ? const Color(0xFF9AA0A6)
                        : const Color.fromARGB(255, 204, 204, 204),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(
                    color: theme.brightness == Brightness.dark
                        ? Colors.white
                        : Colors.black,
                    width: 1.25,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: _filtered.length,
              itemBuilder: (context, index) {
                final country = _filtered[index];
                final isSelected = country.iso2 == widget.selected.iso2 &&
                    country.dialCode == widget.selected.dialCode;
                return ListTile(
                  leading: Text(country.flag, style: const TextStyle(fontSize: 22)),
                  title: Text(country.name),
                  trailing: Text(
                    country.dialCode,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  selected: isSelected,
                  onTap: () => Navigator.of(context).pop(country),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RegisterProgress extends StatelessWidget {
  const _RegisterProgress({
    required this.currentStep,
    required this.totalSteps,
    required this.secondaryTextColor,
  });

  final int currentStep;
  final int totalSteps;
  final Color secondaryTextColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = currentStep / totalSteps;
    final duration = appMotionFrames(18);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedSwitcher(
          duration: duration,
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.35),
                  end: Offset.zero,
                ).animate(
                  CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeOutCubic,
                  ),
                ),
                child: child,
              ),
            );
          },
          child: Text(
            'Step $currentStep of $totalSteps',
            key: ValueKey(currentStep),
            style: theme.textTheme.bodySmall?.copyWith(
              color: secondaryTextColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: SizedBox(
            height: 6,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(
                  color: secondaryTextColor.withValues(alpha: 0.15),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: AnimatedFractionallySizedBox(
                    duration: duration,
                    curve: Curves.easeInOutCubic,
                    widthFactor: progress.clamp(0.0, 1.0),
                    heightFactor: 1,
                    alignment: Alignment.centerLeft,
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        gradient: LinearGradient(
                          colors: [
                            theme.colorScheme.primary.withValues(alpha: 0.85),
                            theme.colorScheme.primary,
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _RegisterStepHeading extends StatelessWidget {
  const _RegisterStepHeading({
    required this.stepKey,
    required this.direction,
    required this.title,
    required this.subtitle,
    required this.titleStyle,
    required this.bodyStyle,
    this.subtitleKey,
  });

  final int stepKey;
  final int direction;
  final String title;
  final String subtitle;
  final TextStyle? titleStyle;
  final TextStyle? bodyStyle;
  final String? subtitleKey;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: appMotionFrames(18),
      switchInCurve: Curves.easeInOutCubic,
      switchOutCurve: Curves.easeInOutCubic,
      layoutBuilder: (currentChild, previousChildren) {
        return Stack(
          alignment: Alignment.topLeft,
          children: <Widget>[
            ...previousChildren,
            ?currentChild,
          ],
        );
      },
      transitionBuilder: (child, animation) {
        return _RegisterSlideFade(
          animation: animation,
          direction: direction,
          isIncoming: child.key == ValueKey('heading-$stepKey'),
          child: child,
        );
      },
      child: Column(
        key: ValueKey('heading-$stepKey'),
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title, style: titleStyle),
          const SizedBox(height: 8),
          AnimatedSwitcher(
            duration: appMotionFrames(12),
            child: Text(
              key: ValueKey('subtitle-$stepKey-${subtitleKey ?? subtitle}'),
              subtitle,
              style: bodyStyle,
            ),
          ),
        ],
      ),
    );
  }
}

class _RegisterStepPanel extends StatelessWidget {
  const _RegisterStepPanel({
    required this.stepKey,
    required this.direction,
    required this.child,
  });

  final int stepKey;
  final int direction;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    // Extra top padding so the floating outline label isn't clipped.
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: AnimatedSize(
        duration: appMotionFrames(16),
        curve: Curves.easeInOutCubic,
        alignment: Alignment.topCenter,
        clipBehavior: Clip.none,
        child: AnimatedSwitcher(
          duration: appMotionFrames(20),
          switchInCurve: Curves.easeInOutCubic,
          switchOutCurve: Curves.easeInOutCubic,
          layoutBuilder: (currentChild, previousChildren) {
            return Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.topCenter,
              children: <Widget>[
                ...previousChildren,
                ?currentChild,
              ],
            );
          },
          transitionBuilder: (panelChild, animation) {
            return _RegisterSlideFade(
              animation: animation,
              direction: direction,
              isIncoming: panelChild.key == ValueKey('panel-$stepKey'),
              child: panelChild,
            );
          },
          child: KeyedSubtree(
            key: ValueKey('panel-$stepKey'),
            child: SizedBox(
              width: double.infinity,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// Forward (direction = 1): old panel slides left out, new panel slides in from right.
/// Back (direction = -1): old panel slides right out, new panel slides in from left.
class _RegisterSlideFade extends StatelessWidget {
  const _RegisterSlideFade({
    required this.animation,
    required this.direction,
    required this.isIncoming,
    required this.child,
  });

  final Animation<double> animation;
  final int direction;
  final bool isIncoming;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    // Incoming: from +X on next, from -X on back.
    // Outgoing: AnimatedSwitcher reverses [begin→0], so begin=-X exits left on next.
    final signed = direction >= 0 ? 1.0 : -1.0;
    final begin = Offset(
      isIncoming ? signed : -signed,
      0,
    );

    final curved = CurvedAnimation(
      parent: animation,
      curve: Curves.easeInOutCubic,
    );

    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: begin,
          end: Offset.zero,
        ).animate(curved),
        child: child,
      ),
    );
  }
}

class _RegisterCodeDigitBox extends StatelessWidget {
  const _RegisterCodeDigitBox({
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

class _VerificationModeChip extends StatelessWidget {
  const _VerificationModeChip({
    required this.label,
    required this.iconAsset,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String iconAsset;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = selected
        ? theme.colorScheme.primary
        : theme.colorScheme.onSurface.withValues(alpha: 0.7);

    return AnimatedContainer(
      duration: appMotionFrames(12),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: selected
            ? theme.colorScheme.primary.withValues(alpha: 0.12)
            : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SvgPicture.asset(
                  iconAsset,
                  width: 18,
                  height: 18,
                  colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    label,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: color,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

dynamic _buildRegisterInputDecorationTheme(
  dynamic decorationTheme,
  bool isDark,
) {
  // Match login inputs: transparent fill + outline borders + floating labels.
  final scaffoldFill = isDark ? Colors.black : Colors.white;
  return decorationTheme.copyWith(
    filled: true,
    // Opaque page-matching fill so the floating label notch isn't cut by the border.
    fillColor: scaffoldFill,
    floatingLabelBehavior: FloatingLabelBehavior.auto,
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
    errorStyle: appInputBorderOnlyErrorStyle,
    border: _copyRegisterInputBorderWithRadius(decorationTheme.border),
    enabledBorder:
        _copyRegisterInputBorderWithRadius(decorationTheme.enabledBorder),
    focusedBorder:
        _copyRegisterInputBorderWithRadius(decorationTheme.focusedBorder),
    disabledBorder:
        _copyRegisterInputBorderWithRadius(decorationTheme.disabledBorder),
    errorBorder: _copyRegisterInputBorderWithRadius(decorationTheme.errorBorder),
    focusedErrorBorder: _copyRegisterInputBorderWithRadius(
      decorationTheme.focusedErrorBorder,
    ),
  );
}

InputBorder? _copyRegisterInputBorderWithRadius(InputBorder? border) {
  if (border is OutlineInputBorder) {
    return border.copyWith(
      borderRadius: BorderRadius.circular(8),
    );
  }
  return border;
}

String _nextPasswordRequirement(String password) {
  if (!ErrorValidation.hasMinimumPasswordLength(password)) {
    return 'At least 8 characters';
  }
  if (!ErrorValidation.hasPasswordNumber(password)) {
    return 'At least 1 number';
  }
  if (!ErrorValidation.hasPasswordUppercase(password)) {
    return 'At least 1 uppercase';
  }
  if (!ErrorValidation.hasPasswordSymbol(password)) {
    return 'At least 1 symbol';
  }

  return 'Done';
}

class _RegisterPasswordRequirementIndicator extends StatelessWidget {
  const _RegisterPasswordRequirementIndicator({
    required this.passwordController,
    required this.labelStyle,
    required this.successStyle,
    required this.errorStyle,
    required this.transitionDuration,
  });

  final TextEditingController passwordController;
  final TextStyle? labelStyle;
  final TextStyle? successStyle;
  final TextStyle? errorStyle;
  final Duration transitionDuration;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: passwordController,
      child: Text(
        'Password must include:',
        style: labelStyle,
      ),
      builder: (context, value, child) {
        final requirementLabel = child!;
        final message = _nextPasswordRequirement(value.text);
        final isComplete = message == 'Done';
        final messageStyle = isComplete ? successStyle : errorStyle;

        return Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 6,
          runSpacing: 4,
          children: [
            requirementLabel,
            AnimatedSwitcher(
              duration: transitionDuration,
              child: Row(
                key: ValueKey(message),
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isComplete) ...[
                    Icon(
                      Icons.check_circle_rounded,
                      size: 14,
                      color: messageStyle?.color,
                    ),
                    const SizedBox(width: 4),
                  ],
                  Text(
                    message,
                    style: messageStyle,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
