import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gms_shopping/models/delivery_partner.dart';
import 'package:gms_shopping/models/payment_partner.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/order_tab_navigation.dart';
import 'package:gms_shopping/order_store.dart';
import 'package:gms_shopping/services/delivery_partner_repository.dart';
import 'package:gms_shopping/services/payment_partner_repository.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/user_details.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:gms_shopping/utils/currency_format.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum BookingFlowSource { cartCheckout, directBuy }

enum BookingPaymentCollectionOption { codDeposit, fullPayment }

enum BookingPageAction { orderPlaced }

Future<BookingPageAction?> openBookingPage(
  BuildContext context, {
  required List<BookingLineItem> items,
  required BookingFlowSource source,
}) {
  final normalizedItems = items
      .where((item) => item.productId.trim().isNotEmpty && item.quantity > 0)
      .toList(growable: false);
  if (normalizedItems.isEmpty) {
    return Future<BookingPageAction?>.value(null);
  }

  return Navigator.of(context).push<BookingPageAction>(
    MaterialPageRoute<BookingPageAction>(
      builder: (_) => BookingPage(
        items: normalizedItems,
        source: source,
      ),
    ),
  );
}

class BookingLineItem {
  const BookingLineItem({
    required this.referenceKey,
    this.adminId = '',
    required this.productId,
    required this.productName,
    required this.productImageUrl,
    required this.category,
    this.deliveryPartnerIds = const <String>[],
    this.paymentPartnerIds = const <String>[],
    required this.quantity,
    required this.unitPrice,
    required this.originalUnitPrice,
    required this.variantId,
    required this.variantName,
    this.variantAddOns = const <ProductVariantAddOn>[],
    this.productRating = 0,
    this.showsTopBrand = false,
    this.availableStock = 0,
  });

  factory BookingLineItem.fromProduct({
    required Product product,
    required int quantity,
    ProductVariant? selectedVariant,
    int availableStock = 0,
    bool showsTopBrand = false,
  }) {
    final variant = selectedVariant;
    final unitPrice = variant?.displayPrice ??
        ((product.salesPrice != null &&
                product.salesPrice! >= 0 &&
                product.salesPrice! < product.originalPrice)
            ? product.salesPrice!
            : product.originalPrice);
    final originalUnitPrice = variant?.originalPrice ?? product.originalPrice;

    return BookingLineItem(
      referenceKey: '${product.id.trim()}::${variant?.id.trim() ?? ''}',
      adminId: product.adminId.trim(),
      productId: product.id.trim(),
      productName: product.name.trim().isEmpty
          ? 'Unnamed Product'
          : product.name.trim(),
      productImageUrl: (variant?.imageUrl.trim().isNotEmpty ?? false)
          ? variant!.imageUrl.trim()
          : product.imageUrl.trim(),
      category: product.category.trim(),
      deliveryPartnerIds: product.deliveryPartnerIds,
      paymentPartnerIds: product.paymentPartnerIds,
      quantity: quantity.clamp(1, 999).toInt(),
      unitPrice: unitPrice,
      originalUnitPrice: originalUnitPrice,
      variantId: variant?.id.trim() ?? '',
      variantName: variant?.name.trim() ?? '',
      variantAddOns: variant?.addOns ?? const <ProductVariantAddOn>[],
      productRating: product.rating,
      showsTopBrand: showsTopBrand,
      availableStock: availableStock,
    );
  }

  final String referenceKey;
  final String adminId;
  final String productId;
  final String productName;
  final String productImageUrl;
  final String category;
  final List<String> deliveryPartnerIds;
  final List<String> paymentPartnerIds;
  final int quantity;
  final double unitPrice;
  final double originalUnitPrice;
  final String variantId;
  final String variantName;
  final List<ProductVariantAddOn> variantAddOns;
  final double productRating;
  final bool showsTopBrand;
  final int availableStock;

  bool get hasVariant => variantName.trim().isNotEmpty;
  bool get hasStock => availableStock > 0;

  bool get hasDiscount =>
      unitPrice >= 0 && originalUnitPrice > 0 && unitPrice < originalUnitPrice;

  bool get showsTopReviews => productRating >= 4.5 && productRating <= 5;

  int? get discountPercent {
    if (!hasDiscount || originalUnitPrice <= 0) {
      return null;
    }

    final percent =
        (((originalUnitPrice - unitPrice) / originalUnitPrice) * 100).round();
    return percent > 0 ? percent : null;
  }

  double get totalPrice => unitPrice * quantity;

  double get totalOriginalPrice => originalUnitPrice * quantity;

  BookingLineItem copyWith({
    String? referenceKey,
    String? adminId,
    String? productId,
    String? productName,
    String? productImageUrl,
    String? category,
    List<String>? deliveryPartnerIds,
    List<String>? paymentPartnerIds,
    int? quantity,
    double? unitPrice,
    double? originalUnitPrice,
    String? variantId,
    String? variantName,
    List<ProductVariantAddOn>? variantAddOns,
    double? productRating,
    bool? showsTopBrand,
    int? availableStock,
  }) {
    return BookingLineItem(
      referenceKey: referenceKey ?? this.referenceKey,
      adminId: adminId ?? this.adminId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      productImageUrl: productImageUrl ?? this.productImageUrl,
      category: category ?? this.category,
      deliveryPartnerIds: deliveryPartnerIds ?? this.deliveryPartnerIds,
      paymentPartnerIds: paymentPartnerIds ?? this.paymentPartnerIds,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      originalUnitPrice: originalUnitPrice ?? this.originalUnitPrice,
      variantId: variantId ?? this.variantId,
      variantName: variantName ?? this.variantName,
      variantAddOns: variantAddOns ?? this.variantAddOns,
      productRating: productRating ?? this.productRating,
      showsTopBrand: showsTopBrand ?? this.showsTopBrand,
      availableStock: availableStock ?? this.availableStock,
    );
  }
}

class _RecentBookingClientDetails {
  const _RecentBookingClientDetails({
    required this.id,
    required this.name,
    required this.contactNumber,
    required this.address,
    this.addressDetails = '',
    this.isDefault = false,
  });

  factory _RecentBookingClientDetails.fromJson(Map<String, dynamic> json) {
    return _RecentBookingClientDetails(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      contactNumber: json['contactNumber']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      addressDetails: json['addressDetails']?.toString() ?? '',
      isDefault: json['isDefault'] == true,
    );
  }

  final String id;
  final String name;
  final String contactNumber;
  final String address;
  final String addressDetails;
  final bool isDefault;

  bool get isComplete =>
      name.trim().isNotEmpty &&
      contactNumber.trim().isNotEmpty &&
      address.trim().isNotEmpty;

  bool matches(_RecentBookingClientDetails other) {
    return name.trim() == other.name.trim() &&
        contactNumber.trim() == other.contactNumber.trim() &&
        address.trim() == other.address.trim() &&
        addressDetails.trim() == other.addressDetails.trim();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'contactNumber': contactNumber,
      'address': address,
      'addressDetails': addressDetails,
      'isDefault': isDefault,
    };
  }
}

class BookingPage extends StatefulWidget {
  const BookingPage({
    super.key,
    required this.items,
    required this.source,
  });

