import 'package:flutter/material.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/verify_code.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  final ValueNotifier<_ForgotPasswordValidationState> _validationStateNotifier =
      ValueNotifier(const _ForgotPasswordValidationState());

  late ThemeData _theme;
  late ThemeData _scopedTheme;
  late Color _secondaryTextColor;
  late List<Color> _backgroundColors;

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
    _scopedTheme = _theme.copyWith(
      inputDecorationTheme: _buildForgotPasswordInputDecorationTheme(
        _theme.inputDecorationTheme,
        isDark,
      ),
    );
  }

  @override
  void dispose() {
    _validationStateNotifier.dispose();
    _emailController.dispose();
    super.dispose();
  }

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

  Future<void> _handleVerifyEmail() async {
    _dismissKeyboard();

    final validationState = _validationStateNotifier.value;
    if (!validationState.showValidationErrors || !validationState.showEmailError) {
      _updateValidationState(
        showValidationErrors: true,
        showEmailError: true,
      );
    }

    final isValid = _formKey.currentState?.validate() ?? false;

    if (!isValid) {
      AppSnackBar.showError(
        context,
        message: ErrorValidation.validateEmail(_emailController.text) ??
            'Please enter a valid email.',
      );
      return;
    }

    await LoadingScreen.showWhile(context, () async {});

    if (!mounted) {
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => VerifyCodePage(
          email: _emailController.text.trim(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: _backgroundColors,
          ),
        ),
        child: SafeArea(
          child: _ForgotPasswordViewport(
            theme: _theme,
            scopedTheme: _scopedTheme,
            secondaryTextColor: _secondaryTextColor,
            onBack: () {
              _dismissKeyboard();
              Navigator.of(context).pop();
            },
            formKey: _formKey,
            emailController: _emailController,
            validationStateNotifier: _validationStateNotifier,
            onEmailErrorChanged: (showEmailError) {
              _updateValidationState(
                showEmailError: showEmailError,
              );
            },
            onVerifyEmail: _handleVerifyEmail,
          ),
        ),
      ),
    );
  }
}

dynamic _buildForgotPasswordInputDecorationTheme(
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

class _ForgotPasswordViewport extends StatelessWidget {
  const _ForgotPasswordViewport({
    required this.theme,
    required this.scopedTheme,
    required this.secondaryTextColor,
    required this.onBack,
    required this.formKey,
    required this.emailController,
    required this.validationStateNotifier,
    required this.onEmailErrorChanged,
    required this.onVerifyEmail,
  });

  final ThemeData theme;
  final ThemeData scopedTheme;
  final Color secondaryTextColor;
  final VoidCallback onBack;
  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final ValueNotifier<_ForgotPasswordValidationState> validationStateNotifier;
  final ValueChanged<bool> onEmailErrorChanged;
  final Future<void> Function() onVerifyEmail;

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
            constraints: BoxConstraints(
              minHeight: constraints.maxHeight,
            ),
            child: Stack(
              children: [
                _ForgotPasswordIntro(
                  theme: theme,
                  secondaryTextColor: secondaryTextColor,
                  onBack: onBack,
                ),
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 212),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Theme(
                          data: scopedTheme,
                          child: _ForgotPasswordFormSection(
                            formKey: formKey,
                            emailController: emailController,
                            validationStateNotifier: validationStateNotifier,
                            onEmailErrorChanged: onEmailErrorChanged,
                            onVerifyEmail: onVerifyEmail,
                          ),
                        ),
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

class _ForgotPasswordIntro extends StatelessWidget {
  const _ForgotPasswordIntro({
    required this.theme,
    required this.secondaryTextColor,
    required this.onBack,
  });

  final ThemeData theme;
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
            'Forgot password',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Verify your email to continue to reset your password.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryTextColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _ForgotPasswordFormSection extends StatelessWidget {
  const _ForgotPasswordFormSection({
    required this.formKey,
    required this.emailController,
    required this.validationStateNotifier,
    required this.onEmailErrorChanged,
    required this.onVerifyEmail,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final ValueNotifier<_ForgotPasswordValidationState> validationStateNotifier;
  final ValueChanged<bool> onEmailErrorChanged;
  final Future<void> Function() onVerifyEmail;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<_ForgotPasswordValidationState>(
      valueListenable: validationStateNotifier,
      builder: (context, validationState, child) {
        return Form(
          key: formKey,
          autovalidateMode: validationState.showValidationErrors
              ? AutovalidateMode.onUserInteraction
              : AutovalidateMode.disabled,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                onChanged: (value) {
                  final shouldShowError = value.trim().isEmpty;

                  if (validationState.showEmailError != shouldShowError) {
                    onEmailErrorChanged(shouldShowError);
                  }
                },
                validator: (value) {
                  if (!validationStateNotifier.value.showEmailError) {
                    return null;
                  }

                  return ErrorValidation.validateEmail(value);
                },
                onFieldSubmitted: (_) => onVerifyEmail(),
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'you@example.com',
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onVerifyEmail,
                  child: const Text('Verify email'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ForgotPasswordValidationState {
  const _ForgotPasswordValidationState({
    this.showValidationErrors = false,
    this.showEmailError = false,
  });

  final bool showValidationErrors;
  final bool showEmailError;

  _ForgotPasswordValidationState copyWith({
    bool? showValidationErrors,
    bool? showEmailError,
  }) {
    return _ForgotPasswordValidationState(
      showValidationErrors:
          showValidationErrors ?? this.showValidationErrors,
      showEmailError: showEmailError ?? this.showEmailError,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }

    return other is _ForgotPasswordValidationState &&
        other.showValidationErrors == showValidationErrors &&
        other.showEmailError == showEmailError;
  }

  @override
  int get hashCode => Object.hash(showValidationErrors, showEmailError);
}
