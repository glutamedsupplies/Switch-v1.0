import 'package:flutter/material.dart';
import 'package:switch_app/models/payment_partner.dart';

enum PaymentMethodCategory { eWallet, bank, card }

class _MethodStyle {
  const _MethodStyle(this.category, this.badge, this.color);

  final PaymentMethodCategory category;
  final String badge;
  final Color color;
}

// PayMongo `payment_method_types` grouped the way buyers think about them.
// Badge + color are only used when Super Admin has not uploaded a logo.
const Map<String, _MethodStyle> _methodStyles = <String, _MethodStyle>{
  'gcash': _MethodStyle(PaymentMethodCategory.eWallet, 'G', Color(0xFF007DFE)),
  'paymaya': _MethodStyle(PaymentMethodCategory.eWallet, 'M', Color(0xFF00A651)),
  'grab_pay': _MethodStyle(PaymentMethodCategory.eWallet, 'GP', Color(0xFF00B14F)),
  'shopee_pay': _MethodStyle(PaymentMethodCategory.eWallet, 'SP', Color(0xFFEE4D2D)),
  'qrph': _MethodStyle(PaymentMethodCategory.eWallet, 'QR', Color(0xFF1F3A93)),
  'billease': _MethodStyle(PaymentMethodCategory.eWallet, 'BE', Color(0xFF00B3A4)),
  'atome': _MethodStyle(PaymentMethodCategory.eWallet, 'A', Color(0xFF111111)),
  'dob': _MethodStyle(PaymentMethodCategory.bank, 'BPI', Color(0xFFB11116)),
  'dob_ubp': _MethodStyle(PaymentMethodCategory.bank, 'UB', Color(0xFFF37021)),
  'brankas_bdo': _MethodStyle(PaymentMethodCategory.bank, 'BDO', Color(0xFF0033A0)),
  'brankas_landbank': _MethodStyle(PaymentMethodCategory.bank, 'LBP', Color(0xFF00843D)),
  'brankas_metrobank': _MethodStyle(PaymentMethodCategory.bank, 'MB', Color(0xFF1B4F9C)),
  'brankas_rcbc': _MethodStyle(PaymentMethodCategory.bank, 'RCBC', Color(0xFF0060A9)),
  'card': _MethodStyle(PaymentMethodCategory.card, 'CARD', Color(0xFF334155)),
};

const String _visaSuffix = '#visa';
const String _mastercardSuffix = '#mastercard';

String _resolvePaymongoMethod(PaymentPartner partner) {
  final explicit = partner.paymongoMethod.trim().toLowerCase();
  if (_methodStyles.containsKey(explicit)) return explicit;
  final name = partner.branch.trim().toLowerCase();
  if (name.contains('gcash')) return 'gcash';
  if (name.contains('maya')) return 'paymaya';
  if (name.contains('grab')) return 'grab_pay';
  if (name.contains('shopee')) return 'shopee_pay';
  if (name.contains('card') ||
      name.contains('visa') ||
      name.contains('mastercard')) {
    return 'card';
  }
  if (name.contains('bpi')) return 'dob';
  if (name.contains('unionbank')) return 'dob_ubp';
  if (name.contains('bdo')) return 'brankas_bdo';
  if (name.contains('landbank')) return 'brankas_landbank';
  if (name.contains('metrobank')) return 'brankas_metrobank';
  if (name.contains('rcbc')) return 'brankas_rcbc';
  return '';
}

PaymentMethodCategory? paymentMethodCategoryOf(PaymentPartner option) =>
    _methodStyles[option.paymongoMethod]?.category;

bool _isVisa(PaymentPartner option) =>
    option.id.endsWith(_visaSuffix) ||
    option.branch.toLowerCase().contains('visa');

bool _isMastercard(PaymentPartner option) =>
    option.id.endsWith(_mastercardSuffix) ||
    option.branch.toLowerCase().contains('mastercard');

