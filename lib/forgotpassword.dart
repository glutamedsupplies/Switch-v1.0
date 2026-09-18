import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/services/verification_service.dart';
import 'package:gms_shopping/verify_code.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  bool _autovalidate = false;
  bool _isSending = false;

  late ThemeData _theme;
  late ThemeData _scopedTheme;
  late Color _secondaryTextColor;
  late TextStyle? _headerTitleStyle;
  late TextStyle? _headerBodyStyle;

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
    _scopedTheme = _theme.copyWith(
      inputDecorationTheme: _buildAuthFlowInputDecorationTheme(
        _theme.inputDecorationTheme,
        isDark,
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSendCode() async {
    if (_isSending) return;
    _dismissKeyboard();

    setState(() => _autovalidate = true);
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      AppSnackBar.showError(
        context,
        message: ErrorValidation.validateEmail(_emailController.text) ??
            'Please enter a valid email.',
      );
      return;
    }

    setState(() => _isSending = true);
    try {
      final sendResult = await LoadingScreen.showWhile(context, () async {
        return await createVerificationService().sendVerificationCode(
          purpose: 'password_reset',
          channel: 'email',
          email: _emailController.text.trim(),
        );
      });

      if (!mounted) return;

      if (sendResult.debugCode != null && sendResult.debugCode!.isNotEmpty) {
        AppSnackBar.showSuccess(
          context,
          message: 'Dev code: ${sendResult.debugCode}',
        );
      } else {
        AppSnackBar.showSuccess(
          context,
          message: 'Code sent to ${_emailController.text.trim()}.',
        );
      }

      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (context) => VerifyCodePage(
            email: _emailController.text.trim(),
            purpose: VerifyCodePurpose.passwordReset,
            resendAvailableAt: sendResult.resendAvailableAt,
            resendCooldownSeconds: sendResult.resendCooldownSeconds,
          ),
        ),
      );
    } on VerificationException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
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
                          'Forgot password',
                          style: _headerTitleStyle,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Enter your email and we will send a verification code to reset your password.',
                          style: _headerBodyStyle,
                        ),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.done,
                          validator: ErrorValidation.validateEmail,
                          onFieldSubmitted: (_) => _handleSendCode(),
                          decoration: const InputDecoration(
                            labelText: 'Email address',
                            errorStyle: appInputBorderOnlyErrorStyle,
                          ),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isSending ? null : _handleSendCode,
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Send code'),
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

dynamic _buildAuthFlowInputDecorationTheme(
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
    border: _copyAuthFlowInputBorderWithRadius(decorationTheme.border),
    enabledBorder:
        _copyAuthFlowInputBorderWithRadius(decorationTheme.enabledBorder),
    focusedBorder:
        _copyAuthFlowInputBorderWithRadius(decorationTheme.focusedBorder),
    disabledBorder:
        _copyAuthFlowInputBorderWithRadius(decorationTheme.disabledBorder),
    errorBorder:
        _copyAuthFlowInputBorderWithRadius(decorationTheme.errorBorder),
    focusedErrorBorder: _copyAuthFlowInputBorderWithRadius(
      decorationTheme.focusedErrorBorder,
    ),
  );
}

InputBorder? _copyAuthFlowInputBorderWithRadius(InputBorder? border) {
  if (border is OutlineInputBorder) {
    return border.copyWith(
      borderRadius: BorderRadius.circular(8),
    );
  }
  return border;
}
