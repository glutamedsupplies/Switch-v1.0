import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:gms_shopping/widgets/password_visibility_icon.dart';

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

  bool _autovalidate = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;

  late ThemeData _theme;
  late ThemeData _scopedTheme;
  late Color _secondaryTextColor;
  late TextStyle? _headerTitleStyle;
  late TextStyle? _headerBodyStyle;
  late TextStyle? _requirementLabelStyle;
  late TextStyle? _requirementSuccessStyle;
  late TextStyle? _requirementErrorStyle;
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
      color: const Color(0xFF2E7D32),
      fontWeight: FontWeight.w700,
    );
    _requirementErrorStyle = _theme.textTheme.bodySmall?.copyWith(
      color: appInputErrorColor,
      fontWeight: FontWeight.w700,
    );
    _requirementTransitionDuration = appMotionFrames(13);
    _scopedTheme = _theme.copyWith(
      inputDecorationTheme: _buildChangePasswordInputDecorationTheme(
        _theme.inputDecorationTheme,
        isDark,
      ),
    );
  }

  @override
  void dispose() {
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
    if (_isSubmitting) return;
    _dismissKeyboard();

    setState(() => _autovalidate = true);
    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid) {
      AppSnackBar.showError(
        context,
        message: _changePasswordErrorMessage(),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await LoadingScreen.showWhile(context, () async {});

      if (!mounted) return;

      final navigator = Navigator.of(context);
      navigator.popUntil((route) => route.isFirst);
      AppSnackBar.showSuccess(
        navigator.context,
        message: 'Password updated. Please sign in.',
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
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
                        Text(
                          'Change password',
                          style: _headerTitleStyle,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Create a new password for ${widget.email}.',
                          style: _headerBodyStyle,
                        ),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.next,
                          validator: ErrorValidation.validatePassword,
                          decoration: InputDecoration(
                            labelText: 'New password',
                            errorStyle: appInputBorderOnlyErrorStyle,
                            suffixIcon: IconButton(
                              onPressed: () {
                                setState(
                                  () => _obscurePassword = !_obscurePassword,
                                );
                              },
                              icon: PasswordVisibilityIcon(
                                obscured: _obscurePassword,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _ChangePasswordRequirementIndicator(
                          passwordController: _passwordController,
                          labelStyle: _requirementLabelStyle,
                          successStyle: _requirementSuccessStyle,
                          errorStyle: _requirementErrorStyle,
                          transitionDuration: _requirementTransitionDuration,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirmPassword,
                          textInputAction: TextInputAction.done,
                          validator: (value) =>
                              ErrorValidation.validateConfirmPassword(
                            value,
                            password: _passwordController.text,
                          ),
                          onFieldSubmitted: (_) => _handleChangePassword(),
                          decoration: InputDecoration(
                            labelText: 'Confirm password',
                            errorStyle: appInputBorderOnlyErrorStyle,
                            suffixIcon: IconButton(
                              onPressed: () {
                                setState(
                                  () => _obscureConfirmPassword =
                                      !_obscureConfirmPassword,
                                );
                              },
                              icon: PasswordVisibilityIcon(
                                obscured: _obscureConfirmPassword,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed:
                                _isSubmitting ? null : _handleChangePassword,
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Update password'),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward_rounded, size: 18),
                              ],
                            ),
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
}

dynamic _buildChangePasswordInputDecorationTheme(
  dynamic decorationTheme,
  bool isDark,
) {
  final scaffoldFill = isDark ? Colors.black : Colors.white;
  return decorationTheme.copyWith(
    filled: true,
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
    border: _copyChangePasswordInputBorderWithRadius(decorationTheme.border),
    enabledBorder: _copyChangePasswordInputBorderWithRadius(
      decorationTheme.enabledBorder,
    ),
    focusedBorder: _copyChangePasswordInputBorderWithRadius(
      decorationTheme.focusedBorder,
    ),
    disabledBorder: _copyChangePasswordInputBorderWithRadius(
      decorationTheme.disabledBorder,
    ),
    errorBorder: _copyChangePasswordInputBorderWithRadius(
      decorationTheme.errorBorder,
    ),
    focusedErrorBorder: _copyChangePasswordInputBorderWithRadius(
      decorationTheme.focusedErrorBorder,
    ),
  );
}

InputBorder? _copyChangePasswordInputBorderWithRadius(InputBorder? border) {
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