/// Turns the payment partners Super Admin has switched on into buyer options,
/// keeping each partner's own name and logo. Partners that are not linked to a
/// PayMongo method are left out because they cannot be charged. A generic card
/// partner is offered as Visa or Mastercard.
List<PaymentPartner> buildBuyerPaymentOptions(
  List<PaymentPartner> adminPartners,
) {
  final options = <PaymentPartner>[];
  final cardPartners = <PaymentPartner>[];

  for (final partner in adminPartners) {
    if (!partner.isEnabled) continue;
    final method = _resolvePaymongoMethod(partner);
    if (method.isEmpty) continue;
    final option = partner.copyWith(paymongoMethod: method);
    if (method == 'card') {
      cardPartners.add(option);
    } else {
      options.add(option);
    }
  }

  final hasBrandedCards = cardPartners.any(
    (partner) => _isVisa(partner) || _isMastercard(partner),
  );
  if (hasBrandedCards) {
    options.addAll(
      cardPartners.where((p) => _isVisa(p) || _isMastercard(p)),
    );
  } else if (cardPartners.isNotEmpty) {
    final card = cardPartners.first;
    options
      ..add(
        card.copyWith(id: '${card.id}$_visaSuffix', branch: 'Visa', imageUrl: ''),
      )
      ..add(
        card.copyWith(
          id: '${card.id}$_mastercardSuffix',
          branch: 'Mastercard',
          imageUrl: '',
        ),
      );
  }

  return List<PaymentPartner>.unmodifiable(options);
}

/// Keeps a saved selection working when it points at an option that is still
/// on, or maps an older id to the partner that now handles the same method.
String migrateSavedPaymentOptionId(
  String savedId,
  List<PaymentPartner> options,
) {
  final trimmed = savedId.trim();
  if (trimmed.isEmpty) return '';
  for (final option in options) {
    if (option.id == trimmed) return trimmed;
  }

  const legacyMethods = <String, String>{
    'paymongo-gcash': 'gcash',
    'paymongo-maya': 'paymaya',
    'paymongo-grabpay': 'grab_pay',
    'paymongo-shopeepay': 'shopee_pay',
    'paymongo-bank-bpi': 'dob',
    'paymongo-bank-bdo': 'brankas_bdo',
    'paymongo-bank-metrobank': 'brankas_metrobank',
    'paymongo-bank-unionbank': 'dob_ubp',
    'paymongo-bank-landbank': 'brankas_landbank',
    'paymongo-bank-rcbc': 'brankas_rcbc',
  };
  final method = legacyMethods[trimmed];
  if (method != null) {
    for (final option in options) {
      if (option.paymongoMethod == method) return option.id;
    }
  }
  return trimmed;
}

const String _openBanksToken = '__open_banks__';
const String _openCardsToken = '__open_cards__';
const String _backToken = '__back__';

/// Shows the payment method picker and returns the chosen option id. Bank and
/// card choices open a follow-up sheet after the first one closes so only one
/// sheet is ever on screen.
Future<String?> showBuyerPaymentMethodPicker(
  BuildContext context, {
  required List<PaymentPartner> options,
  required String selectedId,
}) async {
  PaymentMethodCategory? brandSheet;
  while (context.mounted) {
    final category = brandSheet;
    final result = category == null
        ? await _showSheet(
            context,
            _PaymentCategorySheet(options: options, selectedId: selectedId),
          )
        : await _showSheet(
            context,
            _PaymentBrandSheet(
              category: category,
              options: options
                  .where((option) => paymentMethodCategoryOf(option) == category)
                  .toList(growable: false),
              selectedId: selectedId,
            ),
          );

    switch (result) {
      case null:
        return null;
      case _openBanksToken:
        brandSheet = PaymentMethodCategory.bank;
      case _openCardsToken:
        brandSheet = PaymentMethodCategory.card;
      case _backToken:
        brandSheet = null;
      default:
        return result;
    }
  }
  return null;
}

