import 'package:flutter/material.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/login_redirect.dart';
import 'package:gms_shopping/services/account_registration.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:shared_preferences/shared_preferences.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({
    super.key,
    required this.themeModeNotifier,
  });

  final ValueNotifier<ThemeMode> themeModeNotifier;

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  static const String _profileFirstNameKey = 'profile_first_name';
  static const String _profileLastNameKey = 'profile_last_name';
  static const String _profileEmailKey = 'profile_email';
  static const String _profilePhoneKey = 'profile_phone';
  static const List<String> _countryCodes = [
    '+63',
    '+1',
    '+44',
    '+61',
    '+65',
    '+81',
  ];

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final GlobalKey<_RegisterFormSectionState> _formSectionKey =
      GlobalKey<_RegisterFormSectionState>();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  late final AccountRegistrationService _accountRegistrationService;
  late ThemeData _theme;
  late ThemeData _scopedTheme;
  late Color _secondaryTextColor;
  late Color _dividerColor;
  late Color _socialButtonFillColor;
  late Color _checkboxInactiveColor;
  late BoxDecoration _backgroundDecoration;
  late TextStyle? _headerTitleStyle;
  late TextStyle? _headerBodyStyle;
  late TextStyle? _passwordRequirementLabelStyle;
  late TextStyle? _passwordRequirementSuccessStyle;
  late TextStyle? _passwordRequirementErrorStyle;
  late TextStyle? _termsTextStyle;
  late TextStyle? _termsErrorTextStyle;
  late TextStyle? _continueWithLabelStyle;
  late Duration _passwordRequirementDuration;

  @override
  void initState() {
    super.initState();
    _accountRegistrationService = createAccountRegistrationService();
  }

  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    _theme = Theme.of(context);
    final isDark = _theme.brightness == Brightness.dark;
    final backgroundColors = appLoginBackgroundColors(
      theme: _theme,
      isDark: isDark,
    );

    _secondaryTextColor = isDark ? Colors.white70 : Colors.black54;
    _dividerColor = _secondaryTextColor.withValues(alpha: 0.35);
    _socialButtonFillColor =
        _theme.inputDecorationTheme.fillColor ?? _theme.colorScheme.surface;
    _checkboxInactiveColor =
        _theme.iconTheme.color ?? _theme.colorScheme.onSurface;
    _backgroundDecoration = BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: backgroundColors,
      ),
    );
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
      color: _theme.colorScheme.primary,
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
    _continueWithLabelStyle = _theme.textTheme.bodySmall?.copyWith(
      color: _secondaryTextColor,
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
    _firstNameController.dispose();
    _lastNameController.dispose();
    _mobileNumberController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleBack() {
    _dismissKeyboard();
    Navigator.of(context).pop();
  }

  Future<void> _persistRegisteredProfile({
    required String? selectedCountryCode,
  }) async {
    final preferences = await SharedPreferences.getInstance();

    final firstName = _firstNameController.text.trim();
    if (firstName.isNotEmpty) {
      await preferences.setString(_profileFirstNameKey, firstName);
    }

    final lastName = _lastNameController.text.trim();
    if (lastName.isNotEmpty) {
      await preferences.setString(_profileLastNameKey, lastName);
    }

    final email = _emailController.text.trim();
    if (email.isNotEmpty) {
      await preferences.setString(_profileEmailKey, email);
    }

    final phoneNumber = [
      (selectedCountryCode ?? '').trim(),
      _mobileNumberController.text.trim(),
    ].where((value) => value.isNotEmpty).join(' ');
    if (phoneNumber.isNotEmpty) {
      await preferences.setString(_profilePhoneKey, phoneNumber);
    }
  }

  Future<void> _handleCreateAccount() async {
    _dismissKeyboard();

    final formSectionState = _formSectionKey.currentState;
    if (formSectionState == null) {
      return;
    }

    final snapshot = formSectionState.prepareForSubmit();

    if (!snapshot.acceptTerms) {
      AppSnackBar.showError(
        context,
        message: 'Please accept the Terms and Conditions.',
      );
      return;
    }

    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid) {
      AppSnackBar.showError(
        context,
        message: ErrorValidation.registerErrorMessage(
          firstName: _firstNameController.text,
          lastName: _lastNameController.text,
          countryCode: snapshot.selectedCountryCode ?? '',
          mobileNumber: _mobileNumberController.text,
          email: _emailController.text,
          password: _passwordController.text,
          confirmPassword: _confirmPasswordController.text,
        ),
      );
      return;
    }

    formSectionState.clearTermsError();

    try {
      await LoadingScreen.showWhile(context, () async {
        await _accountRegistrationService.registerAppAccount(
          firstName: _firstNameController.text,
          lastName: _lastNameController.text,
          countryCode: snapshot.selectedCountryCode ?? '',
          mobileNumber: _mobileNumberController.text,
          email: _emailController.text,
          password: _passwordController.text,
        );
        await GuestSession.clear();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      AppSnackBar.showError(
        context,
        message: error.toString(),
      );
      return;
    }

    await _persistRegisteredProfile(
      selectedCountryCode: snapshot.selectedCountryCode,
    );

    if (!mounted) {
      return;
    }

    // Show success message briefly, then navigate to login
    AppSnackBar.showSuccess(
      context,
      message: 'Account created!',
    );

    await Future.delayed(const Duration(milliseconds: 800));

    if (mounted) {
      // Use the same navigation method as other places in the app
      redirectGuestToLogin(context, themeModeNotifier: widget.themeModeNotifier);
    }
  }

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

  Future<void> _handleGoogleSignIn() async {
    _dismissKeyboard();
    await LoadingScreen.showWhile(context, () async {});

    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message: 'Google sign in coming soon.',
    );
  }

  Future<void> _handleFacebookSignIn() async {
    _dismissKeyboard();
    await LoadingScreen.showWhile(context, () async {});

    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message: 'Facebook sign in coming soon.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Scaffold(
      body: Container(
        color: isDark ? appDarkScaffoldColor : Colors.white,
        child: SafeArea(
          child: _RegisterViewport(
            theme: _theme,
            scopedTheme: _scopedTheme,
            formKey: _formKey,
            formSectionKey: _formSectionKey,
            firstNameController: _firstNameController,
            lastNameController: _lastNameController,
            mobileNumberController: _mobileNumberController,
            emailController: _emailController,
            passwordController: _passwordController,
            confirmPasswordController: _confirmPasswordController,
            countryCodes: _countryCodes,
            secondaryTextColor: _secondaryTextColor,
            dividerColor: _dividerColor,
            socialButtonFillColor: _socialButtonFillColor,
            checkboxInactiveColor: _checkboxInactiveColor,
            headerTitleStyle: _headerTitleStyle,
            headerBodyStyle: _headerBodyStyle,
            passwordRequirementLabelStyle: _passwordRequirementLabelStyle,
            passwordRequirementSuccessStyle: _passwordRequirementSuccessStyle,
            passwordRequirementErrorStyle: _passwordRequirementErrorStyle,
            termsTextStyle: _termsTextStyle,
            termsErrorTextStyle: _termsErrorTextStyle,
            continueWithLabelStyle: _continueWithLabelStyle,
            passwordRequirementDuration: _passwordRequirementDuration,
            onBack: _handleBack,
            onCreateAccount: _handleCreateAccount,
            onContinueAsGuest: _handleContinueAsGuest,
            onGoogleSignIn: _handleGoogleSignIn,
            onFacebookSignIn: _handleFacebookSignIn,
          ),
        ),
      ),
    );
  }
}

