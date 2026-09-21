import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/add_to_cart.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/error_validation.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/feedback_page.dart';
import 'package:switch_app/l10n/app_login_languages.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/services/app_language_preference.dart';
import 'package:switch_app/services/account_devices_service.dart';
import 'package:switch_app/services/buyer_delivery_address_store.dart';
import 'package:switch_app/services/chat_support_sync.dart';
import 'package:switch_app/services/flash_deals_service.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/philippines_places_service.dart';
import 'package:switch_app/services/unified_account_service.dart';
import 'package:switch_app/services/vouchers_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/theme/app_theme.dart';
import 'package:switch_app/utils/app_keyboard.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/own_listing.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/widgets/buyer_right_panel_host.dart';
import 'package:switch_app/widgets/buyer_platform_activity_list.dart';
import 'package:switch_app/widgets/google_maps_embed_preview.dart';
import 'package:switch_app/widgets/password_visibility_icon.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

final _profilePhotoUploadService = createChatSupportSyncService();
final _profileAccountService = createUnifiedAccountService();
final _accountDevicesService = createAccountDevicesService();

const String _inviteStatsPrefsPrefix = 'gms-buyer-invite-stats:';

String buildBuyerInviteCode(String accountId) {
  final raw = accountId.trim();
  if (raw.isEmpty || raw == '—') return '';
  var hash = 2166136261;
  for (final unit in raw.codeUnits) {
    hash = (hash ^ unit) & 0xFFFFFFFF;
    hash = (hash * 16777619) & 0xFFFFFFFF;
  }
  final digest = hash.toRadixString(36).toUpperCase().padLeft(7, '0');
  final clipped = digest.length > 7
      ? digest.substring(digest.length - 7)
      : digest;
  return 'SW$clipped';
}

String buildBuyerInviteLink(String code) {
  final inviteCode = code.trim().toUpperCase();
  if (inviteCode.isEmpty) return '';
  final base = Uri.base;
  final origin =
      (base.hasScheme &&
          (base.scheme == 'http' || base.scheme == 'https') &&
          base.host.isNotEmpty)
      ? base.origin
      : 'http://localhost:8080';
  return '$origin/login.html?ref=${Uri.encodeComponent(inviteCode)}';
}

String buyerInviteQrImageUrl(String link) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=12&data=${Uri.encodeComponent(link)}';
}

const String _lucideUserRoundIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>''';

const String _lucideLockKeyholeIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>''';

const String _lucideSettingsIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>''';

const String _lucideLogOutIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>''';

const String _lucideGlobeIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>''';

const String _lucideHandshakeIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>''';

const String _lucideBuildingIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg>''';

const List<Color> _companyLogoToneForegrounds = <Color>[
  Color(0xFF0F766E),
  Color(0xFF1D4ED8),
  Color(0xFFB45309),
  Color(0xFFBE123C),
  Color(0xFF6D28D9),
  Color(0xFF047857),
];

const List<Color> _companyLogoToneBackgrounds = <Color>[
  Color(0xFFECFEFF),
  Color(0xFFEFF6FF),
  Color(0xFFFFFBEB),
  Color(0xFFFFF1F2),
  Color(0xFFF5F3FF),
  Color(0xFFECFDF5),
];

class _SellerCompanyOption {
  const _SellerCompanyOption({
    required this.companyId,
    required this.name,
    required this.detail,
    required this.logoUrl,
    required this.isActive,
  });

  final String companyId;
  final String name;
  final String detail;
  final String logoUrl;
  final bool isActive;
}

const String _lucideUserPlusIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>''';

const String _lucideTicketIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>''';

const String _lucideHeartIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>''';

const String _lucideHistoryIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>''';

const String _lucideCreditCardIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>''';

const String _lucideMapPinIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>''';

const String _lucideLinkIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>''';

const String _lucideTrashIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>''';

const String _lucideKeyRoundIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>''';

const String _lucideShieldCheckIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>''';

const String _lucideSmartphoneIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>''';

const String _lucideMonitorIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>''';

const String _lucideTabletIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>''';

const String _lucideChromeIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M21.17 8H12"/><path d="M3.95 6.06 8.54 14"/><path d="M10.88 21.94 15.46 14"/></svg>''';

