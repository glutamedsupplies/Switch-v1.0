/// Local dial-code catalog (no network API).
/// Flags use Unicode emoji regional indicators.
class CountryDialCode {
  const CountryDialCode({
    required this.iso2,
    required this.name,
    required this.dialCode,
    required this.flag,
    this.nationalNumberLength,
    this.hint,
  });

  final String iso2;
  final String name;
  /// E.164 country calling code, e.g. `+63`.
  final String dialCode;
  final String flag;
  /// Expected national digit count when fixed (e.g. PH = 10). Null = 7–15.
  final int? nationalNumberLength;
  final String? hint;

  String get label => '$flag  $dialCode';

  String get searchText =>
      '$name $dialCode $iso2'.toLowerCase();
}

abstract final class CountryDialCodes {
  static const CountryDialCode philippines = CountryDialCode(
    iso2: 'PH',
    name: 'Philippines',
    dialCode: '+63',
    flag: '🇵🇭',
    nationalNumberLength: 10,
    hint: 'Enter 10 digits beginning with 9.',
  );

  /// PH first, then A–Z by country name.
  static const List<CountryDialCode> all = [
    philippines,
    CountryDialCode(iso2: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸'),
    CountryDialCode(iso2: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦'),
    CountryDialCode(iso2: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧'),
    CountryDialCode(iso2: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺'),
    CountryDialCode(iso2: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿'),
    CountryDialCode(iso2: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', nationalNumberLength: 8),
    CountryDialCode(iso2: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾'),
    CountryDialCode(iso2: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩'),
    CountryDialCode(iso2: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭'),
    CountryDialCode(iso2: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳'),
    CountryDialCode(iso2: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵'),
    CountryDialCode(iso2: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷'),
    CountryDialCode(iso2: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳'),
    CountryDialCode(iso2: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', nationalNumberLength: 8),
    CountryDialCode(iso2: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼'),
    CountryDialCode(iso2: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', nationalNumberLength: 10),
    CountryDialCode(iso2: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰'),
    CountryDialCode(iso2: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩'),
    CountryDialCode(iso2: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪'),
    CountryDialCode(iso2: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦'),
    CountryDialCode(iso2: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦'),
    CountryDialCode(iso2: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼'),
    CountryDialCode(iso2: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭'),
    CountryDialCode(iso2: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲'),
    CountryDialCode(iso2: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬'),
    CountryDialCode(iso2: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦'),
    CountryDialCode(iso2: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬'),
    CountryDialCode(iso2: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪'),
    CountryDialCode(iso2: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭'),
    CountryDialCode(iso2: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪'),
    CountryDialCode(iso2: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷'),
    CountryDialCode(iso2: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹'),
    CountryDialCode(iso2: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸'),
    CountryDialCode(iso2: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹'),
    CountryDialCode(iso2: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱'),
    CountryDialCode(iso2: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪'),
    CountryDialCode(iso2: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭'),
    CountryDialCode(iso2: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹'),
    CountryDialCode(iso2: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪'),
    CountryDialCode(iso2: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴'),
    CountryDialCode(iso2: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰'),
    CountryDialCode(iso2: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮'),
    CountryDialCode(iso2: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪'),
    CountryDialCode(iso2: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱'),
    CountryDialCode(iso2: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿'),
    CountryDialCode(iso2: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴'),
    CountryDialCode(iso2: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷'),
    CountryDialCode(iso2: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷'),
    CountryDialCode(iso2: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺'),
    CountryDialCode(iso2: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦'),
    CountryDialCode(iso2: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷'),
    CountryDialCode(iso2: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽'),
    CountryDialCode(iso2: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷'),
    CountryDialCode(iso2: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱'),
    CountryDialCode(iso2: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴'),
    CountryDialCode(iso2: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪'),
    CountryDialCode(iso2: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱'),
    CountryDialCode(iso2: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴'),
    CountryDialCode(iso2: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧'),
    CountryDialCode(iso2: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭'),
    CountryDialCode(iso2: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦'),
    CountryDialCode(iso2: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲'),
    CountryDialCode(iso2: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳'),
    CountryDialCode(iso2: 'MO', name: 'Macau', dialCode: '+853', flag: '🇲🇴', nationalNumberLength: 8),
  ];

  static CountryDialCode byDialCode(String dialCode) {
    final normalized = dialCode.trim();
    for (final country in all) {
      if (country.dialCode == normalized) {
        return country;
      }
    }
    return philippines;
  }
}