dynamic _buildRegisterInputDecorationTheme(dynamic decorationTheme, bool isDark) {
  return decorationTheme.copyWith(
    fillColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFFAFAFA),
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

InputBorder? _copyInputBorderWithRadius(InputBorder? border) {
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

  return 'Complete';
}

class _RegisterViewport extends StatelessWidget {
  const _RegisterViewport({
    required this.theme,
    required this.scopedTheme,
    required this.formKey,
    required this.formSectionKey,
    required this.firstNameController,
    required this.lastNameController,
    required this.mobileNumberController,
    required this.emailController,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.countryCodes,
    required this.secondaryTextColor,
    required this.dividerColor,
    required this.socialButtonFillColor,
    required this.checkboxInactiveColor,
    required this.headerTitleStyle,
    required this.headerBodyStyle,
    required this.passwordRequirementLabelStyle,
    required this.passwordRequirementSuccessStyle,
    required this.passwordRequirementErrorStyle,
    required this.termsTextStyle,
    required this.termsErrorTextStyle,
    required this.continueWithLabelStyle,
    required this.passwordRequirementDuration,
    required this.onBack,
    required this.onCreateAccount,
    required this.onContinueAsGuest,
    required this.onGoogleSignIn,
    required this.onFacebookSignIn,
  });

  final ThemeData theme;
  final ThemeData scopedTheme;
  final GlobalKey<FormState> formKey;
  final GlobalKey<_RegisterFormSectionState> formSectionKey;
  final TextEditingController firstNameController;
  final TextEditingController lastNameController;
  final TextEditingController mobileNumberController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final List<String> countryCodes;
  final Color secondaryTextColor;
  final Color dividerColor;
  final Color socialButtonFillColor;
  final Color checkboxInactiveColor;
  final TextStyle? headerTitleStyle;
  final TextStyle? headerBodyStyle;
  final TextStyle? passwordRequirementLabelStyle;
  final TextStyle? passwordRequirementSuccessStyle;
  final TextStyle? passwordRequirementErrorStyle;
  final TextStyle? termsTextStyle;
  final TextStyle? termsErrorTextStyle;
  final TextStyle? continueWithLabelStyle;
  final Duration passwordRequirementDuration;
  final VoidCallback onBack;
  final Future<void> Function() onCreateAccount;
  final Future<void> Function() onContinueAsGuest;
  final Future<void> Function() onGoogleSignIn;
  final Future<void> Function() onFacebookSignIn;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 8,
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 650),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Theme(
              data: scopedTheme,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _RegisterHeader(
                    theme: theme,
                    titleStyle: headerTitleStyle,
                    bodyStyle: headerBodyStyle,
                    onBack: onBack,
                  ),
                  const SizedBox(height: 24),
                  _RegisterFormSection(
                    key: formSectionKey,
                    formKey: formKey,
                    firstNameController: firstNameController,
                    lastNameController: lastNameController,
                    mobileNumberController: mobileNumberController,
                    emailController: emailController,
                    passwordController: passwordController,
                    confirmPasswordController: confirmPasswordController,
                    countryCodes: countryCodes,
                    checkboxInactiveColor: checkboxInactiveColor,
                    passwordRequirementLabelStyle:
                        passwordRequirementLabelStyle,
                    passwordRequirementSuccessStyle:
                        passwordRequirementSuccessStyle,
                    passwordRequirementErrorStyle: passwordRequirementErrorStyle,
                    passwordRequirementDuration: passwordRequirementDuration,
                    termsTextStyle: termsTextStyle,
                    termsErrorTextStyle: termsErrorTextStyle,
                    onSubmit: onCreateAccount,
                  ),
                  const SizedBox(height: 24),
                  _RegisterSecondaryActions(
                    theme: theme,
                    dividerColor: dividerColor,
                    socialButtonFillColor: socialButtonFillColor,
                    continueWithLabelStyle: continueWithLabelStyle,
                    onContinueAsGuest: onContinueAsGuest,
                    onGoogleSignIn: onGoogleSignIn,
                    onFacebookSignIn: onFacebookSignIn,
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

class _RegisterHeader extends StatelessWidget {
  const _RegisterHeader({
    required this.theme,
    required this.titleStyle,
    required this.bodyStyle,
    required this.onBack,
  });

  final ThemeData theme;
  final TextStyle? titleStyle;
  final TextStyle? bodyStyle;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: onBack,
          padding: EdgeInsets.zero,
          visualDensity: VisualDensity.compact,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        const SizedBox(height: 12),
        Text(
          'Create account',
          style: titleStyle,
        ),
        const SizedBox(height: 8),
        Text(
          'Set up your details to start using GMS Shopping.',
          style: bodyStyle,
        ),
      ],
    );
  }
}