  final List<BookingLineItem> items;
  final BookingFlowSource source;

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> {
  static const Duration _refreshIndicatorDelay = Duration(milliseconds: 650);
  static const double _minimumCodDeposit = 500;
  static const String _legacyRecentClientDetailsKey =
      'place_order_recent_client_details';
  static const String _legacyRecentDeliveryPartnerIdKey =
      'place_order_recent_delivery_partner_id';
  static const String _legacyRecentPaymentPartnerIdKey =
      'place_order_recent_payment_partner_id';
  static const String _legacySavedUserDetailsEntriesKey =
      'saved_user_details_entries';
  static const String _recentClientDetailsKeyPrefix =
      'place_order_recent_client_details_';
  static const String _recentDeliveryPartnerIdKeyPrefix =
      'place_order_recent_delivery_partner_id_';
  static const String _recentPaymentPartnerIdKeyPrefix =
      'place_order_recent_payment_partner_id_';
  static const String _savedUserDetailsEntriesKeyPrefix =
      'saved_user_details_entries_';

  late final List<BookingLineItem> _orderItems;
  late final DeliveryPartnerRepository _deliveryPartnerRepository;
  late Future<List<DeliveryPartner>> _deliveryPartnersFuture;
  late final PaymentPartnerRepository _paymentPartnerRepository;
  late Future<List<PaymentPartner>> _paymentPartnersFuture;
  late final TextEditingController _nameController;
  late final TextEditingController _addressController;
  late final TextEditingController _addressDetailsController;
  late final TextEditingController _contactController;
  late final TextEditingController _noteController;
  late final TextEditingController _enteredAmountController;
  List<DeliveryPartner> _deliveryPartners = const <DeliveryPartner>[];
  List<PaymentPartner> _paymentPartners = const <PaymentPartner>[];
  String _selectedDeliveryPartnerId = '';
  String _selectedPaymentPartnerId = '';
  bool _isSubmittingOrder = false;
  BookingPaymentCollectionOption? _selectedPaymentOption;

  @override
  void initState() {
    super.initState();
    _orderItems = List<BookingLineItem>.from(widget.items);
    _deliveryPartnerRepository = createDeliveryPartnerRepository();
    _paymentPartnerRepository = createPaymentPartnerRepository();
    _deliveryPartnersFuture = _loadDeliveryPartners();
    _paymentPartnersFuture = _loadPaymentPartners();
    _nameController = TextEditingController();
    _addressController = TextEditingController();
    _addressDetailsController = TextEditingController();
    _contactController = TextEditingController();
    _noteController = TextEditingController();
    _enteredAmountController = TextEditingController()
      ..addListener(_handleEnteredAmountChanged);
    unawaited(_loadRecentBookingPreferences());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _addressDetailsController.dispose();
    _contactController.dispose();
    _noteController.dispose();
    _enteredAmountController
      ..removeListener(_handleEnteredAmountChanged)
      ..dispose();
    super.dispose();
  }

  List<BookingLineItem> get _items => _orderItems;

  bool _isSamePartnerId(String first, String second) {
    return first.trim().toLowerCase() == second.trim().toLowerCase();
  }

  List<DeliveryPartner> _filterActiveDeliveryPartners(
    List<DeliveryPartner> partners,
  ) {
    final seenPartnerIds = <String>{};
    return partners
        .where((partner) {
          final partnerId = partner.id.trim();
          final partnerKey = partnerId.toLowerCase();
          if (partnerId.isEmpty ||
              !partner.isEnabled ||
              seenPartnerIds.contains(partnerKey)) {
            return false;
          }
          seenPartnerIds.add(partnerKey);
          return true;
        })
        .toList(growable: false);
  }

  List<PaymentPartner> _filterActivePaymentPartners(
    List<PaymentPartner> partners,
  ) {
    final seenPartnerIds = <String>{};
    return partners
        .where((partner) {
          final partnerId = partner.id.trim();
          final partnerKey = partnerId.toLowerCase();
          if (partnerId.isEmpty ||
              !partner.isEnabled ||
              seenPartnerIds.contains(partnerKey)) {
            return false;
          }
          seenPartnerIds.add(partnerKey);
          return true;
        })
        .toList(growable: false);
  }

  Future<List<DeliveryPartner>> _loadDeliveryPartners({
    bool forceRefresh = false,
  }) async {
    final partners = _filterActiveDeliveryPartners(
      await _deliveryPartnerRepository.fetchDeliveryPartners(
      forceRefresh: forceRefresh,
      ),
    );
    if (!mounted) {
      return partners;
    }

    setState(() {
      _deliveryPartners = partners;
      if (_selectedDeliveryPartnerId.isNotEmpty &&
          !partners.any(
            (partner) => _isSamePartnerId(partner.id, _selectedDeliveryPartnerId),
          )) {
        _selectedDeliveryPartnerId = '';
      }
    });

    return partners;
  }

  Future<List<PaymentPartner>> _loadPaymentPartners({
    bool forceRefresh = false,
  }) async {
    final partners = _filterActivePaymentPartners(
      await _paymentPartnerRepository.fetchPaymentPartners(
      forceRefresh: forceRefresh,
      ),
    );
    if (!mounted) {
      return partners;
    }

    setState(() {
      _paymentPartners = partners;
      if (_selectedPaymentPartnerId.isNotEmpty &&
          !partners.any(
            (partner) => _isSamePartnerId(partner.id, _selectedPaymentPartnerId),
          )) {
        _selectedPaymentPartnerId = '';
      }
    });

    return partners;
  }

  Future<void> _refreshPlaceOrder() async {
    final deliveryRequest = _loadDeliveryPartners(forceRefresh: true);
    final paymentRequest = _loadPaymentPartners(forceRefresh: true);

    if (mounted) {
      setState(() {
        _deliveryPartnersFuture = deliveryRequest;
        _paymentPartnersFuture = paymentRequest;
      });
    }

    await Future.wait<dynamic>([
      deliveryRequest,
      paymentRequest,
      Future<void>.delayed(_refreshIndicatorDelay),
    ]);
  }

  Future<String?> _resolveBookingPreferencesAccountKey() async {
    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
    final rawAccountKey = accountId.isNotEmpty ? accountId : accountEmail;
    if (rawAccountKey.isEmpty) {
      return null;
    }

    return Uri.encodeComponent(rawAccountKey.toLowerCase());
  }

  String _recentClientDetailsKeyFor(String accountKey) =>
      '$_recentClientDetailsKeyPrefix$accountKey';

  String _recentDeliveryPartnerIdKeyFor(String accountKey) =>
      '$_recentDeliveryPartnerIdKeyPrefix$accountKey';

  String _recentPaymentPartnerIdKeyFor(String accountKey) =>
      '$_recentPaymentPartnerIdKeyPrefix$accountKey';

  String _savedUserDetailsEntriesKeyFor(String accountKey) =>
      '$_savedUserDetailsEntriesKeyPrefix$accountKey';

  Future<void> _removeLegacyBookingPreferenceKeys(
    SharedPreferences preferences,
  ) async {
    await preferences.remove(_legacyRecentClientDetailsKey);
    await preferences.remove(_legacyRecentDeliveryPartnerIdKey);
    await preferences.remove(_legacyRecentPaymentPartnerIdKey);
    await preferences.remove(_legacySavedUserDetailsEntriesKey);
  }

  Future<void> _loadRecentBookingPreferences() async {
    final preferences = await SharedPreferences.getInstance();
    await _removeLegacyBookingPreferenceKeys(preferences);

    final accountKey = await _resolveBookingPreferencesAccountKey();
    if (accountKey == null) {
      return;
    }

    var clientDetails = _readRecentClientDetails(
      preferences,
      _recentClientDetailsKeyFor(accountKey),
    );
    clientDetails ??= _readPreferredSavedUserDetails(
      preferences,
      _savedUserDetailsEntriesKeyFor(accountKey),
    );
    final deliveryPartnerId =
        preferences
            .getString(_recentDeliveryPartnerIdKeyFor(accountKey))
            ?.trim() ??
        '';
    final paymentPartnerId =
        preferences
            .getString(_recentPaymentPartnerIdKeyFor(accountKey))
            ?.trim() ??
        '';

    if (!mounted) {
      return;
    }

    setState(() {
      if (!_hasAnyClientDetails &&
          clientDetails != null &&
          clientDetails.isComplete) {
        _nameController.text = clientDetails.name;
        _contactController.text = clientDetails.contactNumber;
        _addressController.text = clientDetails.address;
        _addressDetailsController.text = clientDetails.addressDetails;
      }
      if (_selectedDeliveryPartnerId.trim().isEmpty) {
        _selectedDeliveryPartnerId = deliveryPartnerId;
      }
      if (_selectedPaymentPartnerId.trim().isEmpty) {
        _selectedPaymentPartnerId = paymentPartnerId;
      }
    });
  }

  _RecentBookingClientDetails? _readRecentClientDetails(
    SharedPreferences preferences,
    String detailsKey,
  ) {
    final rawClientDetails = preferences.getString(detailsKey);
    if (rawClientDetails == null || rawClientDetails.trim().isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(rawClientDetails);
      if (decoded is Map<String, dynamic>) {
        final details = _RecentBookingClientDetails.fromJson(decoded);
        return details.isComplete ? details : null;
      }
    } catch (_) {}

    return null;
  }

  _RecentBookingClientDetails? _readPreferredSavedUserDetails(
    SharedPreferences preferences,
    String entriesKey,
  ) {
    final rawSavedEntries = preferences.getString(entriesKey);
    if (rawSavedEntries == null || rawSavedEntries.trim().isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(rawSavedEntries);
      if (decoded is! List<dynamic>) {
        return null;
      }

      final entries = decoded
          .whereType<Map<String, dynamic>>()
          .map(_RecentBookingClientDetails.fromJson)
          .where((entry) => entry.isComplete)
          .toList(growable: false);
      for (final entry in entries) {
        if (entry.isDefault) {
          return entry;
        }
      }
      return entries.isEmpty ? null : entries.first;
    } catch (_) {
      return null;
    }
  }

  Future<void> _openDeliveryPartnerSelector(
    List<DeliveryPartner> partners,
  ) async {
    if (partners.isEmpty) {
      return;
    }

    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final selectedPartnerId = _resolveSelectedDeliveryPartnerId(partners);

    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.inputDecorationTheme.fillColor ??
          theme.colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.dividerColor.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Select Courier',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Choose the delivery partner for this order.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.sizeOf(context).height * 0.55,
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: partners.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final partner = partners[index];
                      final isSelected =
                          _isSamePartnerId(partner.id, selectedPartnerId);

                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).pop(partner.id);
                          },
                          borderRadius: BorderRadius.circular(18),
                          child: Ink(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _BookingDeliveryPartnerAvatar(
                                  imageUrl: partner.imageUrl,
                                  primaryColor: primaryColor,
                                  icon: Icons.local_shipping_outlined,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        partner.branchLabel,
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        partner.descriptionLabel,
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                          color: secondaryColor,
                                          height: 1.35,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                SizedBox(
                                  height: 52,
                                  child: Center(
                                    child: Icon(
                                      isSelected
                                          ? Icons.radio_button_checked_rounded
                                          : Icons.radio_button_off_rounded,
                                      color: isSelected
                                          ? primaryColor
                                          : secondaryColor,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (!mounted || result == null) {
      return;
    }

    setState(() {
      _selectedDeliveryPartnerId = result.trim();
    });
  }

  Future<void> _openPaymentPartnerSelector(
    List<PaymentPartner> partners,
  ) async {
    if (partners.isEmpty) {
      return;
    }

    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final selectedPartnerId = _resolveSelectedPaymentPartnerId(partners);

    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.dividerColor.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Select Payment Method',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Choose the payment partner for this order.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.sizeOf(context).height * 0.55,
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: partners.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final partner = partners[index];
                      final isSelected =
                          _isSamePartnerId(partner.id, selectedPartnerId);

                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).pop(partner.id);
                          },
                          borderRadius: BorderRadius.circular(18),
                          child: Ink(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                _BookingDeliveryPartnerAvatar(
                                  imageUrl: partner.imageUrl,
                                  primaryColor: primaryColor,
                                  icon: Icons.account_balance_wallet_outlined,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    partner.branchLabel,
                                    style: theme.textTheme.titleSmall?.copyWith(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                SizedBox(
                                  height: 52,
                                  child: Center(
                                    child: Icon(
                                      isSelected
                                          ? Icons.radio_button_checked_rounded
                                          : Icons.radio_button_off_rounded,
                                      color: isSelected
                                          ? primaryColor
                                          : secondaryColor,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (!mounted || result == null) {
      return;
    }

    setState(() {
      _selectedPaymentPartnerId = result.trim();
    });
  }

  List<DeliveryPartner> _resolveDeliveryPartners(
    AsyncSnapshot<List<DeliveryPartner>> snapshot,
  ) {
    return snapshot.data ?? _deliveryPartners;
  }

  String _resolveSelectedDeliveryPartnerId(List<DeliveryPartner> partners) {
    if (partners.isEmpty) {
      return '';
    }

    final selectedPartnerExists = partners.any(
      (partner) => _isSamePartnerId(partner.id, _selectedDeliveryPartnerId),
    );
    return selectedPartnerExists ? _selectedDeliveryPartnerId : '';
  }

  List<PaymentPartner> _resolvePaymentPartners(
    AsyncSnapshot<List<PaymentPartner>> snapshot,
  ) {
    return snapshot.data ?? _paymentPartners;
  }

  String _resolveSelectedPaymentPartnerId(List<PaymentPartner> partners) {
    if (partners.isEmpty) {
      return '';
    }

    final selectedPartnerExists = partners.any(
      (partner) => _isSamePartnerId(partner.id, _selectedPaymentPartnerId),
    );
    return selectedPartnerExists ? _selectedPaymentPartnerId : '';
  }

  DeliveryPartner? _findSelectedDeliveryPartner(
    List<DeliveryPartner> partners,
    String selectedPartnerId,
  ) {
    if (selectedPartnerId.isEmpty) {
      return null;
    }

    for (final partner in partners) {
      if (_isSamePartnerId(partner.id, selectedPartnerId)) {
        return partner;
      }
    }

    return null;
  }

  PaymentPartner? _findSelectedPaymentPartner(
    List<PaymentPartner> partners,
    String selectedPartnerId,
  ) {
    if (selectedPartnerId.isEmpty) {
      return null;
    }

    for (final partner in partners) {
      if (_isSamePartnerId(partner.id, selectedPartnerId)) {
        return partner;
      }
    }

    return null;
  }

  List<DeliveryPartner> get _availableDeliveryPartners =>
      _deliveryPartners;

  List<PaymentPartner> get _availablePaymentPartners =>
      _paymentPartners;

  DeliveryPartner? get _selectedDeliveryPartner => _findSelectedDeliveryPartner(
        _availableDeliveryPartners,
        _selectedDeliveryPartnerId,
      );

  PaymentPartner? get _selectedPaymentPartner => _findSelectedPaymentPartner(
        _availablePaymentPartners,
        _selectedPaymentPartnerId,
      );

  String? _validatePlaceOrder({
    required bool isCodPlacement,
    required double? parsedEnteredAmount,
  }) {
    if (_availableDeliveryPartners.isEmpty) {
      return 'No active delivery partner is available.';
    }

    if (_availablePaymentPartners.isEmpty) {
      return 'No active payment partner is available.';
    }

    if (_selectedDeliveryPartnerId.trim().isEmpty) {
      return 'Please select a courier.';
    }

    if (_selectedPaymentPartnerId.trim().isEmpty) {
      return 'Please select a payment method.';
    }

    if (!_hasClientName) {
      return 'Please enter the client name.';
    }

    if (!_hasClientAddress) {
      return 'Please enter the delivery address.';
    }

    if (!_hasClientContact) {
      return 'Please enter the contact number.';
    }

    if (!_hasValidClientContact) {
      return 'Please enter a valid contact number.';
    }

    if (_selectedPaymentOption == null) {
      return 'Please select COD or Full Payment.';
    }

    if (parsedEnteredAmount == null) {
      return 'Please enter the amount.';
    }

    if (parsedEnteredAmount < 0) {
      return 'Entered amount cannot be less than zero.';
    }

    if (parsedEnteredAmount <= 0) {
      return 'Please enter the amount.';
    }

    if (parsedEnteredAmount > _grandTotal) {
      return 'Entered amount cannot exceed the total.';
    }

    if (isCodPlacement && parsedEnteredAmount + 0.009 < _depositAmount) {
      return 'COD requires a minimum downpayment of ${formatPesoCurrency(_depositAmount)}.';
    }

    if (_selectedDeliveryPartner == null) {
      return 'Please select a courier.';
    }

    if (_selectedPaymentPartner == null) {
      return 'Please select a payment method.';
    }

    return null;
  }

  Future<List<OrderEntryData>> _buildOrderEntries({
    required int createdAtEpochMs,
    required OrderStageKey nextOrderStage,
    required double amountToPayAmount,
    required double remainingBalanceAmount,
    required PaymentPartner paymentPartner,
    required DeliveryPartner deliveryPartner,
  }) async {
    final accountId = await _resolveOrderAccountId() ?? '';
    return <OrderEntryData>[
      for (var index = 0; index < _items.length; index++)
        OrderEntryData(
          id: '${createdAtEpochMs}_${index}_${_items[index].referenceKey}',
          adminId: _items[index].adminId,
          accountId: accountId,
          productId: _items[index].productId,
          productName: _items[index].productName,
          productImageUrl: _items[index].productImageUrl,
          variantId: _items[index].variantId,
          variantName: _items[index].variantName,
          addOns: _items[index]
              .variantAddOns
              .map(
                (addOn) => OrderItemAddOn(
                  id: addOn.id.trim(),
                  name: addOn.name.trim(),
                  quantity: addOn.quantity <= 0 ? 1 : addOn.quantity,
                ),
              )
              .where(
                (addOn) =>
                    addOn.id.trim().isNotEmpty &&
                    addOn.name.trim().isNotEmpty,
              )
              .toList(growable: false),
          quantity: _items[index].quantity,
          unitPrice: _items[index].unitPrice,
          stage: nextOrderStage,
          createdAtEpochMs: createdAtEpochMs,
          grandTotalAmount: _grandTotal,
          amountToPayAmount: amountToPayAmount,
          remainingBalanceAmount: remainingBalanceAmount,
          shippingFeeAmount: _shippingFee,
          paymentOptionLabel: _selectedPaymentOptionLabel,
          productRating: _items[index].productRating,
          paymentPartnerName: paymentPartner.branchLabel,
          paymentPartnerImageUrl: paymentPartner.imageUrl.trim(),
          deliveryPartnerName: deliveryPartner.branchLabel,
          deliveryPartnerImageUrl: deliveryPartner.imageUrl.trim(),
          clientName: _clientNameLabel,
          clientContactNumber: _clientContactLabel,
          clientAddress: _clientAddressLabel,
      ),
    ];
  }

  Future<String?> _resolveOrderAccountId() async {
    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    if (accountId.isNotEmpty) {
      return accountId;
    }

    final email = (await AuthSession.getAccountEmail())?.trim() ?? '';
    return email.isNotEmpty ? email.toLowerCase() : null;
  }

  Future<void> _saveRecentBookingPreferences({
    required DeliveryPartner deliveryPartner,
    required PaymentPartner paymentPartner,
  }) async {
    final clientDetails = _RecentBookingClientDetails(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      name: _nameController.text.trim(),
      contactNumber: _contactController.text.trim(),
      address: _addressController.text.trim(),
      addressDetails: _addressDetailsController.text.trim(),
    );
    if (!clientDetails.isComplete) {
      return;
    }

    final preferences = await SharedPreferences.getInstance();
    await _removeLegacyBookingPreferenceKeys(preferences);

    final accountKey = await _resolveBookingPreferencesAccountKey();
    if (accountKey == null) {
      return;
    }

    await preferences.setString(
      _recentClientDetailsKeyFor(accountKey),
      jsonEncode(clientDetails.toJson()),
    );
    await preferences.setString(
      _recentDeliveryPartnerIdKeyFor(accountKey),
      deliveryPartner.id.trim(),
    );
    await preferences.setString(
      _recentPaymentPartnerIdKeyFor(accountKey),
      paymentPartner.id.trim(),
    );
    await _upsertSavedUserDetailsEntry(
      preferences,
      _savedUserDetailsEntriesKeyFor(accountKey),
      clientDetails,
    );
  }

  Future<void> _upsertSavedUserDetailsEntry(
    SharedPreferences preferences,
    String entriesKey,
    _RecentBookingClientDetails clientDetails,
  ) async {
    final rawSavedEntries = preferences.getString(entriesKey);
    final savedEntries = <Map<String, dynamic>>[];
    if (rawSavedEntries != null && rawSavedEntries.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawSavedEntries);
        if (decoded is List<dynamic>) {
          savedEntries.addAll(
            decoded
                .whereType<Map<String, dynamic>>()
                .map((entry) => Map<String, dynamic>.from(entry)),
          );
        }
      } catch (_) {}
    }

    Map<String, dynamic>? matchedEntry;
    savedEntries.removeWhere((entry) {
      final savedDetails = _RecentBookingClientDetails.fromJson(entry);
      if (!savedDetails.matches(clientDetails)) {
        return false;
      }
      matchedEntry ??= entry;
      return true;
    });

    final entryToInsert = <String, dynamic>{
      ...?matchedEntry,
      'id': (matchedEntry?['id']?.toString().trim().isNotEmpty ?? false)
          ? matchedEntry!['id'].toString()
          : clientDetails.id,
      'name': clientDetails.name,
      'contactNumber': clientDetails.contactNumber,
      'address': clientDetails.address,
      'addressDetails': clientDetails.addressDetails,
      'isDefault': matchedEntry?['isDefault'] == true,
    };

    savedEntries.insert(0, entryToInsert);
    await preferences.setString(
      entriesKey,
      jsonEncode(savedEntries),
    );
  }

  void _openPlacedOrderTab(OrderStageKey nextOrderStage) {
    if (nextOrderStage == OrderStageKey.toPrepare) {
      OrderTabNavigation.instance.openToPrepare();
      return;
    }

    OrderTabNavigation.instance.openToPay();
  }

  void _updateItemQuantity(int index, int quantity) {
    if (index < 0 || index >= _orderItems.length) {
      return;
    }

    final currentItem = _orderItems[index];
    final normalizedQuantity = _normalizeBookingQuantity(
      quantity,
      availableStock: currentItem.availableStock,
    );
    if (normalizedQuantity == currentItem.quantity) {
      return;
    }

    setState(() {
      _orderItems[index] = currentItem.copyWith(quantity: normalizedQuantity);
    });
    if (_selectedPaymentOption == BookingPaymentCollectionOption.codDeposit) {
      _setEnteredAmount(_depositAmount);
      return;
    }

    if (_selectedPaymentOption == BookingPaymentCollectionOption.fullPayment) {
      _setEnteredAmount(_grandTotal);
    }
  }

  void _handleEnteredAmountChanged() {
    if (!mounted) {
      return;
    }
    setState(() {});
  }

  String _editableAmountText(double amount) {
    return amount.truncateToDouble() == amount
        ? amount.toStringAsFixed(0)
        : amount.toStringAsFixed(2);
  }

  void _setEnteredAmount(double amount) {
    final nextText = _editableAmountText(amount);
    if (_enteredAmountController.text == nextText) {
      return;
    }
    _enteredAmountController.value = TextEditingValue(
      text: nextText,
      selection: TextSelection.collapsed(offset: nextText.length),
    );
  }

  void _selectPaymentOption(BookingPaymentCollectionOption option) {
    if (_selectedPaymentOption == option) {
      return;
    }

    setState(() {
      _selectedPaymentOption = option;
    });

    if (option == BookingPaymentCollectionOption.codDeposit) {
      _setEnteredAmount(_depositAmount);
      return;
    }

    _setEnteredAmount(_grandTotal);
  }

  double? get _parsedEnteredAmount {
    final rawValue = _enteredAmountController.text.replaceAll(',', '').trim();
    if (rawValue.isEmpty) {
      return null;
    }
    return double.tryParse(rawValue);
  }

  double get _enteredAmount {
    final parsedAmount = _parsedEnteredAmount;
    if (parsedAmount == null || parsedAmount.isNaN || parsedAmount.isInfinite) {
      return 0;
    }
    return parsedAmount;
  }

  int get _itemCount =>
      _items.fold<int>(0, (total, item) => total + item.quantity);

  double get _subtotal =>
      _items.fold<double>(0, (total, item) => total + item.totalPrice);

  double get _originalSubtotal => _items.fold<double>(
        0,
        (total, item) => total + item.totalOriginalPrice,
      );

  double get _shippingFee {
    return _itemCount >= 3 ? 0 : 59;
  }

  double get _depositAmount => math.min(
        _grandTotal,
        math.max(_grandTotal * 0.10, _minimumCodDeposit),
      );

  double get _remainingAmount => math.max(_grandTotal - _enteredAmount, 0);

  double get _amountDueToday {
    switch (_selectedPaymentOption) {
      case BookingPaymentCollectionOption.codDeposit:
        return _depositAmount;
      case BookingPaymentCollectionOption.fullPayment:
        return _grandTotal;
      case null:
        return 0;
    }
  }

  double _amountStillNeededToProceedFor(double paidAmount) {
    return math.max(_amountDueToday - paidAmount, 0.0);
  }

  bool _hasMetAmountNeededToProceedFor(double paidAmount) {
    return _amountStillNeededToProceedFor(paidAmount) <= 0.009;
  }

  double get _amountStillNeededToProceed =>
      _amountStillNeededToProceedFor(_enteredAmount);

  bool get _hasOutstandingBalance => _remainingAmount > 0.009;

  String? get _orderPlacementBalanceMessage {
    if (_selectedPaymentOption == null) {
      return null;
    }

    if (_selectedPaymentOption == BookingPaymentCollectionOption.codDeposit) {
      if (_amountStillNeededToProceed > 0.009) {
        return 'This COD order will move to To Prepare once the required downpayment is completed.';
      }
      if (_hasOutstandingBalance) {
        return 'This COD order is ready for To Prepare. The remaining balance will be paid upon delivery.';
      }
      return null;
    }
    if (_amountStillNeededToProceed > 0.009) {
      return 'This order will move to To Prepare once the required payment is completed.';
    }
    return null;
  }

  String get _enteredAmountHelperText {
    if (_selectedPaymentOption == null) {
      return 'Select COD or Full Payment first.';
    }

    if (_selectedPaymentOption == BookingPaymentCollectionOption.codDeposit) {
      return 'Required COD payment to proceed to To Prepare: ${formatPesoCurrency(_depositAmount)}';
    }
    return 'Required payment to proceed to To Prepare: ${formatPesoCurrency(_amountDueToday)}';
  }

  String get _selectedPaymentOptionLabel {
    switch (_selectedPaymentOption) {
      case BookingPaymentCollectionOption.codDeposit:
        return 'COD';
      case BookingPaymentCollectionOption.fullPayment:
        return 'Full Payment';
      case null:
        return 'Not selected';
    }
  }

  double get _grandTotal => _subtotal + _shippingFee;

  String get _pageTitle {
    return 'Place Order';
  }

  String get _clientNameLabel {
    final value = _nameController.text.trim();
    return value;
  }

  String get _clientContactLabel {
    final value = _contactController.text.trim();
    return value;
  }

  String get _clientAddressLabel {
    final address = _addressController.text.trim();
    final addressDetails = _addressDetailsController.text.trim();
    if (address.isEmpty) {
      return '';
    }
    if (addressDetails.isEmpty) {
      return address;
    }
    return '$address ($addressDetails)';
  }

  bool get _hasClientName => _nameController.text.trim().isNotEmpty;

  bool get _hasClientAddress => _addressController.text.trim().isNotEmpty;

  bool get _hasClientContact => _contactController.text.trim().isNotEmpty;

  bool get _hasAnyClientDetails =>
      _hasClientName || _hasClientContact || _hasClientAddress;

  bool get _hasValidClientContact {
    final normalizedContact = _contactController.text
        .replaceAll(' ', '')
        .replaceAll('-', '')
        .trim();
    final contactPattern = RegExp(r'^\+?[0-9]{7,15}$');
    return contactPattern.hasMatch(normalizedContact);
  }

  Future<void> _handlePlaceOrder() async {
    if (_isSubmittingOrder) {
      return;
    }

    final bool isCodPlacement =
        _selectedPaymentOption == BookingPaymentCollectionOption.codDeposit;
    final parsedEnteredAmount = _parsedEnteredAmount;
    final validationMessage = _validatePlaceOrder(
      isCodPlacement: isCodPlacement,
      parsedEnteredAmount: parsedEnteredAmount,
    );
    if (validationMessage != null) {
      _showBookingMessage(validationMessage);
      return;
    }

    final enteredAmount = parsedEnteredAmount!;
    final deliveryPartner = _selectedDeliveryPartner;
    final paymentPartner = _selectedPaymentPartner;
    if (deliveryPartner == null || paymentPartner == null) {
      _showBookingMessage('Please complete the order details first.');
      return;
    }

    final currentOrderAccountId = await _resolveOrderAccountId();
    if (currentOrderAccountId == null) {
      _showBookingMessage('Please log in before placing an order.');
      return;
    }

    setState(() {
      _isSubmittingOrder = true;
    });

    final double remainingBalanceAmount =
        math.max(_grandTotal - enteredAmount, 0.0);
    const nextOrderStage = OrderStageKey.toPrepare;
    const amountToPayAmount = 0.0;
    final createdAtEpochMs = DateTime.now().millisecondsSinceEpoch;
    final orderEntries = await _buildOrderEntries(
      createdAtEpochMs: createdAtEpochMs,
      nextOrderStage: nextOrderStage,
      amountToPayAmount: amountToPayAmount,
      remainingBalanceAmount: remainingBalanceAmount,
      paymentPartner: paymentPartner,
      deliveryPartner: deliveryPartner,
    );
    try {
      await OrderStore.instance.addOrders(orderEntries);
    } catch (error) {
      if (mounted) {
        _showBookingMessage('Unable to save this order right now.');
      }
      return;
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingOrder = false;
        });
      }
    }

    try {
      await _saveRecentBookingPreferences(
        deliveryPartner: deliveryPartner,
        paymentPartner: paymentPartner,
      );
    } catch (error) {
      debugPrint('Unable to save recent place order preferences: $error');
    }

    if (!mounted) {
      return;
    }

    _openPlacedOrderTab(nextOrderStage);
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _openClientDetailsEditor() async {
    final result = await Navigator.of(context).push<UserDetailsResult>(
      MaterialPageRoute<UserDetailsResult>(
        builder: (_) => UserDetailsPage(
          initialName: _nameController.text.trim(),
          initialContactNumber: _contactController.text.trim(),
          initialAddress: _addressController.text.trim(),
          initialAddressDetails: _addressDetailsController.text.trim(),
        ),
      ),
    );
    if (!mounted || result == null) {
      return;
    }

    setState(() {
      _nameController.text = result.name;
      _contactController.text = result.contactNumber;
      _addressController.text = result.address;
      _addressDetailsController.text = result.addressDetails;
    });
  }

  void _showBookingMessage(String message) {
    AppSnackBar.showError(
      context,
      message: message,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mediaPadding = MediaQuery.paddingOf(context);
    final isDarkMode = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final hasDiscountedTotal = _originalSubtotal > _subtotal;
    final discountPercent = hasDiscountedTotal && _originalSubtotal > 0
        ? (((_originalSubtotal - _subtotal) / _originalSubtotal) * 100).round()
        : 0;
    final placeOrderTextColor = isDarkMode ? Colors.black : Colors.white;
    final chromeShadowColor = Colors.black.withOpacity(
      theme.brightness == Brightness.dark ? 0.22 : 0.1,
    );
    final bottomPadding = mediaPadding.bottom;
    final footerTargetHeight = mediaPadding.top + kToolbarHeight;
    final minimumHeight = bottomPadding + 64.0;
    final resolvedFooterHeight =
        footerTargetHeight > minimumHeight ? footerTargetHeight : minimumHeight;
    final footerContentHeight = resolvedFooterHeight - bottomPadding;
    final footerControlHeight = footerContentHeight <= 52
        ? 52.0
        : footerContentHeight >= 56
            ? 56.0
            : footerContentHeight;
    final footerButtonHeight = footerControlHeight - 8;

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: chromeShadowColor,
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: AppBar(
            backgroundColor: surfaceColor,
            foregroundColor: theme.colorScheme.onSurface,
            elevation: 0,
            scrolledUnderElevation: 0,
            surfaceTintColor: Colors.transparent,
            centerTitle: false,
            title: Text(
              _pageTitle,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: SizedBox(
        height: resolvedFooterHeight,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: surfaceColor,
            boxShadow: [
              BoxShadow(
                color: chromeShadowColor,
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(14, 0, 14, bottomPadding),
            child: Center(
              child: SizedBox(
                height: footerControlHeight,
                child: Row(
                  children: [
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'Total',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          TextSpan(
                            text:
                                ' ($_itemCount ${_itemCount == 1 ? 'item' : 'items'})',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: secondaryColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Grand total',
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: secondaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerRight,
                          child: _BookingPriceText(
                            amount: _grandTotal,
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: primaryColor,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      width: 126,
                      height: footerButtonHeight,
                      child: FilledButton(
                        onPressed: _isSubmittingOrder ? null : _handlePlaceOrder,
                        style: FilledButton.styleFrom(
                          foregroundColor: placeOrderTextColor,
                          textStyle: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: AnimatedSwitcher(
                          duration: appMotionFrames(11),
                          child: _isSubmittingOrder
                              ? SizedBox(
                                  key: const ValueKey('place-order-loading'),
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      placeOrderTextColor,
                                    ),
                                  ),
                                )
                              : Text(
                                  'Place Order',
                                  key: const ValueKey('place-order-label'),
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    color: placeOrderTextColor,
                                    fontWeight: FontWeight.w800,
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
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshPlaceOrder,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(0, 16, 0, 24),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _BookingSectionTitle(
                icon: Icons.person_outline_rounded,
                title: 'Client Details',
              ),
            ),
            const SizedBox(height: 12),
            _BookingSectionCard(
              padding: const EdgeInsets.fromLTRB(16, 16, 0, 16),
              borderRadius: BorderRadius.zero,
              showsAirmailBorder: true,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  _openClientDetailsEditor();
                },
                child: _hasAnyClientDetails
                    ? _BookingClientSummaryCard(
                        name: _clientNameLabel,
                        address: _clientAddressLabel,
                        contactNumber: _clientContactLabel,
                      )
                    : const _BookingAddAddressPlaceholder(),
              ),
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _BookingSectionTitle(
                icon: Icons.shopping_bag_outlined,
                title: 'Items to Order',
              ),
            ),
            const SizedBox(height: 12),
            for (var index = 0; index < _items.length; index++) ...[
              _BookingItemTile(
                item: _items[index],
                onDecreaseQuantity: () {
                  _updateItemQuantity(index, _items[index].quantity - 1);
                },
                onIncreaseQuantity: _items[index].hasStock &&
                        _items[index].quantity < _items[index].availableStock
                    ? () {
                        _updateItemQuantity(
                          index,
                          _items[index].quantity + 1,
                        );
                      }
                    : null,
              ),
              if (index != _items.length - 1) const SizedBox(height: 12),
            ],
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _BookingSectionTitle(
              icon: Icons.local_shipping_outlined,
              title: 'Delivery Method',
            ),
          ),
          const SizedBox(height: 12),
          FutureBuilder<List<DeliveryPartner>>(
            future: _deliveryPartnersFuture,
            builder: (context, snapshot) {
              final partners = _resolveDeliveryPartners(snapshot);
              final selectedPartnerId =
                  _resolveSelectedDeliveryPartnerId(partners);
              final selectedPartner = _findSelectedDeliveryPartner(
                partners,
                selectedPartnerId,
              );
              final partnerLoadMessage = snapshot.hasError
                  ? 'Unable to load delivery partners.'
                  : partners.isEmpty
                      ? 'No active delivery partner is available.'
                      : '';

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (partnerLoadMessage.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: Text(
                        partnerLoadMessage,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: secondaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  _BookingSectionCard(
                    borderRadius: BorderRadius.zero,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: partners.isEmpty
                            ? null
                            : () {
                                _openDeliveryPartnerSelector(partners);
                              },
                        borderRadius: BorderRadius.circular(18),
                      child: Ink(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          child: selectedPartner == null
                              ? Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        partners.isEmpty
                                            ? 'No Courier Available'
                                            : 'Select Courier',
                                        style: theme.textTheme.bodyLarge
                                            ?.copyWith(
                                          color: secondaryColor,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: partners.isEmpty
                                          ? secondaryColor.withOpacity(0.45)
                                          : secondaryColor,
                                    ),
                                  ],
                                )
                              : Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _BookingDeliveryPartnerAvatar(
                                      imageUrl: selectedPartner.imageUrl,
                                      primaryColor: primaryColor,
                                      icon: Icons.local_shipping_outlined,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            selectedPartner.branchLabel,
                                            style: theme.textTheme.titleSmall
                                                ?.copyWith(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            selectedPartner.descriptionLabel,
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                              color: secondaryColor,
                                              height: 1.35,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: secondaryColor,
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
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _BookingSectionTitle(
              icon: Icons.account_balance_wallet_outlined,
              title: 'Payment Method',
            ),
          ),
          const SizedBox(height: 12),
          FutureBuilder<List<PaymentPartner>>(
            future: _paymentPartnersFuture,
            builder: (context, snapshot) {
              final partners = _resolvePaymentPartners(snapshot);
              final selectedPartnerId =
                  _resolveSelectedPaymentPartnerId(partners);
              final selectedPartner = _findSelectedPaymentPartner(
                partners,
                selectedPartnerId,
              );
              final partnerLoadMessage = snapshot.hasError
                  ? 'Unable to load payment partners.'
                  : partners.isEmpty
                      ? 'No active payment partner is available.'
                      : '';

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (partnerLoadMessage.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: Text(
                        partnerLoadMessage,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: secondaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  _BookingSectionCard(
                    borderRadius: BorderRadius.zero,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: partners.isEmpty
                            ? null
                            : () {
                                _openPaymentPartnerSelector(partners);
                              },
                        borderRadius: BorderRadius.circular(18),
                        child: Ink(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          child: selectedPartner == null
                              ? Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        partners.isEmpty
                                            ? 'No Payment Method Available'
                                            : 'Select Payment Method',
                                        style: theme.textTheme.bodyLarge
                                            ?.copyWith(
                                          color: secondaryColor,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: partners.isEmpty
                                          ? secondaryColor.withOpacity(0.45)
                                          : secondaryColor,
                                    ),
                                  ],
                                )
                              : Row(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    _BookingDeliveryPartnerAvatar(
                                      imageUrl: selectedPartner.imageUrl,
                                      primaryColor: primaryColor,
                                      icon: Icons.account_balance_wallet_outlined,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        selectedPartner.branchLabel,
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: secondaryColor,
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
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _BookingSectionTitle(
              icon: Icons.payments_outlined,
              title: 'Payment',
            ),
          ),
          const SizedBox(height: 12),
          _BookingSectionCard(
            borderRadius: BorderRadius.zero,
            child: Column(
              children: [
                _BookingPaymentOptionTile(
                  title: 'COD',
                  subtitle:
                      'Select COD, pay the required downpayment today, and this order will proceed to To Prepare. The remaining balance will be settled upon delivery.',
                  trailing: _BookingPriceText(
                    amount: _depositAmount,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: primaryColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  isSelected:
                      _selectedPaymentOption ==
                      BookingPaymentCollectionOption.codDeposit,
                  onTap: () => _selectPaymentOption(
                    BookingPaymentCollectionOption.codDeposit,
                  ),
                ),
                const SizedBox(height: 10),
                _BookingPaymentOptionTile(
                  title: 'Full Payment',
                  subtitle:
                      'Pay the full grand total now using the selected method so this order can proceed to To Prepare.',
                  trailing: _BookingPriceText(
                    amount: _grandTotal,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: primaryColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  isSelected:
                      _selectedPaymentOption ==
                      BookingPaymentCollectionOption.fullPayment,
                  onTap: () => _selectPaymentOption(
                    BookingPaymentCollectionOption.fullPayment,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _BookingSectionTitle(
              icon: Icons.notes_outlined,
              title: 'Order Notes (Optional)',
            ),
          ),
          const SizedBox(height: 12),
          _BookingSectionCard(
            borderRadius: BorderRadius.zero,
            child: TextField(
              controller: _noteController,
              maxLines: 3,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                hintText:
                    'Optional: add rider notes, landmark, or packing request here',
              ),
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _BookingSectionTitle(
              icon: Icons.receipt_long_outlined,
              title: 'Payment Summary',
            ),
          ),
          const SizedBox(height: 12),
          _BookingSectionCard(
            borderRadius: BorderRadius.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _BookingSummaryRow(
                  label: 'Selected Option',
                  value: _selectedPaymentOptionLabel,
                ),
                const SizedBox(height: 10),
                _BookingSummaryRow(
                  label: 'Items ($_itemCount)',
                  amount: _subtotal,
                ),
                if (hasDiscountedTotal)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Before discount',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: secondaryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _BookingDiscountSummaryBadge(
                              label: '-$discountPercent%',
                            ),
                            const SizedBox(width: 6),
                            _BookingPriceText(
                              amount: _originalSubtotal,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                _BookingSummaryRow(
                  label: 'Shipping fee',
                  value: 'Buyer Charge',
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(height: 1),
                ),
                _BookingSummaryRow(
                  label: 'Grand total',
                  amount: _grandTotal,
                  emphasizesValue: true,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(height: 1),
                ),
                Text(
                  'Enter amount',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                Builder(
                  builder: (context) {
                    final enteredAmountTextStyle =
                        theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    );
                    final enteredAmountPrefixStyle =
                        enteredAmountTextStyle?.copyWith(
                      fontSize:
                          (enteredAmountTextStyle.fontSize ?? 16) * 0.75,
                    );

                    return TextField(
                      controller: _enteredAmountController,
                      style: enteredAmountTextStyle,
                      readOnly:
                          _selectedPaymentOption == null ||
                          _selectedPaymentOption ==
                              BookingPaymentCollectionOption.codDeposit ||
                          _selectedPaymentOption ==
                          BookingPaymentCollectionOption.fullPayment,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      textInputAction: TextInputAction.done,
                      inputFormatters: <TextInputFormatter>[
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                      ],
                        decoration: InputDecoration(
                          hintText: 'Enter amount',
                          prefixText: '\u20B1',
                          prefixStyle: enteredAmountPrefixStyle,
                          helperText:
                              _selectedPaymentOption ==
                                      BookingPaymentCollectionOption.codDeposit
                                  ? 'COD downpayment:\n$_enteredAmountHelperText'
                                  : _enteredAmountHelperText,
                          helperMaxLines: 3,
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 10),
                _BookingSummaryRow(
                  label: 'Remaining balance',
                  amount: _remainingAmount,
                  emphasizesValue: _hasOutstandingBalance,
                ),
                if (_orderPlacementBalanceMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _orderPlacementBalanceMessage!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: secondaryColor,
                      height: 1.4,
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
  }
}

class _BookingClientSummaryCard extends StatelessWidget {
  const _BookingClientSummaryCard({
    required this.name,
    required this.address,
    required this.contactNumber,
  });

  final String name;
  final String address;
  final String contactNumber;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(width: 34),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                address,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: secondaryColor,
                  fontWeight: FontWeight.w400,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                contactNumber,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: secondaryColor,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Icon(
          Icons.chevron_right_rounded,
          color: secondaryColor,
        ),
      ],
    );
  }
}

class _BookingAddAddressPlaceholder extends StatelessWidget {
  const _BookingAddAddressPlaceholder();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);

    return SizedBox(
      width: double.infinity,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 8, 16, 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.add_rounded,
              size: 22,
              color: secondaryColor,
            ),
            const SizedBox(width: 6),
            Text(
              'User Details',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: secondaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BookingSectionCard extends StatelessWidget {
  const _BookingSectionCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = const BorderRadius.all(Radius.circular(22)),
    this.showsAirmailBorder = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadiusGeometry borderRadius;
  final bool showsAirmailBorder;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: borderRadius,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showsAirmailBorder) const _BookingAirmailBorderStrip(),
          Padding(
            padding: padding,
            child: child,
          ),
          if (showsAirmailBorder) const _BookingAirmailBorderStrip(),
        ],
      ),
    );
  }
}

class _BookingAirmailBorderStrip extends StatelessWidget {
  const _BookingAirmailBorderStrip();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final headerSurfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return SizedBox(
      height: 8,
      child: CustomPaint(
        painter: _BookingAirmailBorderPainter(
          backgroundColor: headerSurfaceColor,
        ),
      ),
    );
  }
}

class _BookingAirmailBorderPainter extends CustomPainter {
  const _BookingAirmailBorderPainter({
    required this.backgroundColor,
  });

  static const Color _red = Color(0xFFD84C5A);
  static const Color _blue = Color(0xFF4F7FEA);
  final Color backgroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    final backgroundPaint = Paint()..color = backgroundColor;
    canvas.drawRect(Offset.zero & size, backgroundPaint);

    const stripeWidth = 18.0;
    const stripeGap = 10.0;
    const stripeSlant = 12.0;
    final stripePaint = Paint()..style = PaintingStyle.fill;

    var stripeIndex = 0;
    for (double x = -stripeWidth; x < size.width + stripeWidth; x += stripeWidth + stripeGap) {
      stripePaint.color = stripeIndex.isEven ? _red : _blue;
      final path = Path()
        ..moveTo(x, 1)
        ..lineTo(x + stripeWidth, 1)
        ..lineTo(x + stripeWidth - stripeSlant, size.height - 1)
        ..lineTo(x - stripeSlant, size.height - 1)
        ..close();
      canvas.drawPath(path, stripePaint);
      stripeIndex++;
    }
  }

  @override
  bool shouldRepaint(covariant _BookingAirmailBorderPainter oldDelegate) =>
      oldDelegate.backgroundColor != backgroundColor;
}

class _BookingSectionTitle extends StatelessWidget {
  const _BookingSectionTitle({
    required this.icon,
    required this.title,
  });

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: primaryColor,
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _BookingSelectableTile extends StatelessWidget {
  const _BookingSelectableTile({
    required this.title,
    required this.subtitle,
    required this.trailingLabel,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String trailingLabel;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;
  final String imageUrl;
  final bool showsOutline;
  final bool showsSelectedBackground;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final normalizedImageUrl = imageUrl.trim();
    final showsImage = normalizedImageUrl.isNotEmpty;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: showsOutline
                ? Border.all(
                    color: isSelected
                        ? primaryColor
                        : theme.dividerColor.withOpacity(0.4),
                    width: isSelected ? 1.5 : 1,
                  )
                : null,
            color: isSelected && showsSelectedBackground
                ? primaryColor.withOpacity(0.08)
                : null,
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 42,
                  height: 42,
                  child: showsImage
                      ? Image.network(
                          normalizedImageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return DecoratedBox(
                              decoration: BoxDecoration(
                                color: primaryColor.withOpacity(0.12),
                              ),
                              child: Icon(
                                icon,
                                color: primaryColor,
                              ),
                            );
                          },
                        )
                      : DecoratedBox(
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.12),
                          ),
                          child: Icon(
                            icon,
                            color: primaryColor,
                          ),
                        ),
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
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: secondaryColor,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    trailingLabel,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: primaryColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Icon(
                    isSelected
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_off_rounded,
                    color: isSelected ? primaryColor : secondaryColor,
                    size: 20,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookingPaymentOptionTile extends StatelessWidget {
  const _BookingPaymentOptionTile({
    required this.title,
    required this.subtitle,
    required this.trailing,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final Widget trailing;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected
                  ? primaryColor
                  : theme.dividerColor.withOpacity(0.24),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: secondaryColor,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  trailing,
                  const SizedBox(height: 8),
                  Icon(
                    isSelected
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_off_rounded,
                    color: isSelected ? primaryColor : secondaryColor,
                    size: 20,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookingItemTile extends StatelessWidget {
  const _BookingItemTile({
    required this.item,
    required this.onDecreaseQuantity,
    required this.onIncreaseQuantity,
  });

  final BookingLineItem item;
  final VoidCallback onDecreaseQuantity;
  final VoidCallback? onIncreaseQuantity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final quantityBackgroundColor = theme.cardColor;
    final itemContainerColor = theme.brightness == Brightness.dark
        ? (theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface)
        : Colors.white;
    final imageUrl = item.productImageUrl.trim();
    final variantName = item.variantName.trim();
    final hasBadgeRow =
        item.category.trim().isNotEmpty ||
        item.discountPercent != null ||
        item.showsTopBrand ||
        item.showsTopReviews;
    final priceTopSpacing = variantName.isNotEmpty ? 4.0 : 0.0;
    final stockSection = item.availableStock > 0
        ? Row(
            children: [
              Icon(
                Icons.inventory_2_outlined,
                size: 14,
                color: secondaryColor,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Stocks: ${item.availableStock}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          )
        : Text(
            'Sold out',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFFD32F2F),
              fontWeight: FontWeight.w600,
            ),
          );
    final quantitySection = Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 5,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: quantityBackgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _BookingQuantityButton(
            icon: Icons.remove_rounded,
            onTap: onDecreaseQuantity,
          ),
          SizedBox(
            width: 28,
            child: Center(
              child: Text(
                '${item.quantity}',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          _BookingQuantityButton(
            icon: Icons.add_rounded,
            onTap: onIncreaseQuantity,
          ),
        ],
      ),
    );

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: itemContainerColor,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 112,
              height: 112,
              child: imageUrl.isEmpty
                  ? _BookingImageFallback(
                      primaryColor: primaryColor,
                      initial: item.productName[0].toUpperCase(),
                    )
                  : Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _BookingImageFallback(
                          primaryColor: primaryColor,
                          initial: item.productName[0].toUpperCase(),
                        );
                      },
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasBadgeRow) ...[
                  SizedBox(
                    width: double.infinity,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (item.category.trim().isNotEmpty)
                              _BookingItemChip(
                                label: item.category,
                                color: primaryColor,
                                icon: Icons.grid_view_outlined,
                              ),
                            if (item.category.trim().isNotEmpty &&
                                (item.discountPercent != null ||
                                    item.showsTopBrand ||
                                    item.showsTopReviews))
                              const SizedBox(width: 6),
                            if (item.discountPercent != null) ...[
                              _BookingItemChip(
                                label: '-${item.discountPercent}%',
                                color: const Color(0xFFC62828),
                                icon: Icons.local_offer_outlined,
                                backgroundColor: const Color(0xFFD32F2F),
                                labelColor: Colors.white,
                                iconColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                labelStyle:
                                    theme.textTheme.labelSmall?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 9,
                                    ),
                              ),
                            ],
                            if (item.showsTopBrand) ...[
                              if (item.discountPercent != null)
                                const SizedBox(width: 6),
                              _BookingItemChip(
                                label: 'Top Selling',
                                color: const Color.fromARGB(255, 15, 194, 176),
                                icon: Icons.workspace_premium_outlined,
                                backgroundColor:
                                    const Color.fromARGB(255, 15, 194, 176),
                                labelColor: Colors.white,
                                iconColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                labelStyle:
                                    theme.textTheme.labelSmall?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 9,
                                    ),
                              ),
                            ],
                            if (item.showsTopReviews) ...[
                              if (item.discountPercent != null ||
                                  item.showsTopBrand)
                                const SizedBox(width: 6),
                              _BookingItemChip(
                                label: 'Top Rating',
                                color: const Color(0xFFF9A825),
                                icon: Icons.star_outline_rounded,
                                backgroundColor: const Color(0xFFF9A825),
                                labelColor: Colors.white,
                                iconColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                labelStyle:
                                    theme.textTheme.labelSmall?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 9,
                                    ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  item.productName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (variantName.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    variantName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: secondaryColor,
                      fontWeight: FontWeight.w500,
                      height: 1.2,
                    ),
                  ),
                ],
                if (priceTopSpacing > 0) SizedBox(height: priceTopSpacing),
                Row(
                  children: [
                    Expanded(
                      child: _BookingPriceText(
                        amount: item.totalPrice,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: primaryColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (item.hasDiscount)
                      _BookingPriceText(
                        amount: item.totalOriginalPrice,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: secondaryColor,
                          fontWeight: FontWeight.w700,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: stockSection,
                    ),
                    const SizedBox(width: 12),
                    quantitySection,
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingQuantityButton extends StatelessWidget {
  const _BookingQuantityButton({
    required this.icon,
    required this.onTap,
  });

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 22,
          height: 22,
          child: Icon(
            icon,
            size: 15,
            color: onTap == null
                ? primaryColor.withOpacity(0.34)
                : primaryColor,
          ),
        ),
      ),
    );
  }
}

class _BookingItemChip extends StatelessWidget {
  const _BookingItemChip({
    required this.label,
    required this.color,
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.iconColor,
    this.padding,
    this.labelStyle,
  });

  final String label;
  final Color color;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? labelColor;
  final Color? iconColor;
  final EdgeInsetsGeometry? padding;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    final resolvedBackgroundColor = backgroundColor ?? color.withOpacity(0.1);
    final resolvedLabelColor = labelColor ?? color;
    final resolvedIconColor = iconColor ?? resolvedLabelColor;

    return Container(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: resolvedBackgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 12,
              color: resolvedIconColor,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style:
                (Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: resolvedLabelColor,
                          fontWeight: FontWeight.w700,
                        ) ??
                        TextStyle(
                          color: resolvedLabelColor,
                          fontWeight: FontWeight.w700,
                        ))
                    .merge(labelStyle)
                    .copyWith(color: resolvedLabelColor),
          ),
        ],
      ),
    );
  }
}

class _BookingSummaryRow extends StatelessWidget {
  const _BookingSummaryRow({
    required this.label,
    this.value,
    this.amount,
    this.emphasizesValue = false,
  }) : assert(
         (value == null) != (amount == null),
         'Provide either value or amount.',
       );

  final String label;
  final String? value;
  final double? amount;
  final bool isStrikethrough;
  final bool emphasizesValue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final valueStyle = theme.textTheme.bodyMedium?.copyWith(
      fontWeight: emphasizesValue ? FontWeight.w800 : FontWeight.w700,
      decoration: isStrikethrough ? TextDecoration.lineThrough : null,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: emphasizesValue ? null : secondaryColor,
                fontWeight: emphasizesValue ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          if (amount != null)
            _BookingPriceText(
              amount: amount!,
              style: valueStyle,
            )
          else
            Text(
              value!,
              style: valueStyle,
            ),
        ],
      ),
    );
  }
}

class _BookingDiscountSummaryBadge extends StatelessWidget {
  const _BookingDiscountSummaryBadge({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFD32F2F),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _BookingPriceText extends StatelessWidget {
  const _BookingPriceText({
    required this.amount,
    this.style,
  });

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final resolvedStyle = DefaultTextStyle.of(context).style.merge(style);
    final symbolFontSize = (resolvedStyle.fontSize ?? 14) * 0.75;

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '\u20B1',
            style: resolvedStyle.copyWith(fontSize: symbolFontSize),
          ),
          TextSpan(
            text: formatCurrencyAmount(amount),
            style: resolvedStyle,
          ),
        ],
      ),
    );
  }
}

class _BookingImageFallback extends StatelessWidget {
  const _BookingImageFallback({
    required this.primaryColor,
    required this.initial,
  });

  final Color primaryColor;
  final String initial;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: primaryColor.withOpacity(0.12),
      ),
      child: Center(
        child: Text(
          initial,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}

class _BookingDeliveryPartnerAvatar extends StatelessWidget {
  const _BookingDeliveryPartnerAvatar({
    required this.imageUrl,
    required this.primaryColor,
    required this.icon,
  });

  final String imageUrl;
  final Color primaryColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final normalizedImageUrl = imageUrl.trim();

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 60,
        height: 60,
        child: normalizedImageUrl.isNotEmpty
            ? Image.network(
                normalizedImageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return DecoratedBox(
                    decoration: BoxDecoration(
                      color: primaryColor.withOpacity(0.12),
                    ),
                    child: Icon(
                      icon,
                      color: primaryColor,
                      size: 18,
                    ),
                  );
                },
              )
            : DecoratedBox(
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.12),
                ),
                child: Icon(
                  icon,
                  color: primaryColor,
                  size: 18,
                ),
              ),
      ),
    );
  }
}

int _normalizeBookingQuantity(
  int quantity, {
  required int availableStock,
}) {
  final normalizedQuantity = quantity.clamp(1, 999).toInt();
  if (availableStock > 0 && normalizedQuantity > availableStock) {
    return availableStock;
  }

  return normalizedQuantity;
}
