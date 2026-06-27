class ErrorValidation {
  static final RegExp _emailPattern = RegExp(
    r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
  );
  static final RegExp _uppercasePattern = RegExp(r'[A-Z]');
  static final RegExp _numberPattern = RegExp(r'\d');
  static final RegExp _symbolPattern = RegExp(
    r'''[!@#$%^&*(),.?":{}|<>\[\]\\\/_\-+=~`;]''',
  );

  static const String passwordRequirementsMessage =
      'Password must include at least 8 characters, 1 number, 1 uppercase letter, and 1 symbol.';

  static String? validateFirstName(String? value) {
    return _validateName(
      value,
      fieldName: 'First name',
    );
  }

  static String? validateLastName(String? value) {
    return _validateName(
      value,
      fieldName: 'Last name',
    );
  }

  static String? validateEmail(String? value) {
    return _emailErrorMessage(value);
  }

  static String? validateCountryCode(String? value) {
    final countryCode = value?.trim() ?? '';

    if (countryCode.isEmpty) {
      return 'Country code is required.';
    }

    if (!RegExp(r'^\+\d{1,4}$').hasMatch(countryCode)) {
      return 'Use format like +63.';
    }

    return null;
  }

  static String? validateMobileNumber(String? value) {
    final mobileNumber = value?.trim() ?? '';

    if (mobileNumber.isEmpty) {
      return 'Mobile number is required.';
    }

    if (!RegExp(r'^\d{7,15}$').hasMatch(mobileNumber)) {
      return 'Enter a valid mobile number.';
    }

    return null;
  }

  static String? validatePassword(String? value) {
    return _passwordErrorMessage(value);
  }

  static bool hasMinimumPasswordLength(String value) {
    return value.trim().length >= 8;
  }

  static bool hasPasswordNumber(String value) {
    return _numberPattern.hasMatch(value);
  }

  static bool hasPasswordUppercase(String value) {
    return _uppercasePattern.hasMatch(value);
  }

  static bool hasPasswordSymbol(String value) {
    return _symbolPattern.hasMatch(value);
  }

  static int passwordStrengthScore(String value) {
    var score = 0;

    if (hasMinimumPasswordLength(value)) {
      score += 1;
    }
    if (hasPasswordNumber(value)) {
      score += 1;
    }
    if (hasPasswordUppercase(value)) {
      score += 1;
    }
    if (hasPasswordSymbol(value)) {
      score += 1;
    }

    return score;
  }

  static String? validateConfirmPassword(
    String? value, {
    required String password,
  }) {
    final confirmPassword = value?.trim() ?? '';

    if (confirmPassword.isEmpty) {
      return 'Please confirm your password.';
    }

    if (confirmPassword != password.trim()) {
      return 'Passwords do not match.';
    }

    return null;
  }

  static String registerErrorMessage({
    required String firstName,
    required String lastName,
    required String countryCode,
    required String mobileNumber,
    required String email,
    required String password,
    required String confirmPassword,
  }) {
    return validateFirstName(firstName) ??
        validateLastName(lastName) ??
        validateCountryCode(countryCode) ??
        validateMobileNumber(mobileNumber) ??
        _emailErrorMessage(email) ??
        _passwordErrorMessage(password) ??
        validateConfirmPassword(
          confirmPassword,
          password: password,
        ) ??
        'Please check your registration details.';
  }

  static String? _emailErrorMessage(String? value) {
    final email = value?.trim() ?? '';

    if (email.isEmpty) {
      return 'Email is required.';
    }

    if (!_emailPattern.hasMatch(email)) {
      return 'Enter a valid email address.';
    }

    return null;
  }

  static String? _passwordErrorMessage(String? value) {
    final password = value?.trim() ?? '';

    if (password.isEmpty) {
      return 'Password is required.';
    }

    if (passwordStrengthScore(password) < 4) {
      return passwordRequirementsMessage;
    }

    return null;
  }

  static String? _validateName(
    String? value, {
    required String fieldName,
  }) {
    final normalizedValue = value?.trim() ?? '';

    if (normalizedValue.isEmpty) {
      return '$fieldName is required.';
    }

    if (normalizedValue.length < 2) {
      return '$fieldName must be at least 2 characters.';
    }

    return null;
  }
}
