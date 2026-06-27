// =============================================================================
// FILE: login.dart
// =============================================================================
// PURPOSE: Login page for the GMS Shopping App.
// This screen allows users to sign in with their email and password,
// continue as a guest, or sign up for a new account.
// It also provides placeholder buttons for Google and Facebook sign-in.
// =============================================================================

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:gms_shopping/cart.dart';
import 'package:gms_shopping/chat_support.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/favorite_products_store.dart';
import 'package:gms_shopping/forgotpassword.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/order_store.dart';
import 'package:gms_shopping/register.dart';
import 'package:gms_shopping/services/login_service_base.dart';
import 'package:gms_shopping/services/login_service_web.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/theme/loadingscreen.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  // =========================================================================
  // initState
  // =========================================================================
  // Called when this widget is inserted into the widget tree.
  // Sets up post-frame callback to check if user is already logged in.
  // =========================================================================
  @override
  void initState() {
    super.initState();
    // Use addPostFrameCallback to avoid calling setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_redirectIfSessionExists());
    });
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
    _validationStateNotifier.dispose();
    _emailController.dispose();
    _passwordController.dispose();
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
      return 'Password is required.';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
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
        'Please check your login details.';
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

    // Save to SharedPreferences for persistence
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_first_name', firstName);
    await prefs.setString('profile_last_name', lastName);
    await prefs.setString('profile_email', email);

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
  // Placeholder handler for Google sign-in functionality.
  // Shows a "coming soon" message. To be implemented in future.
  // =========================================================================
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
      message: 'Facebook sign in coming soon.',
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
  // =========================================================================
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Secondary text color adapts to light/dark mode
    final secondaryTextColor = isDark ? Colors.white70 : Colors.black54;

    // Get background gradient colors based on theme
    final backgroundColors = appLoginBackgroundColors(
      theme: theme,
      isDark: isDark,
    );

    // Create a scoped theme with custom input decoration
    final scopedTheme = theme.copyWith(
      inputDecorationTheme: _buildLoginInputDecorationTheme(
        theme.inputDecorationTheme,
        isDark,
      ),
    );

    return Scaffold(
      body: Container(
        color: isDark ? appDarkScaffoldColor : Colors.white,
        child: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 620),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Theme(
                    data: scopedTheme,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // App logo at the top
                        const _LoginHeader(),

                        // Welcome heading
                        Text(
                          'Welcome',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Subtitle
                        Text(
                          'Sign in to continue to GMS Shopping.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: secondaryTextColor,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Email and password form fields
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
                        ),

                        // Forgot password link
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: _openForgotPasswordPage,
                            child: const Text('Forgot password?'),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Sign In button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _handleSignIn,
                            child: const Text('Sign In'),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Secondary actions (continue as guest, social sign-in, register)
                        _LoginSecondaryActions(
                          theme: theme,
                          secondaryTextColor: secondaryTextColor,
                          onContinueAsGuest: _handleContinueAsGuest,
                          onGoogleSignIn: _handleGoogleSignIn,
                          onFacebookSignIn: _handleFacebookSignIn,
                          onOpenRegister: _openRegisterPage,
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
// _LoginHeader
// =========================================================================
// Stateless widget that displays the app logo at the top of the login page.
// Shows the GMS Shopping logo image centered with padding below.
// =========================================================================
class _LoginHeader extends StatelessWidget {
  const _LoginHeader();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.only(bottom: 20),
        child: Image(
          image: AssetImage('assets/images/gmslogo.png'),
          width: 96,
          height: 96,
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
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'you@example.com',
                  // Hide error text but keep space for layout consistency
                  errorStyle: TextStyle(
                    color: Colors.transparent,
                    fontSize: 0,
                    height: 0,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Password field with visibility toggle
              _LoginPasswordField(
                controller: passwordController,
                validator: passwordValidator,
                onFieldSubmitted: (_) => onSignIn(),
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
// - "Continue as guest" button
// - Social sign-in buttons (Google, Facebook)
// - "Don't have an account? Sign up" link
// =========================================================================
class _LoginSecondaryActions extends StatelessWidget {
  const _LoginSecondaryActions({
    required this.theme,
    required this.secondaryTextColor,
    required this.onContinueAsGuest,
    required this.onGoogleSignIn,
    required this.onFacebookSignIn,
    required this.onOpenRegister,
  });

  // App theme for styling
  final ThemeData theme;
  // Color for secondary text elements
  final Color secondaryTextColor;
  // Callback for "Continue as guest" button
  final Future<void> Function() onContinueAsGuest;
  // Callback for Google sign-in button
  final Future<void> Function() onGoogleSignIn;
  // Callback for Facebook sign-in button
  final Future<void> Function() onFacebookSignIn;
  // Callback for "Sign up" link
  final VoidCallback onOpenRegister;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // "Continue as guest" button - outlined style
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
                'or continue with',
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
        const SizedBox(height: 16),
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
        const SizedBox(height: 16),
        // "Don't have an account? Sign up" link
        Center(
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 4,
            children: [
              Text(
                "Don't have an account?",
                style: theme.textTheme.bodySmall?.copyWith(
                  color: secondaryTextColor,
                ),
              ),
              TextButton(
                onPressed: onOpenRegister,
                child: const Text('Sign up'),
              ),
            ],
          ),
        ),
      ],
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
  });

  // Controller for the password text input
  final TextEditingController controller;
  // Validation function for the password field
  final String? Function(String?) validator;
  // Callback when user submits the field (presses done on keyboard)
  final ValueChanged<String> onFieldSubmitted;

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
    // Change icon color when password is visible (show primary color)
    final passwordToggleColor = _obscurePassword
        ? theme.iconTheme.color
        : theme.colorScheme.primary;

    return TextFormField(
      controller: widget.controller,
      obscureText: _obscurePassword,
      textInputAction: TextInputAction.done,
      validator: widget.validator,
      onFieldSubmitted: widget.onFieldSubmitted,
      decoration: InputDecoration(
        labelText: 'Password',
        hintText: 'Enter your password',
        // Toggle button to show/hide password
        suffixIcon: IconButton(
          onPressed: () {
            setState(() {
              _obscurePassword = !_obscurePassword;
            });
          },
          icon: Icon(
            // Show different icon based on visibility state
            _obscurePassword
                ? Icons.visibility_off_rounded
                : Icons.visibility_rounded,
            color: passwordToggleColor,
          ),
        ),
      ),
    );
  }
}
