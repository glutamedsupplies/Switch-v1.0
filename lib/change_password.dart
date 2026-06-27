import 'package:flutter/material.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({
    super.key,
    required this.email,
  });

  final String email;

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final ValueNotifier<bool> _showValidationErrorsNotifier =
      ValueNotifier(false);

  late ThemeData _theme;
  late ThemeData _scopedTheme;
  late Color _secondaryTextColor;
  late List<Color> _backgroundColors;
  late BoxDecoration _backgroundDecoration;
  late TextStyle? _headerTitleStyle;
  late TextStyle? _headerBodyStyle;
  late TextStyle? _requirementLabelStyle;
  late TextStyle? _requirementSuccessStyle;
  late TextStyle? _requirementErrorStyle;
  late Color _secureFieldInactiveColor;
  late Color _secureFieldActiveColor;
  late Duration _requirementTransitionDuration;

  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    _theme = Theme.of(context);
    final isDark = _theme.brightness == Brightness.dark;

    _secondaryTextColor = isDark ? Colors.white70 : Colors.black54;
    _backgroundColors = appLoginBackgroundColors(
      theme: _theme,
      isDark: isDark,
    );
    _backgroundDecoration = BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: _backgroundColors,
      ),
    );
    _headerTitleStyle = _theme.textTheme.headlineSmall?.copyWith(
      fontWeight: FontWeight.w700,
    );
    _headerBodyStyle = _theme.textTheme.bodyMedium?.copyWith(
      color: _secondaryTextColor,
    );
    _requirementLabelStyle = _theme.textTheme.bodySmall?.copyWith(
      color: _secondaryTextColor,
      fontWeight: FontWeight.w600,
    );
    _requirementSuccessStyle = _theme.textTheme.bodySmall?.copyWith(
      color: _theme.colorScheme.primary,
      fontWeight: FontWeight.w700,
    );
    _requirementErrorStyle = _theme.textTheme.bodySmall?.copyWith(
      color: appInputErrorColor,
      fontWeight: FontWeight.w700,
    );
    _secureFieldInactiveColor =
        _theme.iconTheme.color ?? _theme.colorScheme.onSurface;
    _secureFieldActiveColor = _theme.colorScheme.primary;
    _requirementTransitionDuration = appMotionFrames(13);
    _scopedTheme = _theme.copyWith(
      inputDecorationTheme: _buildChangePasswordInputDecorationTheme(
        _theme.inputDecorationTheme,
        isDark,
      ),
    );
  }

  void _handleBack() {
    _dismissKeyboard();
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _showValidationErrorsNotifier.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _changePasswordErrorMessage() {
    return ErrorValidation.validatePassword(_passwordController.text) ??
        ErrorValidation.validateConfirmPassword(
          _confirmPasswordController.text,
          password: _passwordController.text,
        ) ??
        'Please check your new password.';
  }

  Future<void> _handleChangePassword() async {
    _dismissKeyboard();

    if (!_showValidationErrorsNotifier.value) {
      _showValidationErrorsNotifier.value = true;
    }

    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid) {
      AppSnackBar.showError(
        context,
        message: _changePasswordErrorMessage(),
      );
      return;
    }

    await LoadingScreen.showWhile(context, () async {});

    if (!mounted) {
      return;
    }

    final navigator = Navigator.of(context);

    navigator.popUntil((route) => route.isFirst);
    AppSnackBar.showSuccess(
      navigator.context,
      message: 'Password updated. Please sign in.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: _backgroundDecoration,
        child: SafeArea(
          child: _ChangePasswordViewport(
            theme: _theme,
            scopedTheme: _scopedTheme,
            email: widget.email,
            headerTitleStyle: _headerTitleStyle,
            headerBodyStyle: _headerBodyStyle,
            requirementLabelStyle: _requirementLabelStyle,
            requirementSuccessStyle: _requirementSuccessStyle,
            requirementErrorStyle: _requirementErrorStyle,
            secureFieldInactiveColor: _secureFieldInactiveColor,
            secureFieldActiveColor: _secureFieldActiveColor,
            requirementTransitionDuration: _requirementTransitionDuration,
            formKey: _formKey,
            passwordController: _passwordController,
            confirmPasswordController: _confirmPasswordController,
            showValidationErrorsNotifier: _showValidationErrorsNotifier,
            onBack: _handleBack,
            onSubmit: _handleChangePassword,
          ),
        ),
      ),
    );
  }
}

