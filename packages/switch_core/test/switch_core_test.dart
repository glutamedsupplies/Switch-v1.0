import 'package:flutter_test/flutter_test.dart';
import 'package:switch_core/switch_core.dart';

void main() {
  test('formats pesos with grouping and cents', () {
    expect(formatPeso(1234.5), '₱1,234.50');
    expect(formatPeso(0), '₱0.00');
    expect(formatPeso(-59), '−₱59.00');
    expect(formatPeso(1000000, showCents: false), '₱1,000,000');
  });

  test('normalizes PH mobile numbers like the backend', () {
    expect(SwitchValidators.normalizePhMobile('0917 123 4567'), '9171234567');
    expect(SwitchValidators.normalizePhMobile('+63 917 123 4567'), '9171234567');
    expect(SwitchValidators.normalizePhMobile('12345'), isNull);
  });

  test('password and PIN rules', () {
    expect(SwitchValidators.password('short1'), isNotNull);
    expect(SwitchValidators.password('longenough1'), isNull);
    expect(SwitchValidators.pin('123456'), isNull);
    expect(SwitchValidators.pin('12a456'), isNotNull);
  });
}