class _RegisterFormSection extends StatefulWidget {
  const _RegisterFormSection({
    super.key,
    required this.formKey,
    required this.firstNameController,
    required this.lastNameController,
    required this.mobileNumberController,
    required this.emailController,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.countryCodes,
    required this.checkboxInactiveColor,
    required this.passwordRequirementLabelStyle,
    required this.passwordRequirementSuccessStyle,
    required this.passwordRequirementErrorStyle,
    required this.passwordRequirementDuration,
    required this.termsTextStyle,
    required this.termsErrorTextStyle,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController firstNameController;
  final TextEditingController lastNameController;
  final TextEditingController mobileNumberController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final List<String> countryCodes;
  final Color checkboxInactiveColor;
  final TextStyle? passwordRequirementLabelStyle;
  final TextStyle? passwordRequirementSuccessStyle;
  final TextStyle? passwordRequirementErrorStyle;
  final Duration passwordRequirementDuration;
  final TextStyle? termsTextStyle;
  final TextStyle? termsErrorTextStyle;
  final Future<void> Function() onSubmit;

  @override
  State<_RegisterFormSection> createState() => _RegisterFormSectionState();
}

class _RegisterFormSectionState extends State<_RegisterFormSection> {
  final ValueNotifier<bool> _showValidationErrorsNotifier =
      ValueNotifier(false);
  final ValueNotifier<String?> _selectedCountryCodeNotifier = ValueNotifier(
    null,
  );
  final ValueNotifier<bool> _acceptTermsNotifier = ValueNotifier(false);
  final ValueNotifier<bool> _showTermsErrorNotifier = ValueNotifier(false);
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  late final List<DropdownMenuItem<String>> _countryCodeItems = widget
      .countryCodes
      .map(
        (countryCode) => DropdownMenuItem<String>(
          value: countryCode,
          child: Text(countryCode),
        ),
      )
      .toList();

  _RegisterFormSnapshot prepareForSubmit() {
    if (!_showValidationErrorsNotifier.value) {
      _showValidationErrorsNotifier.value = true;
    }

    _showTermsErrorNotifier.value = !_acceptTermsNotifier.value;

    return _RegisterFormSnapshot(
      acceptTerms: _acceptTermsNotifier.value,
      selectedCountryCode: _selectedCountryCodeNotifier.value,
    );
  }

  void clearTermsError() {
    if (_showTermsErrorNotifier.value) {
      _showTermsErrorNotifier.value = false;
    }
  }

  @override
  void dispose() {
    _showValidationErrorsNotifier.dispose();
    _selectedCountryCodeNotifier.dispose();
    _acceptTermsNotifier.dispose();
    _showTermsErrorNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: _showValidationErrorsNotifier,
      builder: (context, showValidationErrors, child) {
        return Form(
          key: widget.formKey,
          autovalidateMode: showValidationErrors
              ? AutovalidateMode.onUserInteraction
              : AutovalidateMode.disabled,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: widget.firstNameController,
                      textInputAction: TextInputAction.next,
                      validator: ErrorValidation.validateFirstName,
                      decoration: const InputDecoration(
                        labelText: 'First name',
                        hintText: 'Juan',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: widget.lastNameController,
                      textInputAction: TextInputAction.next,
                      validator: ErrorValidation.validateLastName,
                      decoration: const InputDecoration(
                        labelText: 'Last name',
                        hintText: 'Dela Cruz',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  SizedBox(
                    width: 92,
                    child: ValueListenableBuilder<String?>(
                      valueListenable: _selectedCountryCodeNotifier,
                      builder: (context, selectedCountryCode, _) {
                        return DropdownButtonFormField<String>(
                          key: ValueKey(selectedCountryCode),
                          initialValue: selectedCountryCode,
                          items: _countryCodeItems,
                          onChanged: (value) {
                            _selectedCountryCodeNotifier.value = value;
                          },
                          validator: ErrorValidation.validateCountryCode,
                          decoration: const InputDecoration(
                            labelText: 'Code',
                          ),
                          hint: const Text('+63'),
                          borderRadius: BorderRadius.circular(16),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: widget.mobileNumberController,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      validator: ErrorValidation.validateMobileNumber,
                      decoration: const InputDecoration(
                        labelText: 'Mobile number',
                        hintText: '9123456789',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: widget.emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                validator: ErrorValidation.validateEmail,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'you@example.com',
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: widget.passwordController,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.next,
                validator: ErrorValidation.validatePassword,
                decoration: InputDecoration(
                  labelText: 'Password',
                  hintText: 'Create a password',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _RegisterPasswordRequirementIndicator(
                passwordController: widget.passwordController,
                labelStyle: widget.passwordRequirementLabelStyle,
                successStyle: widget.passwordRequirementSuccessStyle,
                errorStyle: widget.passwordRequirementErrorStyle,
                transitionDuration: widget.passwordRequirementDuration,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: widget.confirmPasswordController,
                obscureText: _obscureConfirmPassword,
                textInputAction: TextInputAction.done,
                validator: (value) => ErrorValidation.validateConfirmPassword(
                  value,
                  password: widget.passwordController.text,
                ),
                onFieldSubmitted: (_) => widget.onSubmit(),
                decoration: InputDecoration(
                  labelText: 'Confirm password',
                  hintText: 'Re-enter your password',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureConfirmPassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureConfirmPassword = !_obscureConfirmPassword;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 8),
              _RegisterTermsField(
                acceptTermsNotifier: _acceptTermsNotifier,
                showTermsErrorNotifier: _showTermsErrorNotifier,
                checkboxInactiveColor: widget.checkboxInactiveColor,
                normalTextStyle: widget.termsTextStyle,
                errorTextStyle: widget.termsErrorTextStyle,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: widget.onSubmit,
                  child: const Text('Create Account'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _RegisterFormSnapshot {
  const _RegisterFormSnapshot({
    required this.acceptTerms,
    required this.selectedCountryCode,
  });

  final bool acceptTerms;
  final String? selectedCountryCode;
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
        final isComplete = message == 'Complete';

        return Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 6,
          runSpacing: 4,
          children: [
            requirementLabel,
            AnimatedSwitcher(
              duration: transitionDuration,
              child: Text(
                message,
                key: ValueKey(message),
                style: isComplete ? successStyle : errorStyle,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RegisterTermsField extends StatelessWidget {
  const _RegisterTermsField({
    required this.acceptTermsNotifier,
    required this.showTermsErrorNotifier,
    required this.checkboxInactiveColor,
    required this.normalTextStyle,
    required this.errorTextStyle,
  });

  final ValueNotifier<bool> acceptTermsNotifier;
  final ValueNotifier<bool> showTermsErrorNotifier;
  final Color checkboxInactiveColor;
  final TextStyle? normalTextStyle;
  final TextStyle? errorTextStyle;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: showTermsErrorNotifier,
      builder: (context, showTermsError, child) {
        return ValueListenableBuilder<bool>(
          valueListenable: acceptTermsNotifier,
          builder: (context, acceptTerms, _) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Checkbox(
                  value: acceptTerms,
                  shape: const CircleBorder(),
                  side: BorderSide(
                    color:
                        showTermsError ? appInputErrorColor : checkboxInactiveColor,
                  ),
                  onChanged: (value) {
                    final nextValue = value ?? false;
                    acceptTermsNotifier.value = nextValue;
                    if (nextValue && showTermsErrorNotifier.value) {
                      showTermsErrorNotifier.value = false;
                    }
                  },
                ),
                Expanded(
                  child: Text(
                    'I agree to the Terms and Conditions',
                    style: showTermsError ? errorTextStyle : normalTextStyle,
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _RegisterSecondaryActions extends StatelessWidget {
  const _RegisterSecondaryActions({
    required this.theme,
    required this.dividerColor,
    required this.socialButtonFillColor,
    required this.continueWithLabelStyle,
    required this.onContinueAsGuest,
    required this.onGoogleSignIn,
    required this.onFacebookSignIn,
  });

  final ThemeData theme;
  final Color dividerColor;
  final Color socialButtonFillColor;
  final TextStyle? continueWithLabelStyle;
  final Future<void> Function() onContinueAsGuest;
  final Future<void> Function() onGoogleSignIn;
  final Future<void> Function() onFacebookSignIn;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: onContinueAsGuest,
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                color: theme.colorScheme.primary,
              ),
              foregroundColor: theme.colorScheme.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Continue as guest'),
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: Divider(
                color: dividerColor,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'or continue with',
                style: continueWithLabelStyle,
              ),
            ),
            Expanded(
              child: Divider(
                color: dividerColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _RegisterSocialButton(
              fillColor: socialButtonFillColor,
              assetPath: 'assets/images/google_logo.png',
              onTap: onGoogleSignIn,
            ),
            const SizedBox(width: 12),
            _RegisterSocialButton(
              fillColor: socialButtonFillColor,
              assetPath: 'assets/images/facebook_logo.png',
              onTap: onFacebookSignIn,
            ),
          ],
        ),
      ],
    );
  }
}

class _RegisterSocialButton extends StatelessWidget {
  const _RegisterSocialButton({
    required this.fillColor,
    required this.assetPath,
    required this.onTap,
  });

  final Color fillColor;
  final String assetPath;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: fillColor,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
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