const String _lucideMessageSquareIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/></svg>''';

enum BuyerAccountPanelView {
  menu,
  profileHub,
  profile,
  invite,
  vouchers,
  favorites,
  activity,
  feedback,
  address,
  security,
  password,
  twoFactor,
  loginActivity,
  devices,
  payment,
  accountLinks,
  preferences,
  account,
  seller,
  companies,
}

enum _BuyerVoucherStatus { active, used, expired }

class _BuyerVoucher {
  const _BuyerVoucher({
    required this.status,
    required this.title,
    required this.subtitle,
    required this.minimumSpend,
    required this.code,
    required this.badge,
    required this.dateLabel,
    required this.actionLabel,
    required this.note,
    required this.icon,
    this.platformId = 'all',
    this.platformLabel = 'All platforms',
  });

  final _BuyerVoucherStatus status;
  final String title;
  final String subtitle;
  final String minimumSpend;
  final String code;
  final String badge;
  final String dateLabel;
  final String actionLabel;
  final String note;
  final IconData icon;
  final String platformId;
  final String platformLabel;
}

const List<_BuyerVoucher> _buyerVouchers = <_BuyerVoucher>[
  _BuyerVoucher(
    status: _BuyerVoucherStatus.active,
    title: '20% OFF',
    subtitle: 'on Fashion & Accessories',
    minimumSpend: '\u20B1500',
    code: 'FASHION20',
    badge: 'Online Only',
    dateLabel: 'Expires Dec 31, 2026',
    actionLabel: 'Use Now',
    note: 'Look good.\nSpend less!',
    icon: Icons.percent_rounded,
  ),
  _BuyerVoucher(
    status: _BuyerVoucherStatus.active,
    title: '\u20B1100 OFF',
    subtitle: 'on any purchase',
    minimumSpend: '\u20B1300',
    code: 'WELCOME100',
    badge: 'New Users Only',
    dateLabel: 'Expires Nov 30, 2026',
    actionLabel: 'Apply',
    note: 'A little happiness\nfor you!',
    icon: Icons.redeem_rounded,
  ),
  _BuyerVoucher(
    status: _BuyerVoucherStatus.active,
    title: 'Free Shipping',
    subtitle: 'on all items',
    minimumSpend: '\u20B1249',
    code: 'FREESHIP',
    badge: 'Sitewide',
    dateLabel: 'Expires Dec 15, 2026',
    actionLabel: 'Use Now',
    note: 'Shop more.\nWorry less!',
    icon: Icons.local_shipping_rounded,
  ),
  _BuyerVoucher(
    status: _BuyerVoucherStatus.active,
    title: 'Buy 1 Get 1',
    subtitle: 'on selected items',
    minimumSpend: '\u20B1299',
    code: 'B1G1SPECIAL',
    badge: 'Limited Time',
    dateLabel: 'Expires Nov 25, 2026',
    actionLabel: 'Use Now',
    note: 'More to love\nfor less!',
    icon: Icons.shopping_bag_rounded,
  ),
  _BuyerVoucher(
    status: _BuyerVoucherStatus.used,
    title: '10% OFF',
    subtitle: 'on your last order',
    minimumSpend: '\u20B1200',
    code: 'THANKYOU10',
    badge: 'Order Reward',
    dateLabel: 'Used Sep 02, 2026',
    actionLabel: 'Used',
    note: 'Thanks for\nshopping!',
    icon: Icons.loyalty_rounded,
  ),
  _BuyerVoucher(
    status: _BuyerVoucherStatus.expired,
    title: '\u20B150 OFF',
    subtitle: 'on any purchase',
    minimumSpend: '\u20B1250',
    code: 'SAVE50',
    badge: 'Storewide',
    dateLabel: 'Expired Aug 31, 2026',
    actionLabel: 'Expired',
    note: 'A deal for\nevery cart!',
    icon: Icons.confirmation_number_rounded,
  ),
];

/// Right sidebar account settings — matches web `.md-account-panel`.
class BuyerAccountPanel extends StatefulWidget {
  const BuyerAccountPanel({
    super.key,
    required this.primaryColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.displayName,
    required this.email,
    required this.phone,
    required this.accountId,
    required this.initials,
    required this.imageUrl,
    required this.productsFuture,
    required this.onSignOut,
    this.initialView = BuyerAccountPanelView.menu,
    this.initialEditAddressId,
    this.themeModeNotifier,
    this.onProfileImageChanged,
    this.onOpenFullAccount,
    this.onStartSellerUpgrade,
    this.onExploreShop,
    this.onOpenProduct,
    this.onOpenSelectAddress,
    this.platformId = '',
    this.platformLabel = '',
    this.onOpenActivityItem,
  });

  final Color primaryColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final String displayName;
  final String email;
  final String phone;
  final String accountId;
  final String initials;
  final String imageUrl;
  final Future<List<Product>> productsFuture;
  final Future<void> Function() onSignOut;
  final BuyerAccountPanelView initialView;
  final String? initialEditAddressId;
  final ValueNotifier<ThemeMode>? themeModeNotifier;
  final ValueChanged<String>? onProfileImageChanged;
  final VoidCallback? onOpenFullAccount;
  final VoidCallback? onStartSellerUpgrade;
  final VoidCallback? onExploreShop;
  final ValueChanged<Product>? onOpenProduct;
  final VoidCallback? onOpenSelectAddress;
  final String platformId;
  final String platformLabel;
  final ValueChanged<BuyerPlatformActivityItem>? onOpenActivityItem;

  static Future<void> show(
    BuildContext context, {
    required Color primaryColor,
    required Color surfaceColor,
    required Color titleColor,
    required Color secondaryColor,
    required String displayName,
    required String email,
    required String phone,
    required String accountId,
    required String initials,
    required String imageUrl,
    required Future<List<Product>> productsFuture,
    required Future<void> Function() onSignOut,
    BuyerAccountPanelView initialView = BuyerAccountPanelView.menu,
    String? initialEditAddressId,
    ValueNotifier<ThemeMode>? themeModeNotifier,
    ValueChanged<String>? onProfileImageChanged,
    VoidCallback? onOpenFullAccount,
    VoidCallback? onStartSellerUpgrade,
    VoidCallback? onExploreShop,
    ValueChanged<Product>? onOpenProduct,
    VoidCallback? onOpenSelectAddress,
    String platformId = '',
    String platformLabel = '',
    ValueChanged<BuyerPlatformActivityItem>? onOpenActivityItem,
  }) {
    return BuyerRightPanelHost.show(
      context: context,
      barrierLabel: 'Close account settings',
      panel: BuyerAccountPanel(
        primaryColor: primaryColor,
        surfaceColor: surfaceColor,
        titleColor: titleColor,
        secondaryColor: secondaryColor,
        displayName: displayName,
        email: email,
        phone: phone,
        accountId: accountId,
        initials: initials,
        imageUrl: imageUrl,
        productsFuture: productsFuture,
        onSignOut: onSignOut,
        initialView: initialView,
        initialEditAddressId: initialEditAddressId,
        themeModeNotifier: themeModeNotifier,
        onProfileImageChanged: onProfileImageChanged,
        onOpenFullAccount: onOpenFullAccount,
        onStartSellerUpgrade: onStartSellerUpgrade,
        onExploreShop: onExploreShop,
        onOpenProduct: onOpenProduct,
        onOpenSelectAddress: onOpenSelectAddress,
        platformId: platformId,
        platformLabel: platformLabel,
        onOpenActivityItem: onOpenActivityItem,
      ),
    );
  }

  @override
  State<BuyerAccountPanel> createState() => _BuyerAccountPanelState();
}

class _BuyerAccountPanelState extends State<BuyerAccountPanel>
    with SingleTickerProviderStateMixin {
  BuyerAccountPanelView _view = BuyerAccountPanelView.menu;
  BuyerAccountPanelView _outgoingView = BuyerAccountPanelView.menu;
  final List<BuyerAccountPanelView> _viewHistory = <BuyerAccountPanelView>[];
  bool _navForward = true;
  bool _signingOut = false;
  bool _changingProfilePhoto = false;
  bool _sendingInvite = false;
  bool _voucherSearchOpen = false;
  bool _voucherNewestFirst = true;
  bool _vouchersLoading = false;
  bool _changePasswordFormOpen = false;
  bool _changePasswordSubmitting = false;
  bool _changePasswordAutovalidate = false;
  bool _devicesLoading = false;
  bool _devicesBusy = false;
  String _devicesError = '';
  List<AccountDevice> _devices = const <AccountDevice>[];
  final Set<String> _expandedDeviceIds = <String>{};
  bool _accountConnectionsLoading = false;
  String _accountConnectionsError = '';
  bool _googleConnected = false;
  String _googleConnectionEmail = '';
  bool _facebookConnected = false;
  String _facebookConnectionEmail = '';
  bool _obscureCurrentPassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  String _languageLabel = 'English';
  String _profileImageUrl = '';
  String _profilePhotoFeedback = '';
  String? _expandedProfileField;
  int _inviteReferred = 0;
  int _inviteEarned = 0;
  _BuyerVoucherStatus _voucherStatus = _BuyerVoucherStatus.active;
  List<_BuyerVoucher> _vouchers = List<_BuyerVoucher>.from(_buyerVouchers);
  final ImagePicker _imagePicker = ImagePicker();
  final GlobalKey _inviteShareButtonKey = GlobalKey();
  final TextEditingController _voucherSearchController =
      TextEditingController();
  final FocusNode _voucherSearchFocusNode = FocusNode();
  final TextEditingController _addressSearchController =
      TextEditingController();
  final TextEditingController _addressUnitController = TextEditingController();
  final TextEditingController _addressStreetController =
      TextEditingController();
  final TextEditingController _addressCityController = TextEditingController();
  final TextEditingController _addressProvinceController =
      TextEditingController();
  final TextEditingController _addressPostalController =
      TextEditingController();
  final FocusNode _addressSearchFocusNode = FocusNode();
  final GlobalKey<FormState> _changePasswordFormKey = GlobalKey<FormState>();
  final TextEditingController _currentPasswordController =
      TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  late final AnimationController _navController;
  bool _hasSellerAdminAccess = false;
  bool _addressSaving = false;
  bool _addressSearching = false;
  bool _addressLocating = false;
  bool _addressEditorOpen = false;
  String? _editingAddressId;
  String? _selectedAddressId;
  bool _useCurrentLocationSelected = false;
  List<_SavedBuyerAddress> _savedAddresses = const <_SavedBuyerAddress>[];
  String _addressLabel = kBuyerSavedLocationLabel;
  String _addressMapQuery = 'Philippines';
  double? _addressLat;
  double? _addressLng;
  List<PhilippinesPlace> _addressSuggestions = const <PhilippinesPlace>[];
  Timer? _addressSearchDebounce;
  int _addressSearchRequestId = 0;
  bool _companiesLoading = false;
  bool _companySelectBusy = false;
  String? _favoriteCartBusyProductId;
  String? _activeCompanyId;
  List<_SellerCompanyOption> _sellerCompanies = const <_SellerCompanyOption>[];

  String get _inviteCode => buildBuyerInviteCode(widget.accountId);
  String get _inviteLink => buildBuyerInviteLink(_inviteCode);

  @override
  void initState() {
    super.initState();
    final openAddressExternally =
        widget.initialView == BuyerAccountPanelView.address &&
        widget.onOpenSelectAddress != null;
    _view = openAddressExternally
        ? BuyerAccountPanelView.menu
        : widget.initialView;
    _outgoingView = _view;
    if (_view != BuyerAccountPanelView.menu) {
      _viewHistory.add(BuyerAccountPanelView.menu);
    }
    _navController = AnimationController(
      vsync: this,
      duration: appMotionFrames(14),
    )..value = 1;
    _profileImageUrl = widget.imageUrl.trim();
    _addressSearchController.addListener(_onAddressSearchChanged);
    unawaited(_loadLanguageLabel());
    unawaited(_loadInviteStats());
    unawaited(_loadBuyerVouchers());
    unawaited(_loadSavedAddress());
    unawaited(_loadSellerCompaniesAccess());
    unawaited(FavoriteProductsStore.instance.ensureLoaded());
    if (openAddressExternally) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _openSelectAddressAndClose();
      });
    }
  }

  void _openSelectAddressAndClose() {
    final open = widget.onOpenSelectAddress;
    final navigator = Navigator.of(context);
    final route = ModalRoute.of(context);
    if (route != null) {
      navigator.removeRoute(route);
    } else {
      navigator.maybePop();
    }
    if (open != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => open());
    }
  }

  @override
  void dispose() {
    _addressSearchDebounce?.cancel();
    _navController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _voucherSearchController.dispose();
    _voucherSearchFocusNode.dispose();
    _addressSearchController.removeListener(_onAddressSearchChanged);
    _addressSearchController.dispose();
    _addressSearchFocusNode.dispose();
    _addressUnitController.dispose();
    _addressStreetController.dispose();
    _addressCityController.dispose();
    _addressProvinceController.dispose();
    _addressPostalController.dispose();
    super.dispose();
  }

  void _resetChangePasswordForm() {
    _changePasswordFormOpen = false;
    _changePasswordSubmitting = false;
    _changePasswordAutovalidate = false;
    _obscureCurrentPassword = true;
    _obscureNewPassword = true;
    _obscureConfirmPassword = true;
    _currentPasswordController.clear();
    _newPasswordController.clear();
    _confirmPasswordController.clear();
  }

  Future<void> _loadLanguageLabel() async {
    await AppLanguagePreference.ensureLoaded();
    if (!mounted) return;
    setState(() {
      _languageLabel = AppLoginLanguages.labelFor(AppLanguagePreference.code);
    });
  }

  Future<void> _loadInviteStats() async {
    final accountId = widget.accountId.trim();
    if (accountId.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final referred =
        prefs.getInt('$_inviteStatsPrefsPrefix$accountId:referred') ?? 0;
    final earned =
        prefs.getInt('$_inviteStatsPrefsPrefix$accountId:earned') ?? 0;
    if (!mounted) return;
    setState(() {
      _inviteReferred = referred < 0 ? 0 : referred;
      _inviteEarned = earned < 0 ? 0 : earned;
    });
  }

  Future<void> _sendInviteLink() async {
    final link = _inviteLink;
    final code = _inviteCode;
    if (link.isEmpty || _sendingInvite) return;
    setState(() => _sendingInvite = true);
    try {
      final name = widget.displayName.trim().isEmpty
          ? 'your friend'
          : widget.displayName.trim();
      final shareText = [
        'Join me on Switch!',
        '',
        'Hi! $name invited you to Switch. Sign up with this link and we both get rewards:',
        link,
        if (code.isNotEmpty) '',
        if (code.isNotEmpty) 'Invite code: $code',
      ].join('\n');

      Rect? origin;
      final box =
          _inviteShareButtonKey.currentContext?.findRenderObject()
              as RenderBox?;
      if (box != null && box.hasSize) {
        origin = box.localToGlobal(Offset.zero) & box.size;
      }

      // Opens the system share sheet (Messenger, SMS, etc. installed on device).
      await SharePlus.instance.share(
        ShareParams(
          text: shareText,
          subject: 'Join me on Switch',
          sharePositionOrigin: origin,
        ),
      );
    } catch (error, stack) {
      debugPrint('Invite share failed: $error\n$stack');
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: 'Unable to open share. Fully restart the app and try again.',
      );
    } finally {
      if (mounted) setState(() => _sendingInvite = false);
    }
  }

  Future<void> _copyInviteCode() async {
    final code = _inviteCode;
    if (code.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    AppSnackBar.showSuccess(context, message: 'Invite code copied.');
  }

  String get _title {
    switch (_view) {
      case BuyerAccountPanelView.menu:
        return 'Account settings';
      case BuyerAccountPanelView.profileHub:
        return 'Account profile';
      case BuyerAccountPanelView.profile:
        return 'Personal information';
      case BuyerAccountPanelView.invite:
        return 'Invite Friends';
      case BuyerAccountPanelView.vouchers:
        return 'Vouchers';
      case BuyerAccountPanelView.favorites:
        return 'Favorites';
      case BuyerAccountPanelView.activity:
        return 'Recent activity';
      case BuyerAccountPanelView.feedback:
        return 'Feedback';
      case BuyerAccountPanelView.address:
        if (_addressEditorOpen) {
          return _editingAddressId == null ? 'Add Address' : 'Edit Address';
        }
        return 'Address';
      case BuyerAccountPanelView.security:
        return 'Login & security';
      case BuyerAccountPanelView.password:
        return _changePasswordFormOpen ? 'Change password' : 'Password';
      case BuyerAccountPanelView.twoFactor:
        return 'Two-factor authenticator';
      case BuyerAccountPanelView.loginActivity:
        return 'Login activity';
      case BuyerAccountPanelView.devices:
        return 'Devices';
      case BuyerAccountPanelView.payment:
        return 'Payment method';
      case BuyerAccountPanelView.accountLinks:
        return 'Account Connections';
      case BuyerAccountPanelView.preferences:
        return 'Language';
      case BuyerAccountPanelView.account:
        return 'Delete account';
      case BuyerAccountPanelView.seller:
        return 'Be Part of Switch';
      case BuyerAccountPanelView.companies:
        return 'Companies';
    }
  }

  void _openView(BuyerAccountPanelView view) {
    if (view == BuyerAccountPanelView.address &&
        widget.onOpenSelectAddress != null) {
      _openSelectAddressAndClose();
      return;
    }
    final targetView = view == BuyerAccountPanelView.loginActivity
        ? BuyerAccountPanelView.devices
        : view;
    if (targetView == _view || _navController.isAnimating) return;
    setState(() {
      if (_view == BuyerAccountPanelView.password) {
        _resetChangePasswordForm();
      }
      _navForward = true;
      _outgoingView = _view;
      _viewHistory.add(_view);
      _view = targetView;
    });
    _navController.forward(from: 0);
    if (targetView == BuyerAccountPanelView.vouchers) {
      unawaited(_loadBuyerVouchers());
    }
    if (targetView == BuyerAccountPanelView.devices) {
      unawaited(_loadAccountDevices());
    }
    if (targetView == BuyerAccountPanelView.accountLinks) {
      unawaited(_loadAccountConnections());
    }
    if (targetView == BuyerAccountPanelView.companies) {
      unawaited(_refreshSellerCompanies());
    }
  }

  void _backToPreviousView() {
    if (_navController.isAnimating) {
      return;
    }
    if (_view == BuyerAccountPanelView.menu) {
      Navigator.of(context).maybePop();
      return;
    }
    if (_view == BuyerAccountPanelView.password && _changePasswordFormOpen) {
      setState(_resetChangePasswordForm);
      return;
    }
    if (_view == BuyerAccountPanelView.address && _addressEditorOpen) {
      setState(() {
        _addressEditorOpen = false;
        _editingAddressId = null;
        _clearAddressFormFields();
      });
      return;
    }
    setState(() {
      if (_view == BuyerAccountPanelView.password) {
        _resetChangePasswordForm();
      }
      _navForward = false;
      _outgoingView = _view;
      _view = _viewHistory.isNotEmpty
          ? _viewHistory.removeLast()
          : BuyerAccountPanelView.menu;
    });
    _navController.forward(from: 0);
  }

  Widget _buildView(BuyerAccountPanelView view) {
    switch (view) {
      case BuyerAccountPanelView.menu:
        return _buildMenuView();
      case BuyerAccountPanelView.profileHub:
        return _buildProfileHubView();
      case BuyerAccountPanelView.profile:
        return _buildProfileView();
      case BuyerAccountPanelView.invite:
        return _buildInviteView();
      case BuyerAccountPanelView.vouchers:
        return _buildVouchersView();
      case BuyerAccountPanelView.favorites:
        return _buildFavoritesView();
      case BuyerAccountPanelView.activity:
        final platformId = widget.platformId.trim().toLowerCase();
        final platformLabel = widget.platformLabel.trim().isNotEmpty
            ? widget.platformLabel.trim()
            : 'this platform';
        if (platformId.isEmpty || platformId == 'none') {
          return _buildPlaceholderView(
            'Open a platform like Shop to see recent orders, process updates, and history here.',
          );
        }
        return BuyerPlatformActivityList(
          platformLabel: platformLabel,
          primaryColor: widget.primaryColor,
          titleColor: widget.titleColor,
          secondaryColor: widget.secondaryColor,
          surfaceColor: widget.surfaceColor,
          onOpenItem: (item) {
            Navigator.of(context).maybePop();
            widget.onOpenActivityItem?.call(item);
          },
        );
      case BuyerAccountPanelView.feedback:
        return FeedbackPage(
          embedded: true,
          themeModeNotifier: widget.themeModeNotifier,
        );
      case BuyerAccountPanelView.address:
        return _buildAddressView();
      case BuyerAccountPanelView.security:
        return _buildSecurityView();
      case BuyerAccountPanelView.password:
        return _buildPasswordView();
      case BuyerAccountPanelView.twoFactor:
        return _buildPlaceholderView(
          'Set up an authenticator app for two-factor verification. Controls will appear here.',
        );
      case BuyerAccountPanelView.loginActivity:
        return _buildDevicesView();
      case BuyerAccountPanelView.devices:
        return _buildDevicesView();
      case BuyerAccountPanelView.payment:
        return _buildPlaceholderView(
          'Add and manage your payment methods here.',
        );
      case BuyerAccountPanelView.accountLinks:
        return _buildAccountLinksView();
      case BuyerAccountPanelView.preferences:
        return _buildPreferencesView();
      case BuyerAccountPanelView.account:
        return _buildAccountView();
      case BuyerAccountPanelView.seller:
        return _buildSellerView();
      case BuyerAccountPanelView.companies:
        return _buildCompaniesView();
    }
  }

  Future<void> _loadSellerCompaniesAccess() async {
    final modes = await AuthSession.getAvailableModes();
    final activeCompanyId = await AuthSession.getActiveCompanyId();
    if (!mounted) return;
    setState(() {
      _hasSellerAdminAccess = modes.contains('seller_admin');
      _activeCompanyId = activeCompanyId;
    });
    if (_hasSellerAdminAccess) {
      await _refreshSellerCompanies();
    }
  }

  String _companyLogoUrl(Map company) {
    if (company['businessLogoSkipped'] == true) return '';
    final profileData = company['profileData'];
    final profileMap = profileData is Map
        ? Map<String, dynamic>.from(profileData)
        : const <String, dynamic>{};
    if (profileMap['businessLogoSkipped'] == true) return '';
    for (final key in const [
      'logoUrl',
      'companyPictureUrl',
      'businessLogoUrl',
    ]) {
      final fromCompany = company[key]?.toString().trim() ?? '';
      if (fromCompany.isNotEmpty) return fromCompany;
      final fromProfile = profileMap[key]?.toString().trim() ?? '';
      if (fromProfile.isNotEmpty) return fromProfile;
    }
    return '';
  }

  List<_SellerCompanyOption> _parseSellerCompanies(
    Map<String, dynamic> session,
  ) {
    final companiesRaw = session['companies'];
    if (companiesRaw is! List) return const <_SellerCompanyOption>[];
    final activeCompanyId =
        session['activeCompanyId']?.toString().trim() ?? _activeCompanyId ?? '';
    final options = <_SellerCompanyOption>[];
    for (final item in companiesRaw) {
      if (item is! Map) continue;
      final membership = Map<String, dynamic>.from(item);
      final companyRaw = membership['company'];
      final company = companyRaw is Map
          ? Map<String, dynamic>.from(companyRaw)
          : const <String, dynamic>{};
      final type = company['type']?.toString().trim().toLowerCase() ?? '';
      final role =
          membership['membershipRole']?.toString().trim().toLowerCase() ?? '';
      if (type.isNotEmpty && type != 'seller') continue;
      if (role.isNotEmpty && role != 'owner' && role != 'seller_admin') {
        continue;
      }
      final companyId =
          (membership['companyId'] ?? company['id'])?.toString().trim() ?? '';
      if (companyId.isEmpty) continue;
      final name =
          [
                company['publicName'],
                company['name'],
                company['legalName'],
                company['maskedPublicName'],
                membership['title'],
                'Company',
              ]
              .map((value) => value?.toString().trim() ?? '')
              .firstWhere((value) => value.isNotEmpty, orElse: () => 'Company');
      final detail = [
        role.replaceAll('_', ' '),
        company['businessType']?.toString().trim() ?? '',
        company['status']?.toString().trim() ??
            company['subscriptionStatus']?.toString().trim() ??
            '',
      ].where((value) => value.isNotEmpty).join(' · ');
      options.add(
        _SellerCompanyOption(
          companyId: companyId,
          name: name,
          detail: detail.isEmpty ? 'Seller admin' : detail,
          logoUrl: _companyLogoUrl(company),
          isActive: activeCompanyId.isNotEmpty && activeCompanyId == companyId,
        ),
      );
    }
    return options;
  }

  Future<void> _refreshSellerCompanies() async {
    final accountId = widget.accountId.trim();
    final email = widget.email.trim();
    if (accountId.isEmpty && email.isEmpty) return;
    if (!mounted) return;
    setState(() => _companiesLoading = true);
    try {
      final result = await _profileAccountService.fetchSession(
        accountId: accountId == '—' ? null : accountId,
        email: email.isEmpty ? null : email,
      );
      await AuthSession.setUnifiedSession(result.session);
      await AppLanguagePreference.syncFromUnifiedSession(result.session);
      final options = _parseSellerCompanies(result.session);
      final modes = await AuthSession.getAvailableModes();
      final activeCompanyId = await AuthSession.getActiveCompanyId();
      if (!mounted) return;
      setState(() {
        _hasSellerAdminAccess = modes.contains('seller_admin');
        _activeCompanyId = activeCompanyId;
        _sellerCompanies = options;
        _companiesLoading = false;
        _languageLabel = AppLoginLanguages.labelFor(AppLanguagePreference.code);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _companiesLoading = false);
    }
  }

  Future<void> _openSellerCompany(_SellerCompanyOption company) async {
    if (_companySelectBusy) return;
    final accountId = widget.accountId.trim();
    if (accountId.isEmpty || accountId == '—') return;
    setState(() => _companySelectBusy = true);
    try {
      final unlockToken = await _promptSellerSwitchPin(company);
      if (!mounted || unlockToken == null || unlockToken.isEmpty) return;

      final result = await _profileAccountService.switchRole(
        accountId: accountId,
        activeMode: 'seller_admin',
        companyId: company.companyId,
      );
      await AuthSession.setUnifiedSession(result.session);
      if (!mounted) return;
      setState(() {
        _activeCompanyId = company.companyId;
        _sellerCompanies = _parseSellerCompanies(result.session);
      });
      final bases = buildLocalApiBaseUrls(
        isAndroid: defaultTargetPlatform == TargetPlatform.android,
      );
      final base = bases.isNotEmpty ? bases.first : '';
      if (base.isNotEmpty) {
        final uri = Uri.parse('$base/main.html').replace(
          queryParameters: {'switchPinTicket': unlockToken},
          fragment: 'dashboard',
        );
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
      if (!mounted) return;
      AppSnackBar.showSuccess(
        context,
        message: 'Opened ${company.name} seller admin.',
      );
      await Navigator.of(context).maybePop();
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _companySelectBusy = false);
      }
    }
  }

  Future<String?> _promptSellerSwitchPin(_SellerCompanyOption company) async {
    final accountId = widget.accountId.trim();
    final email = widget.email.trim();
    final status = await _profileAccountService.fetchSellerSwitchPinStatus(
      accountId: accountId,
      companyId: company.companyId,
      email: email == '—' ? '' : email,
    );
    if (!mounted) return null;

    final pinController = TextEditingController();
    final confirmController = TextEditingController();
    var creating = !status.hasPin;
    var obscure = true;
    String? errorText;
    var busy = false;

    try {
      return await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return StatefulBuilder(
            builder: (context, setDialogState) {
              Future<void> submit() async {
                final pin = pinController.text.replaceAll(RegExp(r'\D'), '');
                final confirm = confirmController.text.replaceAll(
                  RegExp(r'\D'),
                  '',
                );
                if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
                  setDialogState(
                    () => errorText = 'Switch PIN must be exactly 6 digits.',
                  );
                  return;
                }
                if (creating && pin != confirm) {
                  setDialogState(
                    () => errorText = 'Switch PIN confirmation does not match.',
                  );
                  return;
                }
                setDialogState(() {
                  busy = true;
                  errorText = null;
                });
                try {
                  final result = creating
                      ? await _profileAccountService.setSellerSwitchPin(
                          accountId: accountId,
                          companyId: company.companyId,
                          email: email == '—' ? '' : email,
                          pin: pin,
                          confirmPin: confirm,
                        )
                      : await _profileAccountService.verifySellerSwitchPin(
                          accountId: accountId,
                          companyId: company.companyId,
                          email: email == '—' ? '' : email,
                          pin: pin,
                        );
                  if (!dialogContext.mounted) return;
                  Navigator.of(dialogContext).pop(result.unlockToken);
                } catch (error) {
                  if (!dialogContext.mounted) return;
                  setDialogState(() {
                    busy = false;
                    errorText = error.toString();
                  });
                }
              }

              return AlertDialog(
                title: const Text('Switch PIN'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      creating
                          ? 'Create a Switch PIN for ${company.name}. This is not your login password. Subscribers must enter this PIN before seller admin opens.'
                          : 'Enter the Switch PIN for ${company.name} before opening seller admin. This is not your login password.',
                      style: TextStyle(
                        color: widget.secondaryColor,
                        fontSize: 13,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: pinController,
                      enabled: !busy,
                      obscureText: obscure,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: InputDecoration(
                        labelText: creating
                            ? 'Create Switch PIN'
                            : 'Switch PIN',
                        counterText: '',
                        suffixIcon: IconButton(
                          onPressed: () =>
                              setDialogState(() => obscure = !obscure),
                          icon: Icon(
                            obscure
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                      ),
                      onChanged: (_) {
                        if (errorText != null)
                          setDialogState(() => errorText = null);
                      },
                    ),
                    if (creating) ...[
                      const SizedBox(height: 8),
                      TextField(
                        controller: confirmController,
                        enabled: !busy,
                        obscureText: obscure,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        decoration: const InputDecoration(
                          labelText: 'Confirm Switch PIN',
                          counterText: '',
                        ),
                      ),
                    ],
                    if (errorText != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        errorText!,
                        style: const TextStyle(
                          color: Color(0xFFB91C1C),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: busy
                        ? null
                        : () => Navigator.of(dialogContext).pop(),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    onPressed: busy ? null : () => unawaited(submit()),
                    child: Text(busy ? 'Checking...' : 'Continue'),
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      pinController.dispose();
      confirmController.dispose();
    }
  }

  Future<void> _startSellerUpgrade() async {
    if (widget.onStartSellerUpgrade != null) {
      await Navigator.of(context).maybePop();
      widget.onStartSellerUpgrade!();
      return;
    }

    final bases = buildLocalApiBaseUrls(
      isAndroid: defaultTargetPlatform == TargetPlatform.android,
    );
    final base = bases.isNotEmpty ? bases.first : '';
    if (base.isEmpty) {
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: 'Unable to open Start upgrade right now.',
      );
      return;
    }

    final uri = Uri.parse('$base/switch_account.html').replace(
      queryParameters: const {'becomeSeller': '1'},
    );
    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;
    if (!launched) {
      AppSnackBar.showError(
        context,
        message: 'Unable to open Start upgrade.',
      );
      return;
    }
    await Navigator.of(context).maybePop();
  }

  int _companyToneIndex(String seed) {
    if (seed.isEmpty) return 0;
    var hash = 0;
    for (final unit in seed.codeUnits) {
      hash = (hash + unit) % 6;
    }
    return hash;
  }

  Widget _buildCompaniesView() {
    if (_companiesLoading && _sellerCompanies.isEmpty) {
      return const SkeletonCenteredPanel();
    }
    if (_sellerCompanies.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
        children: [
          Text(
            'No seller companies linked to this account yet.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () {
              unawaited(_startSellerUpgrade());
            },
            style: FilledButton.styleFrom(
              backgroundColor: widget.primaryColor,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(42),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Start upgrade',
              style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 24),
      children: [
        Text(
          'Choose a company, then enter your Switch PIN to open its seller admin.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 12,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 12),
        for (final company in _sellerCompanies) ...[
          Material(
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(
                color: company.isActive
                    ? widget.primaryColor.withValues(alpha: 0.42)
                    : const Color(0xFFE2E8F0),
              ),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: _companySelectBusy
                  ? null
                  : () => unawaited(_openSellerCompany(company)),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Row(
                  children: [
                    _buildCompanyAvatar(company),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            company.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: widget.titleColor,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            company.detail,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: widget.secondaryColor,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (company.isActive)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: widget.primaryColor.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'Current',
                          style: TextStyle(
                            color: widget.primaryColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                    else
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: widget.secondaryColor,
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (_companySelectBusy) ...[
          const SizedBox(height: 8),
          Text(
            'Opening company workspace...',
            style: TextStyle(color: widget.primaryColor, fontSize: 12),
          ),
        ],
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _companySelectBusy
              ? null
              : () {
                  unawaited(_startSellerUpgrade());
                },
          icon: const Icon(Icons.add_rounded, size: 18),
          label: const Text('Add company'),
          style: OutlinedButton.styleFrom(
            foregroundColor: widget.primaryColor,
            side: BorderSide(
              color: widget.primaryColor.withValues(alpha: 0.35),
            ),
            minimumSize: const Size.fromHeight(44),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCompanyAvatar(_SellerCompanyOption company) {
    final tone = _companyToneIndex(
      company.companyId.isEmpty ? company.name : company.companyId,
    );
    final foreground = _companyLogoToneForegrounds[tone];
    final background = _companyLogoToneBackgrounds[tone];
    final logoUrl = company.logoUrl.trim();
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: logoUrl.isEmpty ? background : const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(14),
      ),
      clipBehavior: Clip.antiAlias,
      child: logoUrl.isEmpty
          ? Center(
              child: SvgPicture.string(
                _lucideBuildingIconSvg,
                width: 24,
                height: 24,
                colorFilter: ColorFilter.mode(foreground, BlendMode.srcIn),
              ),
            )
          : CachedNetworkImage(
              imageUrl: logoUrl,
              fit: BoxFit.cover,
              errorWidget: (context, url, error) => Center(
                child: SvgPicture.string(
                  _lucideBuildingIconSvg,
                  width: 24,
                  height: 24,
                  colorFilter: ColorFilter.mode(foreground, BlendMode.srcIn),
                ),
              ),
            ),
    );
  }

  Widget _buildPlaceholderView(String message) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Text(
          message,
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 12,
            height: 1.55,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }

  String get _addressPrefsKey {
    final accountKey = widget.accountId.trim().isNotEmpty
        ? widget.accountId.trim().toLowerCase()
        : widget.email.trim().toLowerCase();
    return 'gms-buyer-address:${accountKey.isEmpty ? 'buyer' : accountKey}';
  }

  static const String _currentLocationAddressId = 'current-location';

  void _clearAddressFormFields() {
    _addressSearchDebounce?.cancel();
    _addressSearchController.removeListener(_onAddressSearchChanged);
    _addressSearchController.clear();
    _addressSearchController.addListener(_onAddressSearchChanged);
    _addressUnitController.clear();
    _addressStreetController.clear();
    _addressCityController.clear();
    _addressProvinceController.clear();
    _addressPostalController.clear();
    _addressLabel = kBuyerSavedLocationLabel;
    _addressLat = null;
    _addressLng = null;
    _addressMapQuery = 'Philippines';
    _addressSuggestions = const <PhilippinesPlace>[];
    _addressSearching = false;
  }

  _SavedBuyerAddress? get _selectedSavedAddress {
    final id = _selectedAddressId;
    if (id == null) return null;
    for (final entry in _savedAddresses) {
      if (entry.id == id) return entry;
    }
    return null;
  }

  Future<void> _persistSavedAddresses() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _addressPrefsKey,
      jsonEncode(<String, Object?>{
        'version': 2,
        'selectedId': _selectedAddressId,
        'useCurrentLocation': _useCurrentLocationSelected,
        'entries': _savedAddresses
            .map((e) => e.toJson())
            .toList(growable: false),
      }),
    );
    // Keep the shared picker store + cloud book in sync with Account → Address.
    await BuyerDeliveryAddressStore.instance.replaceBook(
      entries: _savedAddresses
          .map(
            (entry) => BuyerDeliveryAddress(
              id: entry.id,
              search: entry.search,
              unit: entry.unit,
              street: entry.street,
              city: entry.city,
              province: entry.province,
              postal: entry.postal,
              label: entry.label,
              lat: entry.lat,
              lng: entry.lng,
            ),
          )
          .toList(growable: false),
      selectedId: _selectedAddressId,
      useCurrentLocation: _useCurrentLocationSelected,
    );
  }

  Future<void> _loadSavedAddress() async {
    try {
      await BuyerDeliveryAddressStore.instance.reload(syncRemote: true);
      final store = BuyerDeliveryAddressStore.instance;
      if (store.entries.isNotEmpty) {
        final entries = store.entries
            .map(
              (entry) => _SavedBuyerAddress(
                id: entry.id,
                search: entry.search,
                unit: entry.unit,
                street: entry.street,
                city: entry.city,
                province: entry.province,
                postal: entry.postal,
                label: entry.label,
                lat: entry.lat,
                lng: entry.lng,
              ),
            )
            .toList(growable: false);
        if (!mounted) return;
        setState(() {
          _savedAddresses = entries;
          _selectedAddressId = store.selectedId;
          _useCurrentLocationSelected = store.useCurrentLocation;
          _addressEditorOpen = entries.isEmpty;
          _editingAddressId = null;
          if (entries.isEmpty) {
            _clearAddressFormFields();
          }
        });
        _maybeOpenInitialAddressEditor();
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      final raw = (prefs.getString(_addressPrefsKey) ?? '').trim();
      if (raw.isEmpty) return;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;

      final entries = <_SavedBuyerAddress>[];
      final rawEntries = decoded['entries'];
      if (rawEntries is List) {
        for (final item in rawEntries) {
          if (item is Map) {
            final entry = _SavedBuyerAddress.fromJson(
              Map<String, dynamic>.from(item),
            );
            if (entry.street.isNotEmpty || entry.city.isNotEmpty) {
              entries.add(entry);
            }
          }
        }
      } else {
        // Legacy single-address payload.
        final legacy = _SavedBuyerAddress.fromJson(
          Map<String, dynamic>.from(decoded),
        );
        if (legacy.street.isNotEmpty || legacy.city.isNotEmpty) {
          entries.add(legacy);
        }
      }

      var selectedId = '${decoded['selectedId'] ?? ''}'.trim();
      final useCurrent = decoded['useCurrentLocation'] == true;
      if (selectedId.isEmpty && entries.isNotEmpty) {
        selectedId = entries.first.id;
      }
      if (selectedId.isNotEmpty &&
          !entries.any((entry) => entry.id == selectedId)) {
        selectedId = entries.isEmpty ? '' : entries.first.id;
      }

      if (!mounted) return;
      setState(() {
        _savedAddresses = entries;
        _selectedAddressId = selectedId.isEmpty ? null : selectedId;
        _useCurrentLocationSelected = useCurrent && entries.isNotEmpty;
        _addressEditorOpen = entries.isEmpty;
        _editingAddressId = null;
        if (entries.isEmpty) {
          _clearAddressFormFields();
        }
      });
      if (entries.isNotEmpty) {
        await _persistSavedAddresses();
      }
      _maybeOpenInitialAddressEditor();
    } catch (_) {
      // A malformed legacy value should never block the Address UI.
    }
  }

  void _maybeOpenInitialAddressEditor() {
    final editId = (widget.initialEditAddressId ?? '').trim();
    if (editId.isEmpty) return;
    for (final entry in _savedAddresses) {
      if (entry.id == editId && entry.id != _currentLocationAddressId) {
        _openEditAddressEditor(entry);
        return;
      }
    }
  }

  Future<void> _saveAddress() async {
    if (_addressSaving) return;
    final street = _addressStreetController.text.trim();
    final city = _addressCityController.text.trim();
    final province = _addressProvinceController.text.trim();
    if (street.isEmpty || city.isEmpty || province.isEmpty) {
      AppSnackBar.showError(
        context,
        message: 'Add your street, city, and province before saving.',
      );
      return;
    }
    setState(() => _addressSaving = true);
    try {
      final entry = _SavedBuyerAddress(
        id: _editingAddressId?.trim().isNotEmpty == true
            ? _editingAddressId!.trim()
            : 'addr_${DateTime.now().millisecondsSinceEpoch}',
        search: _addressSearchController.text.trim(),
        unit: _addressUnitController.text.trim(),
        street: street,
        city: city,
        province: province,
        postal: _addressPostalController.text.trim(),
        label: kBuyerSavedLocationLabel,
        lat: _addressLat,
        lng: _addressLng,
      );
      final next = List<_SavedBuyerAddress>.from(_savedAddresses);
      final existingIndex = next.indexWhere((item) => item.id == entry.id);
      if (existingIndex >= 0) {
        next[existingIndex] = entry;
      } else {
        next.add(entry);
      }
      setState(() {
        _savedAddresses = next;
        _selectedAddressId = entry.id;
        _useCurrentLocationSelected = entry.id == _currentLocationAddressId;
        _addressEditorOpen = false;
        _editingAddressId = null;
        _clearAddressFormFields();
      });
      await _persistSavedAddresses();
      if (!mounted) return;
      AppSnackBar.showSuccess(context, message: 'Address saved.');
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: 'Unable to save address.');
    } finally {
      if (mounted) setState(() => _addressSaving = false);
    }
  }

  void _openAddAddressEditor() {
    setState(() {
      _addressEditorOpen = true;
      _editingAddressId = null;
      _useCurrentLocationSelected = false;
      _clearAddressFormFields();
    });
  }

  void _openEditAddressEditor(_SavedBuyerAddress entry) {
    setState(() {
      _addressEditorOpen = true;
      _editingAddressId = entry.id;
      _useCurrentLocationSelected = false;
      _addressSearchController.removeListener(_onAddressSearchChanged);
      _addressSearchController.text = entry.search;
      _addressSearchController.addListener(_onAddressSearchChanged);
      _addressUnitController.text = entry.unit;
      _addressStreetController.text = entry.street;
      _addressCityController.text = entry.city;
      _addressProvinceController.text = entry.province;
      _addressPostalController.text = entry.postal;
      _addressLabel = kBuyerSavedLocationLabel;
      _addressLat = entry.lat;
      _addressLng = entry.lng;
      _addressMapQuery = entry.mapQuery;
      _addressSuggestions = const <PhilippinesPlace>[];
    });
  }

  Future<void> _selectSavedAddress(_SavedBuyerAddress entry) async {
    setState(() {
      _selectedAddressId = entry.id;
      _useCurrentLocationSelected = entry.id == _currentLocationAddressId;
      _addressEditorOpen = false;
      _editingAddressId = null;
    });
    await _persistSavedAddresses();
  }

  Future<void> _deleteSavedAddress(_SavedBuyerAddress entry) async {
    final next = _savedAddresses.where((item) => item.id != entry.id).toList();
    var selectedId = _selectedAddressId;
    var useCurrent = _useCurrentLocationSelected;
    if (selectedId == entry.id) {
      selectedId = next.isEmpty ? null : next.first.id;
      useCurrent = selectedId == _currentLocationAddressId;
    }
    setState(() {
      _savedAddresses = next;
      _selectedAddressId = selectedId;
      _useCurrentLocationSelected = useCurrent;
      if (next.isEmpty) {
        _addressEditorOpen = true;
        _editingAddressId = null;
        _clearAddressFormFields();
      }
    });
    await _persistSavedAddresses();
    if (!mounted) return;
    AppSnackBar.showSuccess(context, message: 'Address deleted.');
  }

  void _onAddressSearchChanged() {
    _addressSearchDebounce?.cancel();
    final query = _addressSearchController.text.trim();
    if (query.length < 2) {
      if (!mounted) return;
      setState(() {
        _addressSuggestions = const <PhilippinesPlace>[];
        _addressSearching = false;
      });
      return;
    }
    if (mounted) setState(() {});
    _addressSearchDebounce = Timer(const Duration(milliseconds: 380), () {
      unawaited(_searchAddressPlaces(query));
    });
  }

  Future<void> _searchAddressPlaces(String query) async {
    final requestId = ++_addressSearchRequestId;
    if (mounted) {
      setState(() => _addressSearching = true);
    }
    final places = await searchPhilippinesPlaces(query);
    if (!mounted || requestId != _addressSearchRequestId) return;
    setState(() {
      _addressSuggestions = places;
      _addressSearching = false;
    });
  }

  Future<void> _selectAddressPlace(PhilippinesPlace suggestion) async {
    FocusScope.of(context).unfocus();
    setState(() {
      _addressSearching = true;
      _addressSuggestions = const <PhilippinesPlace>[];
    });
    final place = await resolvePhilippinesPlaceDetails(suggestion);
    if (!mounted) return;
    final resolved = place ?? suggestion;
    final searchText = resolved.description.isNotEmpty
        ? resolved.description
        : resolved.label;
    setState(() {
      _addressSearchController.removeListener(_onAddressSearchChanged);
      _addressSearchController.text = searchText;
      _addressSearchController.selection = TextSelection.collapsed(
        offset: searchText.length,
      );
      _addressSearchController.addListener(_onAddressSearchChanged);
      if (resolved.street.isNotEmpty) {
        _addressStreetController.text = resolved.street;
      }
      if (resolved.city.isNotEmpty) {
        _addressCityController.text = resolved.city;
      }
      if (resolved.province.isNotEmpty) {
        _addressProvinceController.text = resolved.province;
      }
      if (resolved.postal.isNotEmpty) {
        _addressPostalController.text = resolved.postal;
      }
      _addressLat = resolved.lat;
      _addressLng = resolved.lng;
      _addressMapQuery = resolved.mapQuery;
      _addressSearching = false;
    });
  }

  Future<void> _useCurrentAddressLocation({bool fromListRadio = false}) async {
    if (_addressLocating) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _addressLocating = true;
      if (fromListRadio) {
        _useCurrentLocationSelected = true;
      }
    });
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (!mounted) return;
        AppSnackBar.showError(
          context,
          message: 'Turn on location services, then try again.',
        );
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (!mounted) return;
        AppSnackBar.showError(
          context,
          message: 'Allow location access to pin your current address.',
        );
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      final place = await reverseGeocodePhilippines(
        lat: position.latitude,
        lng: position.longitude,
      );
      if (!mounted) return;
      if (place == null) {
        AppSnackBar.showError(
          context,
          message: 'Could not find a Philippine address for your location.',
        );
        return;
      }

      if (fromListRadio) {
        final entry = _SavedBuyerAddress(
          id: _currentLocationAddressId,
          search: place.description.isNotEmpty
              ? place.description
              : place.label,
          unit: '',
          street: place.street.isNotEmpty ? place.street : place.label,
          city: place.city,
          province: place.province,
          postal: place.postal,
          label: 'Current',
          lat: place.lat ?? position.latitude,
          lng: place.lng ?? position.longitude,
        );
        final next = List<_SavedBuyerAddress>.from(_savedAddresses);
        final existingIndex = next.indexWhere((item) => item.id == entry.id);
        if (existingIndex >= 0) {
          next[existingIndex] = entry;
        } else {
          next.insert(0, entry);
        }
        setState(() {
          _savedAddresses = next;
          _selectedAddressId = entry.id;
          _useCurrentLocationSelected = true;
          _addressEditorOpen = false;
          _editingAddressId = null;
        });
        await _persistSavedAddresses();
        if (!mounted) return;
        AppSnackBar.showSuccess(
          context,
          message: 'Using your current location.',
        );
        return;
      }

      await _selectAddressPlace(place);
      if (!mounted) return;
      AppSnackBar.showSuccess(
        context,
        message: 'Current location pinned. Review the address details below.',
      );
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: 'Unable to get your current location.',
      );
    } finally {
      if (mounted) setState(() => _addressLocating = false);
    }
  }

  InputDecoration _addressInputDecoration({required String hint}) {
    final borderColor = widget.secondaryColor.withValues(alpha: 0.18);
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        color: widget.secondaryColor.withValues(alpha: 0.72),
        fontSize: 11,
      ),
      filled: true,
      fillColor: Colors.white,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: widget.primaryColor, width: 1.25),
      ),
    );
  }

  Widget _buildAddressTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: widget.titleColor,
            fontSize: 10.5,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: TextInputAction.next,
          style: TextStyle(color: widget.titleColor, fontSize: 12),
          decoration: _addressInputDecoration(hint: hint),
        ),
      ],
    );
  }

  Widget _buildAddressSuggestions() {
    if (!_addressSearching && _addressSuggestions.isEmpty) {
      return const SizedBox.shrink();
    }
    return Container(
      margin: const EdgeInsets.only(top: 8),
      constraints: const BoxConstraints(maxHeight: 220),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: widget.secondaryColor.withValues(alpha: 0.16),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: _addressSearching && _addressSuggestions.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: const Center(
                child: SkeletonCircle(size: 18),
              ),
            )
          : ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: 4),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              itemCount: _addressSuggestions.length,
              separatorBuilder: (_, _) => Divider(
                height: 1,
                color: widget.secondaryColor.withValues(alpha: 0.1),
              ),
              itemBuilder: (context, index) {
                final place = _addressSuggestions[index];
                return InkWell(
                  onTap: () => unawaited(_selectAddressPlace(place)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.place_outlined,
                          size: 16,
                          color: widget.primaryColor,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                place.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: widget.titleColor,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (place.description.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  place.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: widget.secondaryColor,
                                    fontSize: 10,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildAddressRadioTile({
    required bool selected,
    required VoidCallback onTap,
    required Widget child,
    Widget? trailing,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 10, 8, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? widget.primaryColor
                  : widget.secondaryColor.withValues(alpha: 0.16),
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: Icon(
                  selected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_off_rounded,
                  size: 20,
                  color: selected
                      ? widget.primaryColor
                      : widget.secondaryColor.withValues(alpha: 0.55),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: child),
              if (trailing != null) trailing,
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSavedAddressListView() {
    _SavedBuyerAddress? currentEntry;
    for (final entry in _savedAddresses) {
      if (entry.id == _currentLocationAddressId) {
        currentEntry = entry;
        break;
      }
    }
    final regularEntries = _savedAddresses
        .where((entry) => entry.id != _currentLocationAddressId)
        .toList(growable: false);

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 26),
      children: [
        Text(
          'Saved addresses',
          style: TextStyle(
            color: widget.titleColor,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Choose where you want deliveries sent.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 10.5,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 12),
        _buildAddressRadioTile(
          selected:
              _useCurrentLocationSelected ||
              _selectedAddressId == _currentLocationAddressId,
          onTap: () =>
              unawaited(_useCurrentAddressLocation(fromListRadio: true)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Use current location',
                style: TextStyle(
                  color: widget.titleColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                _addressLocating
                    ? 'Finding your location...'
                    : (currentEntry?.summaryLine ??
                          'Pin your GPS location in the Philippines'),
                style: TextStyle(
                  color: widget.secondaryColor,
                  fontSize: 10.5,
                  height: 1.35,
                ),
              ),
            ],
          ),
          trailing: _addressLocating
              ? Padding(
                  padding: const EdgeInsets.only(left: 6, top: 2),
                  child: const SkeletonCircle(size: 16),
                )
              : Icon(
                  Icons.my_location_rounded,
                  size: 18,
                  color: widget.primaryColor,
                ),
        ),
        if (regularEntries.isNotEmpty) ...[
          const SizedBox(height: 10),
          ...regularEntries.map((entry) {
            final selected =
                !_useCurrentLocationSelected && _selectedAddressId == entry.id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _buildAddressRadioTile(
                selected: selected,
                onTap: () => unawaited(_selectSavedAddress(entry)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      BuyerDeliveryAddress.displayTitle(entry.label),
                      style: TextStyle(
                        color: widget.titleColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      entry.summaryLine,
                      style: TextStyle(
                        color: widget.secondaryColor,
                        fontSize: 10.5,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'Edit',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => _openEditAddressEditor(entry),
                      icon: Icon(
                        Icons.edit_outlined,
                        size: 17,
                        color: widget.secondaryColor,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Delete',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => unawaited(_deleteSavedAddress(entry)),
                      icon: Icon(
                        Icons.delete_outline_rounded,
                        size: 18,
                        color: widget.secondaryColor,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
        const SizedBox(height: 8),
        SizedBox(
          height: 44,
          child: OutlinedButton.icon(
            onPressed: _openAddAddressEditor,
            style: OutlinedButton.styleFrom(
              foregroundColor: widget.primaryColor,
              side: BorderSide(
                color: widget.primaryColor.withValues(alpha: 0.55),
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(11),
              ),
            ),
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text(
              'Add address',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        if (_selectedSavedAddress != null) ...[
          const SizedBox(height: 14),
          Text(
            'Selected on map',
            style: TextStyle(
              color: widget.titleColor,
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          GoogleMapsEmbedPreview(
            address: _selectedSavedAddress!.mapQuery,
            lat: _selectedSavedAddress!.lat,
            lng: _selectedSavedAddress!.lng,
            primaryColor: widget.primaryColor,
            height: 160,
          ),
        ],
      ],
    );
  }

  Widget _buildAddressEditorView() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 26),
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            if (!_addressSearchFocusNode.hasFocus) {
              _addressSearchFocusNode.requestFocus();
            }
          },
          child: TextField(
            controller: _addressSearchController,
            focusNode: _addressSearchFocusNode,
            textInputAction: TextInputAction.search,
            onTapOutside: dismissSearchKeyboardOnTapOutside,
            style: TextStyle(color: widget.titleColor, fontSize: 12),
            decoration:
                _addressInputDecoration(
                  hint: 'Search any place in the Philippines',
                ).copyWith(
                  prefixIcon: Icon(
                    Icons.search_rounded,
                    size: 19,
                    color: widget.secondaryColor,
                  ),
                  prefixIconConstraints: const BoxConstraints(
                    minWidth: 40,
                    minHeight: 40,
                  ),
                  suffixIcon: _addressSearching
                      ? Padding(
                          padding: const EdgeInsets.all(12),
                          child: const SkeletonCircle(size: 16),
                        )
                      : (_addressSearchController.text.isEmpty
                            ? null
                            : IconButton(
                                tooltip: 'Clear',
                                onPressed: () {
                                  _addressSearchController.clear();
                                  setState(() {
                                    _addressSuggestions =
                                        const <PhilippinesPlace>[];
                                  });
                                },
                                icon: Icon(
                                  Icons.close_rounded,
                                  size: 18,
                                  color: widget.secondaryColor,
                                ),
                              )),
                ),
          ),
        ),
        _buildAddressSuggestions(),
        const SizedBox(height: 10),
        Stack(
          children: [
            GoogleMapsEmbedPreview(
              address: _addressMapQuery,
              lat: _addressLat,
              lng: _addressLng,
              primaryColor: widget.primaryColor,
              height: 188,
            ),
            Positioned(
              left: 10,
              bottom: 10,
              child: Material(
                color: Colors.white,
                elevation: 1.5,
                shadowColor: Colors.black.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(999),
                child: InkWell(
                  onTap: _addressLocating
                      ? null
                      : () => unawaited(_useCurrentAddressLocation()),
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 11,
                      vertical: 8,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_addressLocating)
                          const SkeletonCircle(size: 14)
                        else
                          Icon(
                            Icons.my_location_rounded,
                            size: 15,
                            color: widget.titleColor,
                          ),
                        const SizedBox(width: 6),
                        Text(
                          _addressLocating
                              ? 'Locating...'
                              : 'Use Current Location',
                          style: TextStyle(
                            color: widget.titleColor,
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 13),
        _buildAddressTextField(
          label: 'House / Building / Unit (Optional)',
          hint: 'e.g. Unit 12B, Tower 1',
          controller: _addressUnitController,
        ),
        const SizedBox(height: 11),
        _buildAddressTextField(
          label: 'Street',
          hint: 'e.g. Rizal Avenue',
          controller: _addressStreetController,
        ),
        const SizedBox(height: 11),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _buildAddressTextField(
                label: 'City / Municipality',
                hint: 'e.g. Quezon City',
                controller: _addressCityController,
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: _buildAddressTextField(
                label: 'Province',
                hint: 'e.g. Metro Manila',
                controller: _addressProvinceController,
              ),
            ),
          ],
        ),
        const SizedBox(height: 11),
        _buildAddressTextField(
          label: 'ZIP / Postal Code (Optional)',
          hint: 'e.g. 1000',
          controller: _addressPostalController,
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 46,
          child: FilledButton(
            onPressed: _addressSaving ? null : _saveAddress,
            style: FilledButton.styleFrom(
              backgroundColor: widget.primaryColor,
              foregroundColor: Colors.white,
              disabledBackgroundColor: widget.primaryColor.withValues(
                alpha: 0.55,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(11),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 6),
              elevation: 0,
            ),
            child: _addressSaving
                ? const SkeletonCircle(size: 18)
                : SizedBox.expand(
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Text(
                          _editingAddressId == null
                              ? 'Save Address'
                              : 'Update Address',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Icon(
                              Icons.upload_rounded,
                              size: 18,
                              color: Colors.white.withValues(alpha: 0.95),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddressView() {
    if (_addressEditorOpen || _savedAddresses.isEmpty) {
      return _buildAddressEditorView();
    }
    return _buildSavedAddressListView();
  }

  Widget _buildFavoritesView() {
    return ColoredBox(
      color: widget.surfaceColor,
      child: Column(children: [Expanded(child: _buildFavoritesBody())]),
    );
  }

  Widget _buildFavoritesBody() {
    return ValueListenableBuilder<List<String>>(
      valueListenable:
          FavoriteProductsStore.instance.favoriteProductIdsNotifier,
      builder: (context, favoriteProductIds, child) {
        if (favoriteProductIds.isEmpty) {
          return _buildFavoritesEmptyView();
        }

        return FutureBuilder<List<Product>>(
          future: widget.productsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                !snapshot.hasData) {
              return const SkeletonProductGrid(count: 4, crossAxisCount: 2);
            }

            final catalogProducts = snapshot.data ?? const <Product>[];
            final productsById = <String, Product>{
              for (final product in catalogProducts) product.id.trim(): product,
            };
            final favoriteProducts = favoriteProductIds
                .map(
                  (favoriteProductId) => productsById[favoriteProductId.trim()],
                )
                .whereType<Product>()
                .where(isProductVisibleToUsers)
                .toList(growable: false);

            if (favoriteProducts.isEmpty) {
              return _buildFavoritesUnavailableView(snapshot.error);
            }

            return _buildFavoriteProductsLayout(
              favoriteProducts,
              catalogProducts,
            );
          },
        );
      },
    );
  }

  Widget _buildFavoritesEmptyView() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxHeight < 570;
        // Match invite "gift" reward art display width (157).
        final artSize = isCompact ? 140.0 : 157.0;

        return CustomScrollView(
          slivers: [
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: isCompact ? 24 : 32,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 310),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Semantics(
                          image: true,
                          label: 'Favorites illustration',
                          child: SizedBox.square(
                            dimension: artSize,
                            child: ColorFiltered(
                              colorFilter: ColorFilter.mode(
                                widget.primaryColor,
                                BlendMode.hue,
                              ),
                              child: Image.asset(
                                'assets/images/favorites-empty-art.png',
                                fit: BoxFit.contain,
                                filterQuality: FilterQuality.high,
                                excludeFromSemantics: true,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(height: isCompact ? 10 : 16),
                        Text(
                          'Your favorites is empty',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: widget.titleColor,
                            fontSize: isCompact ? 19 : 21,
                            fontWeight: FontWeight.w800,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 9),
                        Text(
                          'Save the items you love by tapping the heart. You\'ll find them all here anytime.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: widget.secondaryColor.withValues(
                              alpha: 0.82,
                            ),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w400,
                            height: 1.5,
                          ),
                        ),
                        SizedBox(height: isCompact ? 18 : 24),
                        SizedBox(
                          width: 168,
                          height: 46,
                          child: FilledButton(
                            onPressed: () {
                              Navigator.of(context).maybePop();
                              widget.onExploreShop?.call();
                            },
                            style: FilledButton.styleFrom(
                              backgroundColor: widget.primaryColor,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Text(
                              'Explore now',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildFavoritesUnavailableView(Object? error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.favorite_border_rounded,
              size: 42,
              color: widget.primaryColor,
            ),
            const SizedBox(height: 12),
            Text(
              'Favorites unavailable',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: widget.titleColor,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 7),
            Text(
              error == null
                  ? 'Your saved product may be unavailable or out of stock.'
                  : 'Unable to load your saved products right now.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: widget.secondaryColor,
                fontSize: 12.5,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFavoritesFilterPill(String label, {bool selected = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: selected
            ? widget.primaryColor
            : widget.primaryColor.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: selected ? Colors.white : widget.secondaryColor,
          fontSize: 10.5,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildFavoriteImage(Product product) {
    final imageUrl = product.cardDisplayImageUrl.trim();
    if (imageUrl.isEmpty) {
      return ColoredBox(
        color: widget.primaryColor.withValues(alpha: 0.08),
        child: Center(
          child: Icon(
            Icons.image_outlined,
            color: widget.primaryColor.withValues(alpha: 0.65),
          ),
        ),
      );
    }

    return CachedNetworkImage(
      imageUrl: imageUrl,
      fit: BoxFit.cover,
      alignment: product.hasSavedCardImageCrop
          ? Alignment.center
          : Alignment(product.cardImageAlignmentX, product.cardImageAlignmentY),
      placeholder: (context, url) =>
          ColoredBox(color: widget.secondaryColor.withValues(alpha: 0.08)),
      errorWidget: (context, url, error) => ColoredBox(
        color: widget.primaryColor.withValues(alpha: 0.08),
        child: Icon(
          Icons.broken_image_outlined,
          color: widget.primaryColor.withValues(alpha: 0.65),
        ),
      ),
    );
  }

  double _favoriteDisplayPrice(Product product) {
    final salePrice = product.salesPrice;
    if (salePrice != null &&
        salePrice >= 0 &&
        salePrice < product.originalPrice) {
      return salePrice;
    }
    return product.originalPrice;
  }

  int? _favoriteDiscountPercent(Product product) {
    final salePrice = product.salesPrice;
    if (salePrice == null ||
        salePrice < 0 ||
        salePrice >= product.originalPrice ||
        product.originalPrice <= 0) {
      return null;
    }
    return (((product.originalPrice - salePrice) / product.originalPrice) * 100)
        .round();
  }

  Future<void> _removeFavoriteProduct(Product product) async {
    final isNowFavorite = await FavoriteProductsStore.instance.toggleFavorite(
      product.id,
    );
    if (!mounted) return;
    AppSnackBar.showSuccess(
      context,
      message: isNowFavorite
          ? 'Product added to favorites.'
          : 'Product removed from favorites.',
    );
  }

  Future<void> _addFavoriteProductToCart(
    Product product,
    List<Product> catalogProducts,
  ) async {
    if (_favoriteCartBusyProductId != null) return;

    final selection = await showAddToCartModal(
      context,
      product: product,
      catalogProducts: catalogProducts,
      discountPercent: _favoriteDiscountPercent(product),
    );
    if (!mounted || selection == null) return;
    if (await isOwnCompanyListing(product)) {
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: "You can't add your own company listing to cart.",
      );
      return;
    }

    setState(() => _favoriteCartBusyProductId = product.id);
    try {
      await CartStore.instance.addItem(
        product,
        quantity: selection.quantity,
        selectedVariant: selection.selectedVariant,
        catalogProducts: catalogProducts,
        platformId: widget.platformId,
      );
      if (!mounted) return;
      AppSnackBar.showSuccess(context, message: 'Product added to cart.');
    } on FlashDealReserveException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: 'Unable to add this product to your cart.',
      );
    } finally {
      if (mounted) {
        setState(() => _favoriteCartBusyProductId = null);
      }
    }
  }

  void _openFavoriteProduct(Product product) {
    final onOpenProduct = widget.onOpenProduct;
    if (onOpenProduct == null) return;
    Navigator.of(context).maybePop();
    onOpenProduct(product);
  }

  Widget _buildFavoriteCollectionCard(Product firstProduct, int itemCount) {
    return Container(
      padding: const EdgeInsets.all(9),
      decoration: BoxDecoration(
        color: widget.primaryColor.withValues(alpha: 0.045),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.primaryColor.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 54,
              height: 54,
              child: _buildFavoriteImage(firstProduct),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'My Wishlist Collection',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: widget.titleColor,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'A little bit of everything I love',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: widget.secondaryColor, fontSize: 10),
                ),
                const SizedBox(height: 3),
                Text(
                  '$itemCount ${itemCount == 1 ? 'item' : 'items'}',
                  style: TextStyle(
                    color: widget.secondaryColor.withValues(alpha: 0.78),
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: widget.secondaryColor,
          ),
        ],
      ),
    );
  }

  Widget _buildFavoriteProductCard(
    Product product,
    List<Product> catalogProducts,
  ) {
    final displayPrice = _favoriteDisplayPrice(product);
    final discountPercent = _favoriteDiscountPercent(product);
    final isAdding = _favoriteCartBusyProductId == product.id;

    return Material(
      color: widget.surfaceColor,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: widget.onOpenProduct == null
            ? null
            : () => _openFavoriteProduct(product),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(
              color: widget.secondaryColor.withValues(alpha: 0.14),
            ),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 116,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _buildFavoriteImage(product),
                    if (discountPercent != null)
                      Positioned(
                        left: 7,
                        bottom: 7,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: widget.primaryColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '-$discountPercent%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Material(
                        color: widget.surfaceColor.withValues(alpha: 0.94),
                        shape: const CircleBorder(),
                        child: InkWell(
                          onTap: () => _removeFavoriteProduct(product),
                          customBorder: const CircleBorder(),
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: Icon(
                              Icons.favorite_rounded,
                              size: 17,
                              color: widget.primaryColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: widget.titleColor,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            size: 13,
                            color: Color(0xFFF59E0B),
                          ),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              product.rating > 0
                                  ? '${product.rating.toStringAsFixed(1)} (${product.ratingCount})'
                                  : 'New arrival',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: widget.secondaryColor,
                                fontSize: 9.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          AppPriceText(
                            amount: displayPrice,
                            color: widget.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                          if (discountPercent != null) ...[
                            const SizedBox(width: 4),
                            Expanded(
                              child: AppPriceText(
                                amount: product.originalPrice,
                                color: widget.secondaryColor,
                                fontSize: 8.5,
                                decoration: TextDecoration.lineThrough,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: double.infinity,
                        height: 30,
                        child: OutlinedButton.icon(
                          onPressed: _favoriteCartBusyProductId == null
                              ? () => _addFavoriteProductToCart(
                                  product,
                                  catalogProducts,
                                )
                              : null,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: widget.primaryColor,
                            side: BorderSide(
                              color: widget.primaryColor.withValues(alpha: 0.3),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(9),
                            ),
                          ),
                          icon: isAdding
                              ? const SkeletonCircle(size: 12)
                              : const Icon(
                                  Icons.add_shopping_cart_rounded,
                                  size: 13,
                                ),
                          label: Text(
                            isAdding ? 'Adding...' : 'Add to Cart',
                            maxLines: 1,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFavoriteProductsLayout(
    List<Product> favoriteProducts,
    List<Product> catalogProducts,
  ) {
    final itemCount = favoriteProducts.length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 24),
      children: [
        Text(
          'The things you love, all in one place.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 11.5,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 11),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFavoritesFilterPill('All', selected: true),
              const SizedBox(width: 6),
              _buildFavoritesFilterPill('Products'),
              const SizedBox(width: 6),
              _buildFavoritesFilterPill('Stores'),
              const SizedBox(width: 6),
              _buildFavoritesFilterPill('Collections'),
            ],
          ),
        ),
        const SizedBox(height: 13),
        _buildFavoriteCollectionCard(favoriteProducts.first, itemCount),
        const SizedBox(height: 17),
        Row(
          children: [
            Expanded(
              child: Text(
                'Saved for Later',
                style: TextStyle(
                  color: widget.titleColor,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Text(
              '$itemCount ${itemCount == 1 ? 'item' : 'items'}',
              style: TextStyle(color: widget.secondaryColor, fontSize: 10.5),
            ),
          ],
        ),
        const SizedBox(height: 10),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: itemCount,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 9,
            mainAxisSpacing: 10,
            mainAxisExtent: 250,
          ),
          itemBuilder: (context, index) => _buildFavoriteProductCard(
            favoriteProducts[index],
            catalogProducts,
          ),
        ),
      ],
    );
  }

  Widget _buildInviteStep({
    required int number,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final accent = widget.primaryColor;
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 58,
            height: 58,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Align(
                  alignment: Alignment.center,
                  child: Container(
                    width: 50,
                    height: 50,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.09),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: accent, size: 25),
                  ),
                ),
                Positioned(
                  left: -2,
                  top: -1,
                  child: Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: accent,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$number',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 7),
          Text(
            title,
            textAlign: TextAlign.center,
            maxLines: 2,
            style: TextStyle(
              color: widget.titleColor,
              fontSize: 10.5,
              height: 1.16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            maxLines: 3,
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 9.25,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInviteMetricCard({
    required IconData icon,
    required String value,
    required String label,
  }) {
    final accent = widget.primaryColor;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 13, 10, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(
              color: Color(0x66000000),
              blurRadius: 1,
              offset: Offset(0, 1),
            ),
            BoxShadow(
              color: Color(0x0D000000),
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.09),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 22, color: accent),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: widget.titleColor,
                      fontSize: 16,
                      height: 1.1,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: widget.secondaryColor,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInviteView() {
    final accent = widget.primaryColor;
    final textPrimary = widget.titleColor;
    final textSecondary = widget.secondaryColor;
    final accentSurface = widget.primaryColor.withValues(alpha: 0.075);
    final code = _inviteCode;
    final link = _inviteLink;
    final qrUrl = link.isEmpty ? '' : buyerInviteQrImageUrl(link);
    final hasInvite = code.isNotEmpty && link.isNotEmpty;

    return ColoredBox(
      color: widget.surfaceColor,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 26),
              children: [
                const SizedBox(height: 4),
                Container(
                  height: 112,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: SizedBox.expand(
                      child: Stack(
                        children: [
                          Positioned(
                            right: -14,
                            top: -5,
                            bottom: -7,
                            width: 157,
                            child: ColorFiltered(
                              colorFilter: ColorFilter.mode(
                                widget.primaryColor,
                                BlendMode.hue,
                              ),
                              child: Image.asset(
                                'assets/images/invite-reward-art.png',
                                fit: BoxFit.contain,
                                alignment: Alignment.centerRight,
                                filterQuality: FilterQuality.high,
                              ),
                            ),
                          ),
                          Positioned.fill(
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(
                                15,
                                13,
                                135,
                                13,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Get Reward\nVouchers',
                                    maxLines: 2,
                                    style: TextStyle(
                                      color: textPrimary,
                                      fontSize: 20,
                                      height: 1.02,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 7),
                                  Text(
                                    'Earn a voucher for every successful referral.',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: textSecondary,
                                      fontSize: 9.5,
                                      height: 1.3,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildInviteMetricCard(
                      icon: Icons.groups_rounded,
                      value: '$_inviteReferred',
                      label: 'Friends joined',
                    ),
                    const SizedBox(width: 10),
                    _buildInviteMetricCard(
                      icon: Icons.payments_outlined,
                      value: '₱$_inviteEarned',
                      label: 'Earned',
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.fromLTRB(14, 18, 14, 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    children: [
                      qrUrl.isEmpty
                          ? SizedBox(
                              width: 176,
                              height: 176,
                              child: Center(
                                child: Text(
                                  'Invite unavailable',
                                  style: TextStyle(
                                    color: textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            )
                          : ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                qrUrl,
                                width: 176,
                                height: 176,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => SizedBox(
                                  width: 176,
                                  height: 176,
                                  child: Center(
                                    child: Text(
                                      code.isEmpty ? 'QR unavailable' : code,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: textSecondary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                      const SizedBox(height: 10),
                      Text(
                        'Scan this QR code or share your referral code',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: textSecondary,
                          fontSize: 11,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 11),
                      Material(
                        color: accentSurface,
                        borderRadius: BorderRadius.circular(13),
                        child: InkWell(
                          onTap: hasInvite ? _copyInviteCode : null,
                          borderRadius: BorderRadius.circular(13),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(12, 11, 10, 11),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    code.isEmpty ? '—' : code,
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: textPrimary,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                Icon(
                                  Icons.content_copy_rounded,
                                  color: accent,
                                  size: 21,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      FilledButton(
                        key: _inviteShareButtonKey,
                        onPressed: hasInvite && !_sendingInvite
                            ? _sendInviteLink
                            : null,
                        style: FilledButton.styleFrom(
                          backgroundColor: accent,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: accent.withValues(
                            alpha: 0.45,
                          ),
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 2,
                          shadowColor: accent.withValues(alpha: 0.35),
                        ),
                        child: _sendingInvite
                            ? const SkeletonCircle(size: 20)
                            : const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.ios_share_rounded, size: 21),
                                  SizedBox(width: 9),
                                  Text(
                                    'Send link',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.fromLTRB(12, 14, 12, 15),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'How it works',
                        style: TextStyle(
                          color: textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 13),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildInviteStep(
                            number: 1,
                            icon: Icons.share_rounded,
                            title: 'Share your code',
                            subtitle: 'Invite friends via QR code or link',
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 22),
                            child: Icon(
                              Icons.chevron_right_rounded,
                              size: 18,
                              color: accent.withValues(alpha: 0.28),
                            ),
                          ),
                          _buildInviteStep(
                            number: 2,
                            icon: Icons.person_add_alt_1_rounded,
                            title: 'Friend signs up',
                            subtitle: 'They create an account and order',
                          ),
                          Padding(
                            padding: const EdgeInsets.only(top: 22),
                            child: Icon(
                              Icons.chevron_right_rounded,
                              size: 18,
                              color: accent.withValues(alpha: 0.28),
                            ),
                          ),
                          _buildInviteStep(
                            number: 3,
                            icon: Icons.card_giftcard_rounded,
                            title: 'Both earn rewards',
                            subtitle: 'Rewards are added after the first order',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _voucherInkColor(Color accent) {
    if (accent.computeLuminance() <= 0.48) return accent;
    return Color.lerp(accent, const Color(0xFF0F172A), 0.48)!;
  }

  Color _voucherButtonForeground(Color accent) {
    return accent.computeLuminance() > 0.55
        ? const Color(0xFF111827)
        : Colors.white;
  }

  List<_BuyerVoucher> get _visibleVouchers {
    final query = _voucherSearchController.text.trim().toLowerCase();
    final matches = _vouchers.where((voucher) {
      if (voucher.status != _voucherStatus) return false;
      if (query.isEmpty) return true;
      return <String>[
        voucher.title,
        voucher.subtitle,
        voucher.code,
        voucher.badge,
      ].any((value) => value.toLowerCase().contains(query));
    }).toList();
    return _voucherNewestFirst ? matches : matches.reversed.toList();
  }

  _BuyerVoucherStatus _parseVoucherStatus(String value) {
    switch (value) {
      case 'used':
        return _BuyerVoucherStatus.used;
      case 'expired':
        return _BuyerVoucherStatus.expired;
      default:
        return _BuyerVoucherStatus.active;
    }
  }

  Future<void> _loadBuyerVouchers() async {
    if (_vouchersLoading) return;
    _vouchersLoading = true;
    try {
      final loaded = await fetchBuyerVouchers();
      if (!mounted || loaded.isEmpty) return;
      setState(() {
        _vouchers = loaded
            .map(
              (item) => _BuyerVoucher(
                status: _parseVoucherStatus(item.status),
                title: item.title,
                subtitle: item.subtitle,
                minimumSpend: item.minimumSpend,
                code: item.code,
                badge: item.badge,
                dateLabel: item.dateLabel,
                actionLabel: item.actionLabel,
                note: item.note,
                icon: item.icon,
                platformId: item.platformId,
                platformLabel: item.platformLabel,
              ),
            )
            .toList(growable: false);
      });
    } catch (_) {
      // Keep seeded vouchers when the API is unreachable.
    } finally {
      _vouchersLoading = false;
    }
  }

  Future<void> _copyVoucherCode(_BuyerVoucher voucher) async {
    if (voucher.status != _BuyerVoucherStatus.active) return;
    final currentPlatform = widget.platformId.trim().toLowerCase();
    final scoped = voucher.platformId.trim().toLowerCase();
    final mismatch =
        currentPlatform.isNotEmpty &&
        currentPlatform != 'none' &&
        currentPlatform != 'all' &&
        scoped.isNotEmpty &&
        scoped != 'all' &&
        scoped != currentPlatform;
    await Clipboard.setData(ClipboardData(text: voucher.code));
    if (!mounted) return;
    if (mismatch) {
      AppSnackBar.showSuccess(
        context,
        message:
            '${voucher.code} copied. Usable only on ${voucher.platformLabel}, not the current platform.',
      );
      return;
    }
    AppSnackBar.showSuccess(
      context,
      message:
          '${voucher.code} copied. Paste it at ${voucher.platformLabel} checkout.',
    );
  }

  Widget _buildVoucherStatusTab(_BuyerVoucherStatus status, String label) {
    final selected = _voucherStatus == status;
    final foreground = selected
        ? _voucherButtonForeground(widget.primaryColor)
        : widget.secondaryColor;
    return Expanded(
      child: Semantics(
        selected: selected,
        button: true,
        child: InkWell(
          onTap: () => setState(() => _voucherStatus = status),
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: appMotionFrames(10),
            curve: Curves.easeOutCubic,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? widget.primaryColor : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: widget.primaryColor.withValues(alpha: 0.24),
                        blurRadius: 9,
                        offset: const Offset(0, 3),
                      ),
                    ]
                  : null,
            ),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: foreground,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVoucherCard(_BuyerVoucher voucher) {
    final active = voucher.status == _BuyerVoucherStatus.active;
    final accent = active ? widget.primaryColor : widget.secondaryColor;
    final accentInk = active
        ? _voucherInkColor(widget.primaryColor)
        : widget.secondaryColor;
    const background = Colors.white;
    // Inherits the color configured through the Super Admin color picker.
    final artBackground = widget.primaryColor;
    final secondary = widget.secondaryColor;
    final badge = voucher.badge.trim();
    final eyebrow = badge.isEmpty || badge.toLowerCase() == 'sitewide'
        ? null
        : badge.toUpperCase();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: active ? () => _copyVoucherCode(voucher) : null,
        customBorder: const _VoucherTicketShapeBorder(),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            const Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(painter: _VoucherTicketShadowPainter()),
              ),
            ),
            PhysicalShape(
              clipper: const _VoucherTicketClipper(),
              clipBehavior: Clip.antiAlias,
              color: background,
              elevation: 0,
              shadowColor: Colors.transparent,
              child: SizedBox(
                height: 78,
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      color: artBackground,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.all(6),
                      child: SvgPicture.asset(
                        'assets/images/switch-logo.svg',
                        width: 28,
                        height: 28,
                        fit: BoxFit.contain,
                        colorFilter: const ColorFilter.mode(
                          Colors.white,
                          BlendMode.srcIn,
                        ),
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(0, 6, 12, 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (eyebrow != null) ...[
                              Text(
                                eyebrow,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: secondary.withValues(alpha: 0.9),
                                  fontSize: 6.6,
                                  height: 1,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2.5),
                            ],
                            Text(
                              voucher.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: accentInk,
                                fontSize: 16,
                                height: 1,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 3),
                            SizedBox(
                              height: 1,
                              width: double.infinity,
                              child: CustomPaint(
                                painter: _VoucherDividerPainter(
                                  color: accent.withValues(alpha: 0.28),
                                ),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Min. spend ${voucher.minimumSpend}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: secondary,
                                fontSize: 12,
                                height: 1,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 5),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    voucher.code,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: widget.titleColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  voucher.dateLabel,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: secondary,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVouchersView() {
    final vouchers = _visibleVouchers;
    final pageColor = Color.alphaBlend(
      widget.primaryColor.withValues(alpha: 0.035),
      widget.surfaceColor.a == 0 ? Colors.white : widget.surfaceColor,
    );

    return ColoredBox(
      color: pageColor,
      child: Column(
        children: [
          AnimatedSwitcher(
            duration: appMotionFrames(10),
            child: _voucherSearchOpen
                ? Padding(
                    key: const ValueKey<String>('voucher-search'),
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 9),
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        if (!_voucherSearchFocusNode.hasFocus) {
                          _voucherSearchFocusNode.requestFocus();
                        }
                      },
                      child: TextField(
                        controller: _voucherSearchController,
                        focusNode: _voucherSearchFocusNode,
                        autofocus: true,
                        onTapOutside: dismissSearchKeyboardOnTapOutside,
                        onChanged: (_) => setState(() {}),
                        style: TextStyle(
                          color: widget.titleColor,
                          fontSize: 12,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Search by offer or code',
                          hintStyle: TextStyle(
                            color: widget.secondaryColor,
                            fontSize: 12,
                          ),
                          prefixIcon: Icon(
                            Icons.search_rounded,
                            size: 18,
                            color: widget.secondaryColor,
                          ),
                          filled: true,
                          fillColor: Colors.white.withValues(alpha: 0.82),
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 10,
                          ),
                          constraints: const BoxConstraints.tightFor(height: 42),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(13),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(13),
                            borderSide: BorderSide(
                              color: widget.primaryColor.withValues(
                                alpha: 0.12,
                              ),
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(13),
                            borderSide: BorderSide(
                              color: widget.primaryColor,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                  )
                : const SizedBox.shrink(
                    key: ValueKey<String>('voucher-search-closed'),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 2, 10, 10),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: widget.secondaryColor.withValues(alpha: 0.075),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        _buildVoucherStatusTab(
                          _BuyerVoucherStatus.active,
                          'Active',
                        ),
                        _buildVoucherStatusTab(
                          _BuyerVoucherStatus.used,
                          'Used',
                        ),
                        _buildVoucherStatusTab(
                          _BuyerVoucherStatus.expired,
                          'Expired',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 7),
                IconButton.filledTonal(
                  tooltip: 'Reverse voucher order',
                  onPressed: () => setState(
                    () => _voucherNewestFirst = !_voucherNewestFirst,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: widget.secondaryColor.withValues(
                      alpha: 0.075,
                    ),
                    foregroundColor: _voucherNewestFirst
                        ? _voucherInkColor(widget.primaryColor)
                        : widget.secondaryColor,
                  ),
                  icon: const Icon(Icons.filter_list_rounded, size: 19),
                ),
              ],
            ),
          ),
          Expanded(
            child: vouchers.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.confirmation_number_outlined,
                            size: 42,
                            color: widget.primaryColor.withValues(alpha: 0.55),
                          ),
                          const SizedBox(height: 11),
                          Text(
                            'No vouchers found',
                            style: TextStyle(
                              color: widget.titleColor,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Try another tab or search term.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: widget.secondaryColor,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(14, 1, 14, 26),
                    itemCount: vouchers.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        _buildVoucherCard(vouchers[index]),
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSignOut() async {
    if (_signingOut) return;
    setState(() => _signingOut = true);
    try {
      await widget.onSignOut();
    } finally {
      if (mounted) {
        setState(() => _signingOut = false);
      }
    }
  }

  String _profilePhotoContentType(XFile image) {
    final mimeType = image.mimeType?.trim().toLowerCase() ?? '';
    if (mimeType.startsWith('image/')) return mimeType;
    final name = image.name.toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  Future<void> _changeProfilePhoto() async {
    if (_changingProfilePhoto) return;
    final image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 88,
      maxWidth: 1200,
    );
    if (image == null || !mounted) return;

    setState(() {
      _changingProfilePhoto = true;
      _profilePhotoFeedback = '';
    });

    try {
      final imageUrl = await _profilePhotoUploadService.uploadChatMedia(
        bytes: await image.readAsBytes(),
        fileName: image.name.trim().isEmpty ? 'profile-photo.jpg' : image.name,
        contentType: _profilePhotoContentType(image),
      );
      final updated = await _profileAccountService.updateProfileImage(
        accountId: widget.accountId,
        profileImageUrl: imageUrl,
      );
      await AuthSession.setUnifiedSession(updated.session);
      if (!mounted) return;
      setState(() {
        _profileImageUrl = imageUrl;
        _profilePhotoFeedback = 'Profile picture updated.';
      });
      widget.onProfileImageChanged?.call(imageUrl);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _profilePhotoFeedback = 'Unable to update the profile picture.';
      });
    } finally {
      if (mounted) {
        setState(() => _changingProfilePhoto = false);
      }
    }
  }

  Widget _buildAvatar({double size = 46}) {
    final imageUrl = _profileImageUrl.trim();
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            widget.primaryColor,
            Color.lerp(widget.primaryColor, const Color(0xFF0F172A), 0.28) ??
                widget.primaryColor,
          ],
        ),
      ),
      child: Text(
        widget.initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.28,
          fontWeight: FontWeight.w800,
        ),
      ),
    );

    if (imageUrl.isEmpty) return fallback;

    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          placeholder: (_, __) => fallback,
          errorWidget: (_, __, ___) => fallback,
        ),
      ),
    );
  }

  static const Color _dividerColor = Color(0xFFE2E8F0);

  Widget _fullWidthDivider() {
    return const ColoredBox(
      color: _dividerColor,
      child: SizedBox(width: double.infinity, height: 1),
    );
  }

  /// Full-bleed row: hairline spans entire sidebar width (like Messenger list).
  Widget _navLink({
    IconData? icon,
    String? iconSvg,
    required String label,
    required VoidCallback onTap,
    Widget? labelWidget,
    bool showChevron = true,
    bool danger = false,
  }) {
    assert(icon != null || iconSvg != null);
    final accent = danger ? const Color(0xFFDC2626) : widget.secondaryColor;
    final textColor = danger
        ? const Color(0xFFDC2626)
        : const Color(0xFF334155);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          child: SizedBox(
            height: 52,
            child: Row(
              children: [
                SizedBox(
                  width: 36,
                  child: iconSvg != null
                      ? Center(
                          child: SvgPicture.string(
                            iconSvg,
                            width: 22,
                            height: 22,
                            colorFilter: ColorFilter.mode(
                              accent,
                              BlendMode.srcIn,
                            ),
                          ),
                        )
                      : Icon(
                          icon ?? Icons.help_outline_rounded,
                          size: 22,
                          color: accent,
                        ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child:
                      labelWidget ??
                      Text(
                        label,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                ),
                if (showChevron)
                  Icon(Icons.chevron_right_rounded, size: 18, color: accent),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navGroup(List<Widget> links) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _fullWidthDivider(),
        for (var i = 0; i < links.length; i++) ...[
          links[i],
          _fullWidthDivider(),
        ],
      ],
    );
  }

  Widget _profileDetailRow(
    String label,
    String value, {
    bool showDivider = true,
  }) {
    final isExpanded = _expandedProfileField == label;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              setState(() {
                // Accordion: name open → tap email closes name (only one open).
                _expandedProfileField = isExpanded ? null : label;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(
                        color: widget.titleColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  AnimatedRotation(
                    turns: isExpanded ? 0.25 : 0,
                    duration: appMotionFrames(10),
                    curve: Curves.easeOutCubic,
                    child: Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: widget.secondaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (isExpanded)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Text(
              value.trim().isEmpty ? '—' : value,
              style: TextStyle(
                color: widget.secondaryColor,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        if (showDivider) _fullWidthDivider(),
      ],
    );
  }

  Widget _buildMenuView() {
    return ListView(
      // No horizontal padding on list — nav dividers stay full-bleed.
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 24),
      children: [
        // Match the solid white + two-layer shadow of the focused search field.
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.transparent),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x66000000),
                  blurRadius: 1,
                  offset: Offset(0, 1),
                ),
                BoxShadow(
                  color: Color(0x0D000000),
                  blurRadius: 4,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => _openView(BuyerAccountPanelView.profileHub),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
                        child: Row(
                          children: [
                            _buildAvatar(),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.displayName.trim().isEmpty
                                        ? 'Account'
                                        : widget.displayName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: widget.titleColor,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (widget.email.trim().isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      widget.email,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: widget.secondaryColor,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w400,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            Icon(
                              Icons.chevron_right_rounded,
                              size: 18,
                              color: widget.secondaryColor,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const ColoredBox(
                    color: _dividerColor,
                    child: SizedBox(width: double.infinity, height: 1),
                  ),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => _openView(
                        _hasSellerAdminAccess
                            ? BuyerAccountPanelView.companies
                            : BuyerAccountPanelView.seller,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 2,
                        ),
                        child: SizedBox(
                          height: 52,
                          child: Row(
                            children: [
                              SizedBox(
                                width: 36,
                                child: Center(
                                  child: SvgPicture.string(
                                    _hasSellerAdminAccess
                                        ? _lucideBuildingIconSvg
                                        : _lucideHandshakeIconSvg,
                                    width: 22,
                                    height: 22,
                                    colorFilter: ColorFilter.mode(
                                      widget.secondaryColor,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _hasSellerAdminAccess
                                    ? Text(
                                        'Companies',
                                        style: TextStyle(
                                          color: widget.titleColor,
                                          fontSize: 16,
                                          fontWeight: FontWeight.w400,
                                        ),
                                      )
                                    : Text.rich(
                                        TextSpan(
                                          children: [
                                            const TextSpan(
                                              text: 'Be Part of ',
                                              style: TextStyle(
                                                color: Color(0xFF334155),
                                                fontSize: 16,
                                                fontWeight: FontWeight.w400,
                                              ),
                                            ),
                                            TextSpan(
                                              text: 'Switch',
                                              style: TextStyle(
                                                color: widget.primaryColor,
                                                fontSize: 16,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                              ),
                              Icon(
                                Icons.chevron_right_rounded,
                                size: 18,
                                color: widget.secondaryColor,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(17, 14, 17, 12),
          child: Text(
            'Manage your personal information, security, preferences, and account.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 12,
              height: 1.55,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
        _navGroup([
          _navLink(
            iconSvg: _lucideUserPlusIconSvg,
            label: 'Invite a friend',
            onTap: () => _openView(BuyerAccountPanelView.invite),
          ),
          _navLink(
            iconSvg: _lucideTicketIconSvg,
            label: 'Vouchers',
            onTap: () => _openView(BuyerAccountPanelView.vouchers),
          ),
          _navLink(
            iconSvg: _lucideHeartIconSvg,
            label: 'Favorites',
            onTap: () => _openView(BuyerAccountPanelView.favorites),
          ),
          if (widget.platformId.trim().isNotEmpty &&
              widget.platformId.trim().toLowerCase() != 'none')
            _navLink(
              iconSvg: _lucideHistoryIconSvg,
              label: 'Recent activity',
              onTap: () => _openView(BuyerAccountPanelView.activity),
            ),
          _navLink(
            iconSvg: _lucideMessageSquareIconSvg,
            label: 'Feedback',
            onTap: () => _openView(BuyerAccountPanelView.feedback),
          ),
        ]),
        const SizedBox(height: 8),
        _navGroup([
          _navLink(
            iconSvg: _lucideGlobeIconSvg,
            label: 'Language',
            labelWidget: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Language',
                    style: TextStyle(
                      color: Color(0xFF334155),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  _languageLabel,
                  style: TextStyle(
                    color: widget.secondaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            onTap: () => _openView(BuyerAccountPanelView.preferences),
          ),
        ]),
        const SizedBox(height: 16),
        _fullWidthDivider(),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _signingOut ? null : _handleSignOut,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: SizedBox(
                height: 52,
                child: Row(
                  children: [
                    SizedBox(
                      width: 36,
                      child: Center(
                        child: SvgPicture.string(
                          _lucideLogOutIconSvg,
                          width: 22,
                          height: 22,
                          colorFilter: const ColorFilter.mode(
                            Color(0xFFDC2626),
                            BlendMode.srcIn,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _signingOut ? 'Signing out…' : 'Sign out',
                        style: const TextStyle(
                          color: Color(0xFFDC2626),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        _fullWidthDivider(),
      ],
    );
  }

  Widget _buildProfileHubView() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(17, 8, 17, 12),
          child: Text(
            'Choose what you want to manage for this account.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 12,
              height: 1.55,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
        _navGroup([
          _navLink(
            iconSvg: _lucideUserRoundIconSvg,
            label: 'Personal information',
            onTap: () => _openView(BuyerAccountPanelView.profile),
          ),
          _navLink(
            iconSvg: _lucideLockKeyholeIconSvg,
            label: 'Login & security',
            onTap: () => _openView(BuyerAccountPanelView.security),
          ),
          _navLink(
            iconSvg: _lucideCreditCardIconSvg,
            label: 'Payment method',
            onTap: () => _openView(BuyerAccountPanelView.payment),
          ),
          _navLink(
            iconSvg: _lucideMapPinIconSvg,
            label: 'Address',
            onTap: _openSelectAddressAndClose,
          ),
        ]),
        const SizedBox(height: 8),
        _navGroup([
          _navLink(
            iconSvg: _lucideTrashIconSvg,
            label: 'Delete account',
            onTap: () => _openView(BuyerAccountPanelView.account),
            danger: true,
          ),
        ]),
      ],
    );
  }

  Widget _buildProfileView() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Center(
          child: Column(
            children: [
              Semantics(
                button: true,
                label: 'Change profile picture',
                child: GestureDetector(
                  onTap: _changingProfilePhoto ? null : _changeProfilePhoto,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      _buildAvatar(size: 94),
                      Positioned(
                        right: -2,
                        bottom: 2,
                        child: Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: widget.primaryColor,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.16),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: _changingProfilePhoto
                              ? const Padding(
                                  padding: EdgeInsets.all(7),
                                  child: SkeletonCircle(size: 20),
                                )
                              : const Icon(
                                  Icons.camera_alt_outlined,
                                  color: Colors.white,
                                  size: 16,
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _changingProfilePhoto ? null : _changeProfilePhoto,
                child: Text(
                  _changingProfilePhoto
                      ? 'Uploading…'
                      : 'Change profile picture',
                  style: TextStyle(
                    color: widget.primaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (_profilePhotoFeedback.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    _profilePhotoFeedback,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _profilePhotoFeedback.startsWith('Unable')
                          ? const Color(0xFFDC2626)
                          : const Color(0xFF047857),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE7ECF3)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: 0.08),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _profileDetailRow('Name', widget.displayName),
                _profileDetailRow('Email', widget.email),
                _profileDetailRow('Phone', widget.phone),
                _profileDetailRow(
                  'Account ID',
                  widget.accountId,
                  showDivider: false,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _loadAccountDevices() async {
    final accountId = widget.accountId.trim();
    if (accountId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _devices = const <AccountDevice>[];
        _devicesError = 'Sign in again to manage devices.';
        _devicesLoading = false;
      });
      return;
    }
    setState(() {
      _devicesLoading = true;
      _devicesError = '';
    });
    try {
      final result = await _accountDevicesService.registerAndList(
        accountId: accountId,
        email: widget.email,
      );
      if (!mounted) return;
      setState(() {
        _devices = result.devices;
        _devicesLoading = false;
        _devicesError = '';
      });
    } catch (error) {
      if (!mounted) return;
      final message = error.toString().replaceFirst('Exception: ', '');
      if (message.toLowerCase().contains('signed out')) {
        await widget.onSignOut();
        return;
      }
      setState(() {
        _devicesLoading = false;
        _devicesError = message;
      });
    }
  }

  String _formatDeviceActiveLabel(AccountDevice device) {
    if (device.isCurrent) return 'Active now';
    final raw = (device.lastActiveAt ?? device.createdAt ?? '').trim();
    if (raw.isEmpty) return 'Recently active';
    final parsed = DateTime.tryParse(raw)?.toLocal();
    if (parsed == null) return 'Recently active';
    final diff = DateTime.now().difference(parsed);
    if (diff.inMinutes < 1) return 'Active just now';
    if (diff.inMinutes < 60) return 'Active ${diff.inMinutes}m ago';
    if (diff.inHours < 24) return 'Active ${diff.inHours}h ago';
    if (diff.inDays < 7) return 'Active ${diff.inDays}d ago';
    final mm = parsed.month.toString().padLeft(2, '0');
    final dd = parsed.day.toString().padLeft(2, '0');
    return 'Active $mm/$dd/${parsed.year}';
  }

  String _deviceIconSvg(AccountDevice device) {
    if (device.isPhone) return _lucideSmartphoneIconSvg;
    if (device.isTablet) return _lucideTabletIconSvg;
    final client = device.clientName.toLowerCase();
    if (client.contains('chrome')) return _lucideChromeIconSvg;
    return _lucideMonitorIconSvg;
  }

  String _deviceArtAsset(AccountDevice device) {
    final platform = '${device.deviceName} ${device.osName}'.toLowerCase();
    if (device.isComputer) return 'assets/images/device-monitor-art.png';
    if (platform.contains('ios') ||
        platform.contains('iphone') ||
        platform.contains('ipad')) {
      return 'assets/images/device-ios-art.png';
    }
    return 'assets/images/device-android-art.png';
  }

  bool _isAccountDeviceActive(AccountDevice device) {
    if (device.isCurrent) return true;
    final raw = (device.lastActiveAt ?? device.createdAt ?? '').trim();
    final parsed = DateTime.tryParse(raw)?.toLocal();
    if (parsed == null) return false;
    return DateTime.now().difference(parsed).inHours < 24;
  }

  String _formatDeviceDateTimeLabel(AccountDevice device) {
    final raw = (device.lastActiveAt ?? device.createdAt ?? '').trim();
    final parsed = DateTime.tryParse(raw)?.toLocal();
    if (parsed == null) return 'Not available';
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final hour = parsed.hour % 12 == 0 ? 12 : parsed.hour % 12;
    final minute = parsed.minute.toString().padLeft(2, '0');
    final period = parsed.hour >= 12 ? 'PM' : 'AM';
    return '${months[parsed.month - 1]} ${parsed.day}, ${parsed.year} · $hour:$minute $period';
  }

  String _deviceRowKey(AccountDevice device) {
    if (device.id.trim().isNotEmpty) return device.id.trim();
    if (device.deviceKey.trim().isNotEmpty) return device.deviceKey.trim();
    return '${device.deviceName}-${device.createdAt ?? ''}';
  }

  Widget _buildDeviceArt(AccountDevice device) {
    return SizedBox(
      width: 58,
      height: 64,
      child: Image.asset(
        _deviceArtAsset(device),
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
        errorBuilder: (context, error, stackTrace) {
          return Center(
            child: SvgPicture.string(
              _deviceIconSvg(device),
              width: 28,
              height: 28,
              colorFilter: ColorFilter.mode(
                widget.primaryColor,
                BlendMode.srcIn,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDeviceStatusPill(AccountDevice device) {
    final isActive = _isAccountDeviceActive(device);
    final color = device.isCurrent
        ? widget.primaryColor
        : (isActive ? const Color(0xFF16845A) : const Color(0xFF64748B));
    final background = device.isCurrent
        ? widget.primaryColor
        : (isActive ? const Color(0xFFE9F9EF) : const Color(0xFFF1F5F9));
    final label = device.isCurrent
        ? 'Current Device'
        : (isActive ? 'Active' : 'Inactive');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: device.isCurrent ? const Color(0xFFC8F7EA) : color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: device.isCurrent ? Colors.white : color,
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _deviceDetailLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 112,
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Color(0xFF334155),
                fontSize: 10.5,
                height: 1.35,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _revokeAccountDevice(AccountDevice device) async {
    if (_devicesBusy || device.isCurrent) return;
    final accountId = widget.accountId.trim();
    if (accountId.isEmpty || device.id.trim().isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Sign out device?'),
          content: Text(
            '${device.deviceName} will be signed out right away. The saved sign-in on that phone, computer, or Apple device will be removed.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Sign out'),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !mounted) return;

    setState(() => _devicesBusy = true);
    try {
      final result = await _accountDevicesService.revokeDevice(
        accountId: accountId,
        deviceId: device.id,
        deviceKey: device.deviceKey,
      );
      if (!mounted) return;
      setState(() {
        _devices = result.devices;
        _devicesBusy = false;
      });
      AppSnackBar.showSuccess(context, message: 'Device signed out.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _devicesBusy = false);
      AppSnackBar.showError(
        context,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> _revokeOtherAccountDevices() async {
    if (_devicesBusy) return;
    final accountId = widget.accountId.trim();
    if (accountId.isEmpty) return;
    final others = _devices.where((device) => !device.isCurrent).length;
    if (others <= 0) {
      AppSnackBar.showSuccess(
        context,
        message: 'No other devices to sign out.',
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Sign out other devices?'),
          content: Text(
            'This signs out $others other device${others == 1 ? '' : 's'}. You stay signed in here.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Sign out others'),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !mounted) return;
    setState(() => _devicesBusy = true);
    try {
      final result = await _accountDevicesService.revokeOtherDevices(
        accountId: accountId,
      );
      if (!mounted) return;
      setState(() {
        _devices = result.devices;
        _devicesBusy = false;
      });
      AppSnackBar.showSuccess(context, message: 'Other devices signed out.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _devicesBusy = false);
      AppSnackBar.showError(
        context,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Widget _buildDevicesView() {
    final hasOthers = _devices.any((device) => !device.isCurrent);
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Text(
          'Review the phones and computers signed in to your account, together with their location and latest login activity.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 12,
            height: 1.55,
            fontWeight: FontWeight.w400,
          ),
        ),
        const SizedBox(height: 14),
        if (_devicesLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 28),
            child: SkeletonListRows(count: 4),
          )
        else if (_devicesError.isNotEmpty)
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _devicesError,
                style: const TextStyle(
                  color: Color(0xFFDC2626),
                  fontSize: 12,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: _devicesBusy ? null : _loadAccountDevices,
                child: Text(
                  'Try again',
                  style: TextStyle(
                    color: widget.primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          )
        else if (_devices.isEmpty)
          Text(
            'No signed-in devices yet. Open this page again after signing in on another phone or browser.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 12,
              height: 1.55,
            ),
          )
        else ...[
          for (var i = 0; i < _devices.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            _buildDeviceRow(_devices[i]),
          ],
          if (hasOthers) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: _devicesBusy ? null : _revokeOtherAccountDevices,
              style: OutlinedButton.styleFrom(
                foregroundColor: widget.primaryColor,
                side: BorderSide(
                  color: widget.primaryColor.withValues(alpha: 0.35),
                ),
                minimumSize: const Size.fromHeight(42),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                _devicesBusy ? 'Working…' : 'Sign out other devices',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ],
      ],
    );
  }

  Widget _buildDeviceRow(AccountDevice device) {
    final rowKey = _deviceRowKey(device);
    final isExpanded = _expandedDeviceIds.contains(rowKey);
    final location = device.locationLabel.trim().isEmpty
        ? 'Location unavailable'
        : device.locationLabel.trim();
    final subtitle = device.subtitle.trim().isEmpty
        ? 'Switch session'
        : device.subtitle.trim();
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: device.isCurrent
            ? widget.primaryColor.withValues(alpha: 0.055)
            : Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: device.isCurrent
              ? widget.primaryColor.withValues(alpha: 0.42)
              : const Color(0xFFE3E9EF),
        ),
        boxShadow: [
          BoxShadow(
            color: device.isCurrent
                ? widget.primaryColor.withValues(alpha: 0.08)
                : const Color(0xFF0F172A).withValues(alpha: 0.035),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDeviceArt(device),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        device.deviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: widget.titleColor,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: widget.secondaryColor,
                          fontSize: 10.5,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: 12,
                            color: widget.secondaryColor,
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              location,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: widget.secondaryColor,
                                fontSize: 10.5,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.schedule_rounded,
                            size: 12,
                            color: device.isCurrent
                                ? widget.primaryColor
                                : widget.secondaryColor,
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              _formatDeviceActiveLabel(device),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: device.isCurrent
                                    ? widget.primaryColor
                                    : widget.secondaryColor,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 7),
                _buildDeviceStatusPill(device),
              ],
            ),
            const SizedBox(height: 10),
            Center(
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    if (isExpanded) {
                      _expandedDeviceIds.remove(rowKey);
                    } else {
                      _expandedDeviceIds.add(rowKey);
                    }
                  });
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF4F6474),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  minimumSize: const Size(0, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isExpanded ? 'Hide Details' : 'View Details',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 2),
                    AnimatedRotation(
                      turns: isExpanded ? 0.25 : 0,
                      duration: const Duration(milliseconds: 180),
                      child: const Icon(Icons.chevron_right_rounded, size: 15),
                    ),
                  ],
                ),
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                return SizeTransition(
                  sizeFactor: animation,
                  axisAlignment: -1,
                  child: FadeTransition(opacity: animation, child: child),
                );
              },
              child: isExpanded
                  ? Container(
                      key: ValueKey<String>('details-$rowKey'),
                      width: double.infinity,
                      margin: const EdgeInsets.only(top: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC).withValues(alpha: 0.8),
                        border: const Border(
                          top: BorderSide(color: Color(0xFFE8EDF2)),
                        ),
                        borderRadius: const BorderRadius.vertical(
                          bottom: Radius.circular(10),
                        ),
                      ),
                      child: Column(
                        children: [
                          _deviceDetailLine('Device', device.deviceName),
                          _deviceDetailLine('Platform', subtitle),
                          _deviceDetailLine('Location', location),
                          _deviceDetailLine(
                            'Last login activity',
                            _formatDeviceDateTimeLabel(device),
                          ),
                        ],
                      ),
                    )
                  : SizedBox(
                      key: ValueKey<String>('closed-$rowKey'),
                      width: double.infinity,
                    ),
            ),
            if (!device.isCurrent) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: _devicesBusy
                      ? null
                      : () => _revokeAccountDevice(device),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    backgroundColor: const Color(0xFFFEF2F2),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    minimumSize: const Size.fromHeight(36),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Sign Out',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSecurityView() {
    final hasPhone = widget.phone.trim().isNotEmpty;
    return ListView(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(17, 8, 17, 12),
          child: Text(
            'Manage sign-in and verification for this account.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 12,
              height: 1.55,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(17, 0, 17, 14),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusPill(
                label: hasPhone ? 'Phone: on file' : 'Phone: not verified',
                ok: hasPhone,
              ),
            ],
          ),
        ),
        _navGroup([
          _navLink(
            iconSvg: _lucideKeyRoundIconSvg,
            label: 'Password',
            onTap: () => _openView(BuyerAccountPanelView.password),
          ),
          _navLink(
            iconSvg: _lucideShieldCheckIconSvg,
            label: 'Two-factor authenticator',
            onTap: () => _openView(BuyerAccountPanelView.twoFactor),
          ),
          _navLink(
            iconSvg: _lucideLinkIconSvg,
            label: 'Account links',
            onTap: () => _openView(BuyerAccountPanelView.accountLinks),
          ),
          _navLink(
            iconSvg: _lucideSmartphoneIconSvg,
            label: 'Devices',
            onTap: () => _openView(BuyerAccountPanelView.devices),
          ),
        ]),
      ],
    );
  }

  Widget _buildPasswordView() {
    final email = widget.email.trim();
    if (_changePasswordFormOpen) {
      return _buildChangePasswordForm();
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Text(
          'Change the password you use to sign in to Switch.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 12,
            height: 1.55,
            fontWeight: FontWeight.w400,
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: email.isEmpty
              ? null
              : () {
                  setState(() => _changePasswordFormOpen = true);
                },
          style: FilledButton.styleFrom(
            backgroundColor: widget.primaryColor,
            foregroundColor: Colors.white,
            disabledBackgroundColor: const Color(0xFFE2E8F0),
            disabledForegroundColor: const Color(0xFF94A3B8),
            minimumSize: const Size.fromHeight(42),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Change password',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
        if (email.isEmpty) ...[
          const SizedBox(height: 10),
          Text(
            'Add an email to this account before changing your password.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 12,
              height: 1.45,
            ),
          ),
        ],
      ],
    );
  }

  String? _validateCurrentPassword(String? value) {
    if ((value ?? '').trim().isEmpty) {
      return 'Enter your current password.';
    }
    return null;
  }

  String _changePasswordErrorMessage() {
    return _validateCurrentPassword(_currentPasswordController.text) ??
        ErrorValidation.validatePassword(_newPasswordController.text) ??
        ErrorValidation.validateConfirmPassword(
          _confirmPasswordController.text,
          password: _newPasswordController.text,
        ) ??
        'Please check your password details.';
  }

  Future<void> _handleChangePasswordSubmit() async {
    if (_changePasswordSubmitting) return;
    FocusManager.instance.primaryFocus?.unfocus();

    setState(() => _changePasswordAutovalidate = true);
    final isValid = _changePasswordFormKey.currentState?.validate() ?? false;
    if (!isValid) {
      AppSnackBar.showError(context, message: _changePasswordErrorMessage());
      return;
    }

    final accountId = widget.accountId.trim();
    if (accountId.isEmpty || accountId == '—') {
      AppSnackBar.showError(
        context,
        message: 'Unable to update password. Sign in again and try once more.',
      );
      return;
    }

    setState(() => _changePasswordSubmitting = true);
    try {
      final message = await _profileAccountService.changePassword(
        accountId: accountId,
        email: widget.email.trim(),
        currentPassword: _currentPasswordController.text,
        newPassword: _newPasswordController.text,
        confirmPassword: _confirmPasswordController.text,
      );
      if (!mounted) return;
      setState(_resetChangePasswordForm);
      AppSnackBar.showSuccess(
        context,
        message: message.isNotEmpty
            ? message
            : 'Password updated successfully.',
      );
    } on UnifiedAccountServiceException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: 'Unable to change password. Try again.',
      );
    } finally {
      if (mounted && _changePasswordSubmitting) {
        setState(() => _changePasswordSubmitting = false);
      }
    }
  }

  InputDecoration _passwordFieldDecoration({
    required String label,
    required bool obscured,
    required VoidCallback onToggle,
  }) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: Colors.white,
      errorStyle: appInputBorderOnlyErrorStyle,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: widget.primaryColor, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: appInputErrorColor),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: appInputErrorColor, width: 1.5),
      ),
      suffixIcon: IconButton(
        onPressed: onToggle,
        icon: PasswordVisibilityIcon(obscured: obscured),
      ),
    );
  }

  Widget _buildChangePasswordForm() {
    return Form(
      key: _changePasswordFormKey,
      autovalidateMode: _changePasswordAutovalidate
          ? AutovalidateMode.onUserInteraction
          : AutovalidateMode.disabled,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          Text(
            'Enter your current password, then choose a new one.',
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 13,
              height: 1.55,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _currentPasswordController,
            obscureText: _obscureCurrentPassword,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.password],
            validator: _validateCurrentPassword,
            decoration: _passwordFieldDecoration(
              label: 'Current password',
              obscured: _obscureCurrentPassword,
              onToggle: () {
                setState(
                  () => _obscureCurrentPassword = !_obscureCurrentPassword,
                );
              },
            ),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _newPasswordController,
            obscureText: _obscureNewPassword,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.newPassword],
            validator: ErrorValidation.validatePassword,
            onChanged: (_) {
              if (_changePasswordAutovalidate) {
                _changePasswordFormKey.currentState?.validate();
              }
            },
            decoration: _passwordFieldDecoration(
              label: 'New password',
              obscured: _obscureNewPassword,
              onToggle: () {
                setState(() => _obscureNewPassword = !_obscureNewPassword);
              },
            ),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirmPassword,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.newPassword],
            validator: (value) => ErrorValidation.validateConfirmPassword(
              value,
              password: _newPasswordController.text,
            ),
            onFieldSubmitted: (_) => _handleChangePasswordSubmit(),
            decoration: _passwordFieldDecoration(
              label: 'Confirm password',
              obscured: _obscureConfirmPassword,
              onToggle: () {
                setState(
                  () => _obscureConfirmPassword = !_obscureConfirmPassword,
                );
              },
            ),
          ),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: _changePasswordSubmitting
                ? null
                : _handleChangePasswordSubmit,
            style: FilledButton.styleFrom(
              backgroundColor: widget.primaryColor,
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFFE2E8F0),
              disabledForegroundColor: const Color(0xFF94A3B8),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              _changePasswordSubmitting ? 'Updating…' : 'Update password',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _loadAccountConnections() async {
    final accountId = widget.accountId.trim();
    final email = widget.email.trim();
    if (accountId.isEmpty && email.isEmpty) return;
    if (!mounted) return;
    setState(() {
      _accountConnectionsLoading = true;
      _accountConnectionsError = '';
    });
    try {
      final result = await _profileAccountService.fetchSession(
        accountId: accountId.isEmpty || accountId == '—' ? null : accountId,
        email: email.isEmpty ? null : email,
      );
      final accountRaw = result.session['account'];
      final account = accountRaw is Map<String, dynamic>
          ? accountRaw
          : accountRaw is Map
          ? Map<String, dynamic>.from(accountRaw)
          : result.session;

      Map<String, dynamic> asMap(dynamic value) {
        if (value is Map<String, dynamic>) return value;
        if (value is Map) return Map<String, dynamic>.from(value);
        return const <String, dynamic>{};
      }

      String firstText(Map<String, dynamic> source, List<String> keys) {
        for (final key in keys) {
          final value = source[key]?.toString().trim() ?? '';
          if (value.isNotEmpty) return value;
        }
        return '';
      }

      final provider = firstText(account, const [
        'authProvider',
        'signInProvider',
        'identityProvider',
      ]).toLowerCase();
      final googleProfile = asMap(account['googleProfile']);
      final googleBindingRaw =
          account['gmailBinding'] ?? account['googleBinding'];
      final googleBinding = asMap(googleBindingRaw);
      final googleBindingEmail = googleBindingRaw is String
          ? googleBindingRaw.trim()
          : firstText(googleBinding, const ['email', 'accountEmail']);
      final googleEmail = googleBindingEmail.isNotEmpty
          ? googleBindingEmail
          : firstText(googleProfile, const ['email', 'accountEmail']);
      final googleConnected =
          googleEmail.isNotEmpty ||
          firstText(googleProfile, const ['subject', 'sub', 'id']).isNotEmpty ||
          firstText(account, const ['googleSubject']).isNotEmpty ||
          provider == 'google' ||
          provider == 'google.com';

      final facebookProfile = asMap(account['facebookProfile']);
      final facebookBindingRaw = account['facebookBinding'];
      final facebookBinding = asMap(facebookBindingRaw);
      final facebookBindingEmail = facebookBindingRaw is String
          ? facebookBindingRaw.trim()
          : firstText(facebookBinding, const ['email', 'accountEmail']);
      final facebookEmail = facebookBindingEmail.isNotEmpty
          ? facebookBindingEmail
          : firstText(facebookProfile, const ['email', 'accountEmail']);
      final facebookConnected =
          facebookEmail.isNotEmpty ||
          firstText(facebookProfile, const ['subject', 'id']).isNotEmpty ||
          provider == 'facebook' ||
          provider == 'facebook.com';

      if (!mounted) return;
      setState(() {
        _googleConnected = googleConnected;
        _googleConnectionEmail = googleEmail;
        _facebookConnected = facebookConnected;
        _facebookConnectionEmail = facebookEmail;
        _accountConnectionsLoading = false;
        _accountConnectionsError = '';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _accountConnectionsLoading = false;
        _accountConnectionsError = error.toString().replaceFirst(
          'Exception: ',
          '',
        );
      });
    }
  }

  Widget _buildAccountConnectionTile({
    required String label,
    required String detail,
    required bool connected,
    required Widget icon,
    bool showDisconnect = false,
  }) {
    final statusColor = connected
        ? const Color(0xFF16845A)
        : const Color(0xFF64748B);
    final statusBackground = connected
        ? const Color(0xFFE7F8EE)
        : const Color(0xFFF1F5F9);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE7ECF2)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.045),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: () {
                final message = connected
                    ? '$label is connected${detail.isNotEmpty ? ' as $detail' : ''}.'
                    : '$label is not connected to this account.';
                if (connected) {
                  AppSnackBar.showSuccess(context, message: message);
                } else {
                  AppSnackBar.showError(context, message: message);
                }
              },
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
                child: Row(
                  children: [
                    SizedBox(width: 38, height: 38, child: Center(child: icon)),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              color: widget.titleColor,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            detail.isEmpty
                                ? 'Not linked to this account'
                                : detail,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: widget.secondaryColor,
                              fontSize: 10.5,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: statusBackground,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        connected ? 'Connected' : 'Not connected',
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: widget.secondaryColor,
                    ),
                  ],
                ),
              ),
            ),
            if (showDisconnect && connected)
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                child: Container(
                  width: double.infinity,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Disconnect',
                    style: TextStyle(
                      color: Color(0xFF334155),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountLinksView() {
    final email = widget.email.trim();
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Text(
          'Connect your accounts for faster login and a better experience.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 11.5,
            height: 1.55,
            fontWeight: FontWeight.w400,
          ),
        ),
        const SizedBox(height: 18),
        if (_accountConnectionsLoading) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 3,
              color: widget.primaryColor,
              backgroundColor: widget.primaryColor.withValues(alpha: 0.1),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _buildAccountConnectionTile(
          label: 'Email',
          detail: email,
          connected: email.isNotEmpty,
          icon: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: widget.primaryColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.mail_outline_rounded,
              size: 20,
              color: widget.primaryColor,
            ),
          ),
        ),
        _buildAccountConnectionTile(
          label: 'Google',
          detail: _googleConnectionEmail,
          connected: _googleConnected,
          showDisconnect: true,
          icon: Image.asset(
            'assets/images/google_logo.png',
            width: 30,
            height: 30,
            fit: BoxFit.contain,
          ),
        ),
        _buildAccountConnectionTile(
          label: 'Facebook',
          detail: _facebookConnectionEmail,
          connected: _facebookConnected,
          showDisconnect: true,
          icon: Image.asset(
            'assets/images/facebook_logo.png',
            width: 32,
            height: 32,
            fit: BoxFit.contain,
          ),
        ),
        if (_accountConnectionsError.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(
            'Connection status could not be refreshed. Showing saved account details.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: widget.secondaryColor,
              fontSize: 10.5,
              height: 1.4,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPreferencesView() {
    final selected = AppLoginLanguages.normalize(AppLanguagePreference.code);
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
      itemCount: AppLoginLanguages.options.length,
      itemBuilder: (context, index) {
        final option = AppLoginLanguages.options[index];
        final isSelected = option.code == selected;
        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => unawaited(_selectLanguage(option.code)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: SizedBox(
                height: 52,
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: isSelected
                            ? widget.primaryColor.withValues(alpha: 0.12)
                            : const Color(0xFFF1F5F9),
                      ),
                      child: Text(
                        option.code.toUpperCase(),
                        style: TextStyle(
                          color: isSelected
                              ? widget.primaryColor
                              : widget.secondaryColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        option.label,
                        style: TextStyle(
                          color: widget.titleColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    if (isSelected)
                      Icon(
                        Icons.check_rounded,
                        size: 22,
                        color: widget.primaryColor,
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _selectLanguage(String code) async {
    final next = await AppLanguagePreference.setLanguage(code);
    if (!mounted) return;
    setState(() {
      _languageLabel = AppLoginLanguages.labelFor(next);
    });
  }

  Widget _buildAccountView() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Text(
          'Delete account',
          style: TextStyle(
            color: widget.titleColor,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Permanently delete your Switch buyer account. This cannot be undone. Contact support if you need to close your account.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 12,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 14),
        FilledButton(
          onPressed: () => _openView(BuyerAccountPanelView.feedback),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFDC2626),
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(42),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Request account deletion',
            style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildSellerView() {
    const steps = <String>[
      'Choose Free or a paid plan (paid plans unlock the Legit badge)',
      'Register Visa / Mastercard (paid plans only)',
      'Create a Switch PIN',
      'Verify email or phone if needed',
      'Company name, business type & photo',
      'Enter Switch PIN to open seller admin',
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
      children: [
        Text(
          'Be Part of Switch',
          style: TextStyle(
            color: widget.titleColor,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Start on Free, or pick a paid plan for the Legit seller badge on original products. Create a Switch PIN, then set up your company.',
          style: TextStyle(
            color: widget.secondaryColor,
            fontSize: 12,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 14),
        for (var i = 0; i < steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${i + 1}.',
                  style: TextStyle(
                    color: widget.secondaryColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    steps[i],
                    style: TextStyle(
                      color: widget.titleColor,
                      fontSize: 13,
                      height: 1.4,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 14),
        FilledButton(
          onPressed: () {
            unawaited(_startSellerUpgrade());
          },
          style: FilledButton.styleFrom(
            backgroundColor: widget.primaryColor,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(42),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Start upgrade',
            style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildAnimatedBody() {
    // One shared progress → outgoing + incoming stay stuck edge-to-edge.
    // Pure slide only (no fade).
    final panelColor = widget.surfaceColor.a == 0
        ? Colors.white
        : widget.surfaceColor;
    final curved = CurvedAnimation(
      parent: _navController,
      curve: const Cubic(0.22, 1.0, 0.36, 1.0),
    );

    return ClipRect(
      child: AnimatedBuilder(
        animation: curved,
        builder: (context, _) {
          final t = curved.value;
          final animating = t < 1.0;
          final outgoingDx = _navForward ? -t : t;
          final incomingDx = _navForward ? (1.0 - t) : (t - 1.0);

          return Stack(
            fit: StackFit.expand,
            children: [
              if (animating)
                FractionalTranslation(
                  translation: Offset(outgoingDx, 0),
                  child: SizedBox.expand(
                    child: ColoredBox(
                      color: panelColor,
                      child: _buildView(_outgoingView),
                    ),
                  ),
                ),
              FractionalTranslation(
                translation: Offset(incomingDx, 0),
                child: SizedBox.expand(
                  child: ColoredBox(
                    color: panelColor,
                    child: _buildView(_view),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final expandFull = _changePasswordFormOpen;
    final panelWidth = expandFull
        ? width
        : (width < 520 ? width * 0.92 : 360.0);
    final showHeader = _view != BuyerAccountPanelView.menu;
    final Widget? headerTrailing = _view == BuyerAccountPanelView.vouchers
        ? IconButton(
            tooltip: _voucherSearchOpen
                ? 'Close voucher search'
                : 'Search vouchers',
            onPressed: () {
              setState(() {
                _voucherSearchOpen = !_voucherSearchOpen;
                if (!_voucherSearchOpen) {
                  _voucherSearchController.clear();
                }
              });
            },
            padding: EdgeInsets.zero,
            style: IconButton.styleFrom(
              backgroundColor: widget.primaryColor.withValues(alpha: 0.08),
              foregroundColor: _voucherInkColor(widget.primaryColor),
            ),
            icon: Icon(
              _voucherSearchOpen ? Icons.close_rounded : Icons.search_rounded,
              size: 20,
            ),
          )
        : null;
    // Never paint transparent — match web `.md-right-panel` solid #fff surface.
    final panelColor = widget.surfaceColor.a == 0
        ? Theme.of(context).colorScheme.surface
        : widget.surfaceColor;

    return PopScope<void>(
      // The device back button navigates through sidebar content first. The
      // dialog route may close only after the Account settings root is shown.
      canPop: _view == BuyerAccountPanelView.menu && !_changePasswordFormOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _backToPreviousView();
      },
      child: AnimatedContainer(
        duration: appMotionFrames(14),
        curve: Curves.easeOutCubic,
        width: panelWidth,
        height: double.infinity,
        child: Material(
          color: panelColor,
          elevation: 0,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: panelColor,
              border: Border(
                left: BorderSide(
                  color: widget.secondaryColor.withValues(alpha: 0.18),
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 28,
                  offset: const Offset(-8, 0),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              bottom: false,
              child: Column(
                children: [
                  // Every account sub-view shares the centered Invite Friends header.
                  if (showHeader)
                    BuyerRightPanelHeader(
                      title: _title,
                      titleColor: widget.titleColor,
                      onBack: _backToPreviousView,
                      trailing: headerTrailing,
                    ),
                  Expanded(child: _buildAnimatedBody()),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SavedBuyerAddress {
  const _SavedBuyerAddress({
    required this.id,
    required this.search,
    required this.unit,
    required this.street,
    required this.city,
    required this.province,
    required this.postal,
    required this.label,
    this.lat,
    this.lng,
  });

  final String id;
  final String search;
  final String unit;
  final String street;
  final String city;
  final String province;
  final String postal;
  final String label;
  final double? lat;
  final double? lng;

  String get summaryLine {
    final parts = <String>[
      if (unit.trim().isNotEmpty) unit.trim(),
      if (street.trim().isNotEmpty) street.trim(),
      if (city.trim().isNotEmpty) city.trim(),
      if (province.trim().isNotEmpty) province.trim(),
      if (postal.trim().isNotEmpty) postal.trim(),
    ];
    if (parts.isNotEmpty) return parts.join(', ');
    if (search.trim().isNotEmpty) return search.trim();
    return 'Saved address';
  }

  String get mapQuery {
    if (lat != null && lng != null) {
      return '${lat!.toStringAsFixed(6)},${lng!.toStringAsFixed(6)}';
    }
    if (search.trim().isNotEmpty) return search.trim();
    return summaryLine;
  }

  factory _SavedBuyerAddress.fromJson(Map<String, dynamic> json) {
    double? parseCoord(Object? value) {
      if (value is num) return value.toDouble();
      return double.tryParse('${value ?? ''}'.trim());
    }

    final label = '${json['label'] ?? ''}'.trim();
    return _SavedBuyerAddress(
      id: '${json['id'] ?? ''}'.trim().isNotEmpty
          ? '${json['id']}'.trim()
          : 'addr_${DateTime.now().millisecondsSinceEpoch}',
      search: '${json['search'] ?? ''}'.trim(),
      unit: '${json['unit'] ?? ''}'.trim(),
      street: '${json['street'] ?? ''}'.trim(),
      city: '${json['city'] ?? ''}'.trim(),
      province: '${json['province'] ?? ''}'.trim(),
      postal: '${json['postal'] ?? ''}'.trim(),
      label: BuyerDeliveryAddress.normalizeLabel(label),
      lat: parseCoord(json['lat']),
      lng: parseCoord(json['lng']),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'search': search,
      'unit': unit,
      'street': street,
      'city': city,
      'province': province,
      'postal': postal,
      'label': label,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    };
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.ok});

  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: ok ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: ok ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: ok ? const Color(0xFF047857) : const Color(0xFF64748B),
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _VoucherTicketShapeBorder extends ShapeBorder {
  const _VoucherTicketShapeBorder();

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect, textDirection: textDirection);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    return const _VoucherTicketClipper().getClip(rect.size)
      ..shift(rect.topLeft);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {}

  @override
  ShapeBorder scale(double t) => this;
}

class _VoucherTicketClipper extends CustomClipper<Path> {
  const _VoucherTicketClipper();

  @override
  Path getClip(Size size) {
    final ticket = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(12)),
      );
    final notchCenterY = size.height * 0.5;
    final notches = Path()
      ..addOval(Rect.fromCircle(center: Offset(0, notchCenterY), radius: 5))
      ..addOval(
        Rect.fromCircle(center: Offset(size.width, notchCenterY), radius: 5),
      );
    return Path.combine(PathOperation.difference, ticket, notches);
  }

  @override
  bool shouldReclip(covariant _VoucherTicketClipper oldClipper) => false;
}

class _VoucherTicketShadowPainter extends CustomPainter {
  const _VoucherTicketShadowPainter();

  static const _shadows = <BoxShadow>[
    BoxShadow(color: Color(0x66000000), blurRadius: 1, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x0D000000), blurRadius: 4, offset: Offset(0, 2)),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final ticketPath = const _VoucherTicketClipper().getClip(size);
    for (final shadow in _shadows) {
      canvas.drawPath(ticketPath.shift(shadow.offset), shadow.toPaint());
    }
  }

  @override
  bool shouldRepaint(covariant _VoucherTicketShadowPainter oldDelegate) {
    return false;
  }
}

class _VoucherDividerPainter extends CustomPainter {
  const _VoucherDividerPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round;
    const dashWidth = 4.0;
    const dashGap = 4.0;
    for (double x = 0; x < size.width; x += dashWidth + dashGap) {
      canvas.drawLine(
        Offset(x, size.height / 2),
        Offset(
          (x + dashWidth).clamp(0.0, size.width).toDouble(),
          size.height / 2,
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _VoucherDividerPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
