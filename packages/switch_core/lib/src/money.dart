/// Formats an amount as Philippine pesos, e.g. `₱1,234.50`.
String formatPeso(num? value, {bool showCents = true}) {
  final amount = (value ?? 0).toDouble();
  final negative = amount < 0;
  final fixed = amount.abs().toStringAsFixed(showCents ? 2 : 0);
  final parts = fixed.split('.');
  final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  final cents = parts.length > 1 ? '.${parts[1]}' : '';
  return '${negative ? '−' : ''}₱$whole$cents';
}

/// Reads a JSON number that may arrive as a string.
double readAmount(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}
