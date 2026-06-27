String formatCurrencyAmount(double amount, {bool trimTrailingZeros = true}) {
  final hasDecimals =
      !trimTrailingZeros || amount.truncateToDouble() != amount;
  final fixedAmount = amount.toStringAsFixed(hasDecimals ? 2 : 0);
  final parts = fixedAmount.split('.');
  final wholePart = parts.first;
  final isNegative = wholePart.startsWith('-');
  final digitsOnly = isNegative ? wholePart.substring(1) : wholePart;
  final formattedWholePart = digitsOnly.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  final normalizedWholePart =
      isNegative ? '-$formattedWholePart' : formattedWholePart;

  if (parts.length == 1) {
    return normalizedWholePart;
  }

  return '$normalizedWholePart.${parts[1]}';
}

String formatPesoCurrency(
  double amount, {
  bool trimTrailingZeros = true,
}) => '\u20B1${formatCurrencyAmount(amount, trimTrailingZeros: trimTrailingZeros)}';

String formatPhpCurrency(
  double amount, {
  bool trimTrailingZeros = true,
}) => 'PHP ${formatCurrencyAmount(amount, trimTrailingZeros: trimTrailingZeros)}';

String formatPlainPCurrency(
  double amount, {
  bool trimTrailingZeros = true,
}) => 'P${formatCurrencyAmount(amount, trimTrailingZeros: trimTrailingZeros)}';