Future<String?> _showSheet(BuildContext context, Widget child) {
  final theme = Theme.of(context);
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: theme.colorScheme.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: child,
      ),
    ),
  );
}

Color _secondaryTextColor(ThemeData theme) =>
    theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
    theme.colorScheme.onSurface.withOpacity(0.68);

class _SheetHandle extends StatelessWidget {
  const _SheetHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 42,
        height: 4,
        decoration: BoxDecoration(
          color: Theme.of(context).dividerColor.withOpacity(0.5),
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }
}

class _PaymentCategorySheet extends StatelessWidget {
  const _PaymentCategorySheet({
    required this.options,
    required this.selectedId,
  });

  final List<PaymentPartner> options;
  final String selectedId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondaryColor = _secondaryTextColor(theme);

    List<PaymentPartner> inCategory(PaymentMethodCategory category) => options
        .where((option) => paymentMethodCategoryOf(option) == category)
        .toList(growable: false);

    final eWallets = inCategory(PaymentMethodCategory.eWallet);
    final banks = inCategory(PaymentMethodCategory.bank);
    final cards = inCategory(PaymentMethodCategory.card);

    PaymentPartner? selectedIn(List<PaymentPartner> group) {
      for (final option in group) {
        if (option.id == selectedId) return option;
      }
      return null;
    }

