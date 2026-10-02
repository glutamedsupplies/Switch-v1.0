/// Client-side checks that mirror the backend. The backend stays authoritative.
abstract final class SwitchValidators {
  static final RegExp _name = RegExp(r"^[\p{L}][\p{L} .'-]{0,59}$", unicode: true);
  static final RegExp _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
  static final RegExp _plate = RegExp(r'^[A-Z0-9 -]{3,12}$');

  /// Normalizes a Philippine mobile number to `9XXXXXXXXX`, or returns null.
  static String? normalizePhMobile(String? input) {
    var digits = (input ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.length == 12 && digits.startsWith('63')) digits = digits.substring(2);
    if (digits.length == 11 && digits.startsWith('0')) digits = digits.substring(1);
    return RegExp(r'^9\d{9}$').hasMatch(digits) ? digits : null;
  }

  static String? phMobile(String? value) =>
      normalizePhMobile(value) == null ? 'Enter a valid PH mobile number (09XX XXX XXXX).' : null;

  static String? name(String? value, {String field = 'name'}) =>
      _name.hasMatch((value ?? '').trim()) ? null : 'Enter your $field.';

  static String? optionalEmail(String? value) {
    final text = (value ?? '').trim();
    if (text.isEmpty) return null;
    return _email.hasMatch(text) ? null : 'Enter a valid email address.';
  }

  static String? password(String? value) {
    final text = value ?? '';
    if (text.length < 8 || text.length > 128 || !RegExp(r'[A-Za-z]').hasMatch(text) || !RegExp(r'\d').hasMatch(text)) {
      return 'Use 8+ characters with at least one letter and one number.';
    }
    return null;
  }

  static String? plate(String? value) =>
      _plate.hasMatch((value ?? '').trim().toUpperCase()) ? null : 'Enter the plate number (e.g. ABC 1234).';

  static String? required(String? value, String message) => (value ?? '').trim().isEmpty ? message : null;

  static String? pin(String? value, {int length = 6}) =>
      RegExp('^\\d{$length}\$').hasMatch((value ?? '').trim()) ? null : 'Enter the $length-digit PIN.';
}
