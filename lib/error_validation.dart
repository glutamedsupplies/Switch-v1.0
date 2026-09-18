import 'package:flutter/services.dart';

class ErrorValidation {
  static final RegExp _emailPattern = RegExp(
    r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
  );
  static final RegExp _uppercasePattern = RegExp(r'[A-Z]');
  static final RegExp _numberPattern = RegExp(r'\d');
  static final RegExp _symbolPattern = RegExp(
    r'''[!@#$%^&*(),.?":{}|<>\[\]\\\/_\-+=~`;]''',
  );

  /// Letters, spaces, hyphens, and apostrophes only (real name characters).
  static final RegExp _nameAllowedPattern = RegExp(
    r"^[A-Za-zÀ-ÖØ-öø-ÿÑñ](?:[A-Za-zÀ-ÖØ-öø-ÿÑñ' -]*[A-Za-zÀ-ÖØ-öø-ÿÑñ])?$",
  );
  static final RegExp _nameHasVowelPattern = RegExp(
    r'[AEIOUaeiouÀÈÌÒÙàèìòùÁÉÍÓÚáéíóúÄËÏÖÜäëïöüÑñ]',
  );
  static final RegExp _nameRepeatedCharPattern = RegExp(
    r'(.)\1{2,}',
    caseSensitive: false,
  );
  static final RegExp _nameDigitsOrWeirdSymbolsPattern = RegExp(
    r'''[0-9_@#$%^&*()+=\[\]{}|\\:;"<>.,/?!~`]''',
  );

  static const Set<String> _blockedNameTokens = {
    'test',
    'testing',
    'tester',
    'asdf',
    'asdfgh',
    'qwer',
    'qwerty',
    'qwertyuiop',
    'zxcv',
    'zxcvbn',
    'abc',
    'abcd',
    'abcde',
    'abcdef',
    'xyz',
    'xxx',
    'aaa',
    'bbb',
    'ccc',
    'none',
    'null',
    'n/a',
    'na',
    'unknown',
    'firstname',
    'lastname',
    'fname',
    'lname',
    'name',
    'user',
    'username',
    'sample',
    'demo',
    'guest',
    'admin',
    'haha',
    'hehe',
    'lol',
    'asd',
    'fgh',
    'jkl',
    'poi',
    'lkj',
  };

  /// Allows only name characters while typing (no digits/symbols).
  static final FilteringTextInputFormatter nameInputFormatter =
      FilteringTextInputFormatter.allow(
    RegExp(r"[A-Za-zÀ-ÖØ-öø-ÿÑñ' -]"),
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

  static String? validateMobileNumber(
    String? value, {
    String countryCode = '+63',
  }) {
    final mobileNumber = value?.trim() ?? '';

    if (mobileNumber.isEmpty) {
      return 'Mobile number is required.';
    }

    if (!RegExp(r'^\d+$').hasMatch(mobileNumber)) {
      return 'Mobile number can only contain digits.';
    }

    // Philippine mobile: 10 digits starting with 9 (e.g. 9171234567)
    if (countryCode.trim() == '+63') {
      if (!RegExp(r'^9\d{9}$').hasMatch(mobileNumber)) {
        return 'Enter a valid PH mobile (10 digits, starts with 9).';
      }
      return null;
    }

    if (mobileNumber.length < 7 || mobileNumber.length > 15) {
      return 'Enter a valid mobile number (7–15 digits).';
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
    final normalizedValue = value?.trim().replaceAll(RegExp(r'\s+'), ' ') ?? '';

    if (normalizedValue.isEmpty) {
      return '$fieldName is required.';
    }

    if (normalizedValue.length < 2) {
      return '$fieldName must be at least 2 characters.';
    }

    if (normalizedValue.length > 40) {
      return '$fieldName must be at most 40 characters.';
    }

    if (_nameDigitsOrWeirdSymbolsPattern.hasMatch(normalizedValue)) {
      return '$fieldName can only contain letters.';
    }

    if (!_nameAllowedPattern.hasMatch(normalizedValue)) {
      return 'Enter a valid $fieldName.';
    }

    // Reject keyboard spam / placeholder junk (asdf, qwerty, xxx, etc.).
    final compact = normalizedValue
        .toLowerCase()
        .replaceAll(RegExp(r"['\-\s]"), '');
    if (_blockedNameTokens.contains(compact)) {
      return 'Enter a real $fieldName.';
    }

    for (final part in normalizedValue.split(RegExp(r"[\s\-']+"))) {
      if (part.isEmpty) continue;
      if (part.length < 2) {
        return 'Enter a real $fieldName.';
      }
      final partLower = part.toLowerCase();
      if (_blockedNameTokens.contains(partLower)) {
        return 'Enter a real $fieldName.';
      }
      if (_nameRepeatedCharPattern.hasMatch(partLower)) {
        return 'Enter a real $fieldName.';
      }
      // Short particles (Ng, Sy, De) may lack vowels; require vowels on longer parts.
      if (part.length >= 3 && !_nameHasVowelPattern.hasMatch(part)) {
        return 'Enter a real $fieldName.';
      }
    }

    // Mostly unique letters in short strings still fail vowel/length checks;
    // also reject alternating gibberish with almost no vowel density.
    final lettersOnly = compact.replaceAll(RegExp(r'[^a-zñ]'), '');
    if (lettersOnly.length >= 4) {
      final vowelCount = RegExp(r'[aeiouñ]').allMatches(lettersOnly).length;
      if (vowelCount / lettersOnly.length < 0.2) {
        return 'Enter a real $fieldName.';
      }
    }

    return null;
  }
}