dynamic _buildChangePasswordInputDecorationTheme(
  dynamic decorationTheme,
  bool isDark,
) {
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

class _ChangePasswordViewport extends StatelessWidget {
  const _ChangePasswordViewport({
    required this.theme,
    required this.scopedTheme,
    required this.email,
    required this.headerTitleStyle,
    required this.headerBodyStyle,
    required this.requirementLabelStyle,
    required this.requirementSuccessStyle,
    required this.requirementErrorStyle,
    required this.secureFieldInactiveColor,
    required this.secureFieldActiveColor,
    required this.requirementTransitionDuration,
    required this.formKey,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.showValidationErrorsNotifier,
    required this.onBack,
    required this.onSubmit,
  });

  final ThemeData theme;
  final ThemeData scopedTheme;
  final String email;
  final TextStyle? headerTitleStyle;
  final TextStyle? headerBodyStyle;
  final TextStyle? requirementLabelStyle;
  final TextStyle? requirementSuccessStyle;
  final TextStyle? requirementErrorStyle;
  final Color secureFieldInactiveColor;
  final Color secureFieldActiveColor;
  final Duration requirementTransitionDuration;
  final GlobalKey<FormState> formKey;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final ValueNotifier<bool> showValidationErrorsNotifier;
  final VoidCallback onBack;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 8,
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Theme(
              data: scopedTheme,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ChangePasswordHeader(
                    theme: theme,
                    email: email,
                    titleStyle: headerTitleStyle,
                    bodyStyle: headerBodyStyle,
                    onBack: onBack,
                  ),
                  const SizedBox(height: 24),
                  _ChangePasswordFormSection(
                    formKey: formKey,
                    passwordController: passwordController,
                    confirmPasswordController: confirmPasswordController,
                    showValidationErrorsNotifier: showValidationErrorsNotifier,
                    requirementLabelStyle: requirementLabelStyle,
                    requirementSuccessStyle: requirementSuccessStyle,
                    requirementErrorStyle: requirementErrorStyle,
                    secureFieldInactiveColor: secureFieldInactiveColor,
                    secureFieldActiveColor: secureFieldActiveColor,
                    requirementTransitionDuration: requirementTransitionDuration,
                    onSubmit: onSubmit,
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

class _ChangePasswordHeader extends StatelessWidget {
  const _ChangePasswordHeader({
    required this.theme,
    required this.email,
    required this.titleStyle,
    required this.bodyStyle,
    required this.onBack,
  });

  final ThemeData theme;
  final String email;
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
        Icon(
          Icons.lock_reset_rounded,
          color: theme.colorScheme.primary,
          size: 72,
        ),
        const SizedBox(height: 20),
        Text(
          'Change password',
          style: titleStyle,
        ),
        const SizedBox(height: 8),
        Text(
          'Create a new password for $email.',
          style: bodyStyle,
        ),
      ],
    );
  }
}

class _ChangePasswordFormSection extends StatelessWidget {
  const _ChangePasswordFormSection({
    required this.formKey,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.showValidationErrorsNotifier,
    required this.requirementLabelStyle,
    required this.requirementSuccessStyle,
    required this.requirementErrorStyle,
    required this.secureFieldInactiveColor,
    required this.secureFieldActiveColor,
    required this.requirementTransitionDuration,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final ValueNotifier<bool> showValidationErrorsNotifier;
  final TextStyle? requirementLabelStyle;
  final TextStyle? requirementSuccessStyle;
  final TextStyle? requirementErrorStyle;
  final Color secureFieldInactiveColor;
  final Color secureFieldActiveColor;
  final Duration requirementTransitionDuration;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: showValidationErrorsNotifier,
      builder: (context, showValidationErrors, child) {
        return Form(
          key: formKey,
          autovalidateMode: showValidationErrors
              ? AutovalidateMode.onUserInteraction
              : AutovalidateMode.disabled,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ChangePasswordSecureField(
                controller: passwordController,
                labelText: 'New password',
                hintText: 'Enter your new password',
                textInputAction: TextInputAction.next,
                inactiveToggleColor: secureFieldInactiveColor,
                activeToggleColor: secureFieldActiveColor,
                validator: ErrorValidation.validatePassword,
              ),
              const SizedBox(height: 12),
              _ChangePasswordRequirementIndicator(
                passwordController: passwordController,
                labelStyle: requirementLabelStyle,
                successStyle: requirementSuccessStyle,
                errorStyle: requirementErrorStyle,
                transitionDuration: requirementTransitionDuration,
              ),
              const SizedBox(height: 16),
              _ChangePasswordSecureField(
                controller: confirmPasswordController,
                labelText: 'Confirm password',
                hintText: 'Re-enter your new password',
                textInputAction: TextInputAction.done,
                inactiveToggleColor: secureFieldInactiveColor,
                activeToggleColor: secureFieldActiveColor,
                validator: (value) =>
                    ErrorValidation.validateConfirmPassword(
                  value,
                  password: passwordController.text,
                ),
                onFieldSubmitted: (_) => onSubmit(),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onSubmit,
                  child: const Text('Update password'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ChangePasswordRequirementIndicator extends StatelessWidget {
  const _ChangePasswordRequirementIndicator({
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

class _ChangePasswordSecureField extends StatefulWidget {
  const _ChangePasswordSecureField({
    required this.controller,
    required this.labelText,
    required this.hintText,
    required this.textInputAction,
    required this.inactiveToggleColor,
    required this.activeToggleColor,
    required this.validator,
    this.onFieldSubmitted,
  });

  final TextEditingController controller;
  final String labelText;
  final String hintText;
  final TextInputAction textInputAction;
  final Color inactiveToggleColor;
  final Color activeToggleColor;
  final String? Function(String?) validator;
  final ValueChanged<String>? onFieldSubmitted;

  @override
  State<_ChangePasswordSecureField> createState() =>
      _ChangePasswordSecureFieldState();
}

class _ChangePasswordSecureFieldState extends State<_ChangePasswordSecureField> {
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    final toggleColor = _obscureText
        ? widget.inactiveToggleColor
        : widget.activeToggleColor;

    return TextFormField(
      controller: widget.controller,
      obscureText: _obscureText,
      textInputAction: widget.textInputAction,
      validator: widget.validator,
      onFieldSubmitted: widget.onFieldSubmitted,
      decoration: InputDecoration(
        labelText: widget.labelText,
        hintText: widget.hintText,
        suffixIcon: IconButton(
          onPressed: () {
            setState(() {
              _obscureText = !_obscureText;
            });
          },
          icon: Icon(
            _obscureText
                ? Icons.visibility_off_rounded
                : Icons.visibility_rounded,
            color: toggleColor,
          ),
        ),
      ),
    );
  }
}