    final selectedBank = selectedIn(banks);
    final selectedCard = selectedIn(cards);

    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.8,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SheetHandle(),
            const SizedBox(height: 14),
            Text(
              'Select Payment Method',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Pay securely through PayMongo.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: secondaryColor,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 16),
            const _CategoryHeader(
              icon: Icons.account_balance_wallet_outlined,
              title: 'E-Wallet',
            ),
            const SizedBox(height: 6),
            if (eWallets.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                child: Text(
                  'No e-wallet is available right now.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            for (final option in eWallets)
              _PaymentOptionRow(
                option: option,
                isSelected: option.id == selectedId,
                onTap: () => Navigator.of(context).pop(option.id),
              ),
            const SizedBox(height: 12),
            const _CategoryHeader(
              icon: Icons.account_balance_outlined,
              title: 'Bank Transfer',
            ),
            const SizedBox(height: 6),
            _CategoryLinkTile(
              icon: Icons.account_balance_outlined,
              title: selectedBank?.branchLabel ?? 'Online Bank Transfer',
              subtitle: banks.isEmpty
                  ? 'Not available right now'
                  : selectedBank != null
                  ? 'Tap to choose a different bank'
                  : banks.map((b) => b.branchLabel).join(', '),
              logoOption: selectedBank,
              isSelected: selectedBank != null,
              onTap: banks.isEmpty
                  ? null
                  : () => Navigator.of(context).pop(_openBanksToken),
            ),
            const SizedBox(height: 12),
            const _CategoryHeader(
              icon: Icons.credit_card_rounded,
              title: 'Credit / Debit Card',
            ),
            const SizedBox(height: 6),
            _CategoryLinkTile(
              icon: Icons.credit_card_rounded,
              title: selectedCard?.branchLabel ?? 'Credit / Debit Card',
              subtitle: cards.isEmpty
                  ? 'Not available right now'
                  : selectedCard != null
                  ? 'Tap to choose a different card'
                  : cards.map((c) => c.branchLabel).join(' or '),
              logoOption: selectedCard,
              isSelected: selectedCard != null,
              onTap: cards.isEmpty
                  ? null
                  : () => Navigator.of(context).pop(_openCardsToken),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentBrandSheet extends StatelessWidget {
  const _PaymentBrandSheet({
    required this.category,
    required this.options,
    required this.selectedId,
  });

  final PaymentMethodCategory category;
  final List<PaymentPartner> options;
  final String selectedId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondaryColor = _secondaryTextColor(theme);
    final isBank = category == PaymentMethodCategory.bank;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SheetHandle(),
        const SizedBox(height: 8),
        Row(
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(_backToken),
              icon: const Icon(Icons.arrow_back_rounded),
              tooltip: 'Back',
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isBank ? 'Select Bank' : 'Select Card Type',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isBank
                        ? 'You will log in to your bank to approve the transfer.'
                        : 'Enter your card details on the secure PayMongo page.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: secondaryColor,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.55,
          ),
          child: ListView(
            shrinkWrap: true,
            children: [
              for (final option in options)
                _PaymentOptionRow(
                  option: option,
                  isSelected: option.id == selectedId,
                  onTap: () => Navigator.of(context).pop(option.id),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoryHeader extends StatelessWidget {
  const _CategoryHeader({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}

class _PaymentOptionRow extends StatelessWidget {
  const _PaymentOptionRow({
    required this.option,
    required this.isSelected,
    required this.onTap,
  });

  final PaymentPartner option;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor = _secondaryTextColor(theme);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              PaymentOptionLogo(option: option, size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  option.branchLabel,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(
                isSelected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: isSelected ? primaryColor : secondaryColor,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryLinkTile extends StatelessWidget {
  const _CategoryLinkTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
    this.logoOption,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback? onTap;
  final PaymentPartner? logoOption;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor = _secondaryTextColor(theme);
    final isDisabled = onTap == null;
    final logo = logoOption;

    return Opacity(
      opacity: isDisabled ? 0.5 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isSelected
                    ? primaryColor
                    : theme.dividerColor.withOpacity(0.6),
              ),
              color: isSelected ? primaryColor.withOpacity(0.06) : null,
            ),
            child: Row(
              children: [
                if (logo != null)
                  PaymentOptionLogo(option: logo, size: 44)
                else
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: (isDisabled ? secondaryColor : primaryColor)
                          .withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      icon,
                      color: isDisabled ? secondaryColor : primaryColor,
                      size: 22,
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: secondaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  isDisabled
                      ? Icons.block_rounded
                      : isSelected
                      ? Icons.check_circle_rounded
                      : Icons.chevron_right_rounded,
                  color: isSelected ? primaryColor : secondaryColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The logo Super Admin uploaded for the partner, falling back to a
/// brand-colored badge (Mastercard gets its overlapping circles).
class PaymentOptionLogo extends StatelessWidget {
  const PaymentOptionLogo({super.key, required this.option, this.size = 60});

  final PaymentPartner option;
  final double size;

  @override
  Widget build(BuildContext context) {
    final imageUrl = option.imageUrl.trim();
    final style = _methodStyles[option.paymongoMethod];
    final isVisa = _isVisa(option);
    final isMastercard = _isMastercard(option);

    Widget badge() {
      if (isMastercard) {
        final circle = size * 0.38;
        return ColoredBox(
          color: const Color(0xFF231F20),
          child: Center(
            child: SizedBox(
              width: circle * 1.6,
              height: circle,
              child: Stack(
                children: [
                  Positioned(
                    left: 0,
                    child: _Dot(size: circle, color: const Color(0xFFEB001B)),
                  ),
                  Positioned(
                    right: 0,
                    child: _Dot(
                      size: circle,
                      color: const Color(0xFFF79E1B).withOpacity(0.9),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }
      final color = isVisa
          ? const Color(0xFF1A1F71)
          : style?.color ?? Theme.of(context).colorScheme.primary;
      final label = option.branchLabel;
      final text = isVisa
          ? 'VISA'
          : style?.badge ?? (label.isEmpty ? '?' : label.characters.first);
      return ColoredBox(
        color: color,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                text,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontStyle: isVisa ? FontStyle.italic : FontStyle.normal,
                  fontSize: size * 0.3,
                  letterSpacing: 0.4,
                ),
              ),
            ),
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.2),
      child: SizedBox(
        width: size,
        height: size,
        child: imageUrl.isEmpty
            ? badge()
            : ColoredBox(
                color: Colors.white,
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => badge(),
                ),
              ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
