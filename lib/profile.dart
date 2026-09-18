import 'package:flutter/material.dart';
import 'package:gms_shopping/cart.dart';
import 'package:gms_shopping/change_password.dart';
import 'package:gms_shopping/chat_support.dart';
import 'package:gms_shopping/error_validation.dart';
import 'package:gms_shopping/favorite_products_store.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/order_store.dart';
import 'package:gms_shopping/services/unified_account_service.dart';
import 'package:gms_shopping/settings_page.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:gms_shopping/widgets/skeleton_loading.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({
    super.key,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.themeModeNotifier,
  });

  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final ValueNotifier<ThemeMode> themeModeNotifier;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  static const String _profileFirstNameKey = 'profile_first_name';
  static const String _profileLastNameKey = 'profile_last_name';
  static const String _profileEmailKey = 'profile_email';
  static const String _profilePhoneKey = 'profile_phone';
  static const String _profileImageUrlKey = 'profile_image_url';
  static const String _profileAddressKey = 'profile_address';
  static const String _profileAddressDetailsKey = 'profile_address_details';
  static const String _profileMemberSinceKey = 'profile_member_since_epoch_ms';

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late final TextEditingController _addressDetailsController;
  late final UnifiedAccountService _unifiedAccountService;

  bool _isLoading = true;
  bool _isRoleActionBusy = false;
  DateTime? _memberSince;
  List<String> _availableModes = const ['buyer'];
  String _activeMode = 'buyer';
  String? _activeCompanyId;
  String _profileImageUrl = '';

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController();
    _lastNameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _addressController = TextEditingController();
    _addressDetailsController = TextEditingController();
    _unifiedAccountService = createUnifiedAccountService();
    _loadProfile();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _addressDetailsController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    await _refreshUnifiedSession();
    final preferences = await SharedPreferences.getInstance();
    final savedMemberSinceEpochMs =
        preferences.getInt(_profileMemberSinceKey) ??
        DateTime.now().millisecondsSinceEpoch;
    final savedMemberSince = DateTime.fromMillisecondsSinceEpoch(
      savedMemberSinceEpochMs,
    );

    if (!preferences.containsKey(_profileMemberSinceKey)) {
      await preferences.setInt(_profileMemberSinceKey, savedMemberSinceEpochMs);
    }

    if (!mounted) {
      return;
    }

    final availableModes = await AuthSession.getAvailableModes();
    final activeMode = await AuthSession.getActiveMode();
    final activeCompanyId = await AuthSession.getActiveCompanyId();

    setState(() {
      _firstNameController.text =
          preferences.getString(_profileFirstNameKey) ?? '';
      _lastNameController.text =
          preferences.getString(_profileLastNameKey) ?? '';
      _emailController.text = preferences.getString(_profileEmailKey) ?? '';
      _phoneController.text = preferences.getString(_profilePhoneKey) ?? '';
      _profileImageUrl = preferences.getString(_profileImageUrlKey) ?? '';
      _addressController.text = preferences.getString(_profileAddressKey) ?? '';
      _addressDetailsController.text =
          preferences.getString(_profileAddressDetailsKey) ?? '';
      _memberSince = savedMemberSince;
      _availableModes = availableModes;
      _activeMode = activeMode;
      _activeCompanyId = activeCompanyId;
      _isLoading = false;
    });
  }

  Future<void> _refreshUnifiedSession() async {
    final accountId = ((await AuthSession.getAccountId()) ?? '').trim();
    final email = ((await AuthSession.getAccountEmail()) ?? '').trim();
    final preferredMode = (await AuthSession.getActiveMode()).trim();
    final preferredCompanyId =
        ((await AuthSession.getActiveCompanyId()) ?? '').trim();
    if (accountId.isEmpty && email.isEmpty) {
      return;
    }

    try {
      final result = await _unifiedAccountService.fetchSession(
        accountId: accountId.isNotEmpty ? accountId : null,
        email: email.isNotEmpty ? email : null,
        activeMode: preferredMode.isNotEmpty ? preferredMode : null,
        companyId: preferredCompanyId.isNotEmpty ? preferredCompanyId : null,
      );
      await AuthSession.setUnifiedSession(result.session);
    } catch (_) {
      // Keep local session data if unified account APIs are not yet reachable.
    }
  }

  Future<void> _refreshSellerAccess() async {
    if (_isRoleActionBusy) {
      return;
    }

    setState(() {
      _isRoleActionBusy = true;
    });

    try {
      await _loadProfile();
      if (!mounted) {
        return;
      }
      if (_availableModes.contains('seller_admin') && _activeMode != 'seller_admin') {
        final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
        if (accountId.isNotEmpty) {
          final sellerCompanyId = _activeCompanyId;
          final result = await _unifiedAccountService.switchRole(
            accountId: accountId,
            activeMode: 'seller_admin',
            companyId:
                (sellerCompanyId != null && sellerCompanyId.trim().isNotEmpty)
                    ? sellerCompanyId.trim()
                    : null,
          );
          await AuthSession.setUnifiedSession(result.session);
          await _loadProfile();
        }
      }
      if (!mounted) {
        return;
      }
      AppSnackBar.showInfo(
        context,
        message:
            _activeMode == 'seller_admin'
                ? 'Seller access refreshed and Seller Mode is now active.'
                : 'Account access refreshed. If payment already cleared, Seller Mode should now appear here.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      AppSnackBar.showError(
        context,
        message: error.toString(),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isRoleActionBusy = false;
        });
      }
    }
  }

  String _formatModeLabel(String mode) {
    switch (mode.trim().toLowerCase()) {
      case 'seller_admin':
        return 'Seller Mode';
      case 'supplier_admin':
        return 'Supplier Mode';
      case 'employee':
        return 'Employee Mode';
      case 'super_admin':
        return 'Super Admin';
      case 'buyer':
      default:
        return 'Buyer Mode';
    }
  }

  Future<void> _switchMode(String mode) async {
    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    if (accountId.isEmpty || _isRoleActionBusy) {
      return;
    }

    setState(() {
      _isRoleActionBusy = true;
    });

    try {
      final result = await _unifiedAccountService.switchRole(
        accountId: accountId,
        activeMode: mode,
        companyId: _activeCompanyId,
      );
      await AuthSession.setUnifiedSession(result.session);
      await _loadProfile();
      if (!mounted) {
        return;
      }
      AppSnackBar.showSuccess(
        context,
        message: 'Switched to ${_formatModeLabel(mode)}.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      AppSnackBar.showError(
        context,
        message: error.toString(),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isRoleActionBusy = false;
        });
      }
    }
  }

  Future<void> _openBecomeSellerSheet() async {
    final companyNameController = TextEditingController();
    final businessTypeController = TextEditingController();
    final paymentReferenceController = TextEditingController();
    var sellerPlans = <Map<String, dynamic>>[
      const {
        'id': 'starter-seller-monthly',
        'name': 'Starter Seller Plan',
        'billingCycle': 'monthly',
        'amount': 499,
        'currencyCode': 'PHP',
      },
    ];
    var paymentPartners = <Map<String, dynamic>>[
      const {
        'id': 'manual',
        'name': 'Manual verification',
      },
    ];

    try {
      final catalogResult = await _unifiedAccountService.fetchSellerPlanCatalog();
      final plansRaw = catalogResult.catalog['plans'];
      final partnersRaw = catalogResult.catalog['paymentPartners'];
      if (plansRaw is List && plansRaw.isNotEmpty) {
        sellerPlans = plansRaw
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList(growable: false);
      }
      if (partnersRaw is List && partnersRaw.isNotEmpty) {
        paymentPartners = partnersRaw
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList(growable: false);
      }
    } catch (_) {
      // Keep safe fallback values when the catalog is unavailable.
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        var isSubmitting = false;
        var selectedPlanId =
            sellerPlans.first['id']?.toString().trim() ?? 'starter-seller-monthly';
        var selectedPartnerId =
            paymentPartners.first['id']?.toString().trim() ?? 'manual';

        return Padding(
          padding: EdgeInsets.only(
            left: 12,
            right: 12,
            top: 12,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 12,
          ),
          child: StatefulBuilder(
            builder: (modalContext, setModalState) {
              Map<String, dynamic> selectedPlan() {
                return sellerPlans.firstWhere(
                  (item) => item['id']?.toString().trim() == selectedPlanId,
                  orElse: () => sellerPlans.first,
                );
              }

              Map<String, dynamic> selectedPartner() {
                return paymentPartners.firstWhere(
                  (item) => item['id']?.toString().trim() == selectedPartnerId,
                  orElse: () => paymentPartners.first,
                );
              }

              Future<void> submit() async {
                final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
                if (accountId.isEmpty) {
                  if (mounted) {
                    AppSnackBar.showError(
                      context,
                      message: 'Sign in first before upgrading to Seller Mode.',
                    );
                  }
                  return;
                }

                final companyName = companyNameController.text.trim();
                final businessType = businessTypeController.text.trim();
                if (companyName.length < 2) {
                  AppSnackBar.showError(
                    modalContext,
                    message: 'Enter a company name with at least 2 characters.',
                  );
                  return;
                }

                if (isSubmitting) {
                  return;
                }

                setModalState(() {
                  isSubmitting = true;
                });

                try {
                  final plan = selectedPlan();
                  final partner = selectedPartner();
                  final startResult =
                      await _unifiedAccountService.startBecomeSeller(
                    accountId: accountId,
                    companyName: companyName,
                    businessType: businessType,
                    planName:
                        plan['name']?.toString().trim() ?? 'Starter Seller Plan',
                  );
                  await AuthSession.setUnifiedSession(startResult.session);

                  final companiesRaw = startResult.session['companies'];
                  var companyId = '';
                  if (companiesRaw is List) {
                    for (final item in companiesRaw) {
                      if (item is Map) {
                        final company = item['company'];
                        final type = company is Map
                            ? company['type']
                                    ?.toString()
                                    .trim()
                                    .toLowerCase() ??
                                ''
                            : '';
                        if (type == 'seller') {
                          companyId = item['companyId']?.toString().trim() ?? '';
                          if (companyId.isNotEmpty) {
                            break;
                          }
                        }
                      }
                    }
                  }

                  if (companyId.isEmpty) {
                    throw Exception(
                      'Seller onboarding was created but no seller company ID was returned.',
                    );
                  }

                  final checkoutResult =
                      await _unifiedAccountService.createSellerCheckoutIntent(
                    accountId: accountId,
                    companyId: companyId,
                    planName:
                        plan['name']?.toString().trim() ?? 'Starter Seller Plan',
                    billingCycle:
                        plan['billingCycle']?.toString().trim() ?? 'monthly',
                    paymentGateway:
                        partner['name']?.toString().trim() ?? 'manual',
                    paymentReference:
                        paymentReferenceController.text.trim(),
                    amount: (plan['amount'] as num?)?.toDouble() ?? 0,
                    currencyCode:
                        plan['currencyCode']?.toString().trim() ?? 'PHP',
                  );
                  final checkoutIntent = checkoutResult.checkoutIntent;
                  final checkoutUrl =
                      checkoutIntent['checkoutUrl']?.toString().trim() ?? '';
                  final shouldLaunchHostedCheckout =
                      checkoutUrl.startsWith('http://') ||
                          checkoutUrl.startsWith('https://');

                  if (shouldLaunchHostedCheckout) {
                    final uri = Uri.tryParse(checkoutUrl);
                    if (uri == null) {
                      throw Exception('Hosted checkout URL is invalid.');
                    }
                    final launched = await launchUrl(
                      uri,
                      mode: LaunchMode.externalApplication,
                    );
                    if (!launched) {
                      throw Exception('Unable to open hosted checkout.');
                    }
                    if (!mounted) {
                      return;
                    }
                    Navigator.of(sheetContext).pop();
                    AppSnackBar.showInfo(
                      context,
                      message:
                          'Hosted checkout opened. Seller Mode will activate after payment confirmation.',
                    );
                    return;
                  }

                  final confirmResult =
                      await _unifiedAccountService.confirmBecomeSeller(
                    accountId: accountId,
                    companyId: companyId,
                    paymentGateway:
                        partner['name']?.toString().trim() ?? 'manual',
                    paymentReference:
                        checkoutIntent['paymentReference']?.toString().trim().isNotEmpty ==
                                true
                            ? checkoutIntent['paymentReference']
                                .toString()
                                .trim()
                            : paymentReferenceController.text.trim().isEmpty
                                ? 'MANUAL-${DateTime.now().millisecondsSinceEpoch}'
                                : paymentReferenceController.text.trim(),
                    amount: (plan['amount'] as num?)?.toDouble() ?? 0,
                    currencyCode:
                        plan['currencyCode']?.toString().trim() ?? 'PHP',
                    planName:
                        plan['name']?.toString().trim() ?? 'Starter Seller Plan',
                    billingCycle:
                        plan['billingCycle']?.toString().trim() ?? 'monthly',
                  );
                  await AuthSession.setUnifiedSession(confirmResult.session);
                  await _loadProfile();
                  if (!mounted) {
                    return;
                  }
                  Navigator.of(sheetContext).pop();
                  AppSnackBar.showSuccess(
                    context,
                    message:
                        'Seller upgrade submitted. If your account is verified, Seller Mode is now available.',
                  );
                } catch (error) {
                  if (!mounted) {
                    return;
                  }
                  AppSnackBar.showError(
                    modalContext,
                    message: error.toString(),
                  );
                } finally {
                  if (modalContext.mounted) {
                    setModalState(() {
                      isSubmitting = false;
                    });
                  }
                }
              }

              return Container(
                decoration: BoxDecoration(
                  color: widget.backgroundColor,
                  borderRadius: BorderRadius.circular(18),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Become a Seller',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: widget.titleColor,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Create your seller company and activate Seller Mode on this same account.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: widget.secondaryColor,
                            height: 1.4,
                          ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: selectedPlanId,
                      decoration: const InputDecoration(
                        labelText: 'Seller plan',
                      ),
                      items: sellerPlans
                          .map(
                            (plan) => DropdownMenuItem<String>(
                              value: plan['id']?.toString().trim() ?? '',
                              child: Text(
                                '${plan['name'] ?? 'Plan'} - ${plan['currencyCode'] ?? 'PHP'} ${plan['amount'] ?? 0}/${plan['billingCycle'] ?? 'month'}',
                              ),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: isSubmitting
                          ? null
                          : (value) {
                              if (value == null || value.trim().isEmpty) {
                                return;
                              }
                              setModalState(() {
                                selectedPlanId = value;
                              });
                            },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: companyNameController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Company name',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: businessTypeController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Business type',
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: selectedPartnerId,
                      decoration: const InputDecoration(
                        labelText: 'Payment partner',
                      ),
                      items: paymentPartners
                          .map(
                            (partner) => DropdownMenuItem<String>(
                              value: partner['id']?.toString().trim() ?? '',
                              child: Text(
                                partner['name']?.toString().trim().isNotEmpty ==
                                        true
                                    ? partner['name'].toString().trim()
                                    : 'Manual verification',
                              ),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: isSubmitting
                          ? null
                          : (value) {
                              if (value == null || value.trim().isEmpty) {
                                return;
                              }
                              setModalState(() {
                                selectedPartnerId = value;
                              });
                            },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: paymentReferenceController,
                      textInputAction: TextInputAction.done,
                      decoration: const InputDecoration(
                        labelText: 'Payment reference',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: widget.surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${selectedPlan()['name'] ?? 'Seller Plan'}: ${selectedPlan()['currencyCode'] ?? 'PHP'} ${selectedPlan()['amount'] ?? 0} ${selectedPlan()['billingCycle'] ?? 'monthly'}. If a hosted gateway is configured, the app opens checkout automatically.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: widget.secondaryColor,
                              height: 1.35,
                            ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: isSubmitting ? null : submit,
                      icon: isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: SkeletonCircle(size: 18),
                            )
                          : const Icon(Icons.workspace_premium_rounded),
                      label: Text(
                        isSubmitting ? 'Processing...' : 'Activate Seller Plan',
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    companyNameController.dispose();
    businessTypeController.dispose();
    paymentReferenceController.dispose();
  }

  Future<bool> _saveProfile(BuildContext feedbackContext) async {
    FocusScope.of(feedbackContext).unfocus();

    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) {
      AppSnackBar.showError(
        feedbackContext,
        message: 'Pakicheck ang email o mobile number bago i-save.',
      );
      return false;
    }

    final preferences = await SharedPreferences.getInstance();
    final memberSinceEpochMs =
        _memberSince?.millisecondsSinceEpoch ??
        DateTime.now().millisecondsSinceEpoch;

    await preferences.setString(
      _profileFirstNameKey,
      _firstNameController.text.trim(),
    );
    await preferences.setString(
      _profileLastNameKey,
      _lastNameController.text.trim(),
    );
    await preferences.setString(_profileEmailKey, _emailController.text.trim());
    await preferences.setString(_profilePhoneKey, _phoneController.text.trim());
    await preferences.setString(
      _profileAddressKey,
      _addressController.text.trim(),
    );
    await preferences.setString(
      _profileAddressDetailsKey,
      _addressDetailsController.text.trim(),
    );
    await preferences.setInt(_profileMemberSinceKey, memberSinceEpochMs);

    if (!mounted) {
      return false;
    }

    setState(() {
      _memberSince = DateTime.fromMillisecondsSinceEpoch(memberSinceEpochMs);
    });

    AppSnackBar.showSuccess(
      feedbackContext,
      message: 'Profile saved successfully.',
    );
    return true;
  }

  Future<void> _openPersonalInformationSheet(Color onPrimaryColor) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        var isSaving = false;

        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            Future<void> handleSave() async {
              if (isSaving) {
                return;
              }

              setModalState(() {
                isSaving = true;
              });

              final didSave = await _saveProfile(modalContext);
              if (!mounted) {
                return;
              }

              if (didSave) {
                Navigator.of(context).pop();
                return;
              }

              setModalState(() {
                isSaving = false;
              });
            }

            return AnimatedPadding(
              duration: appMotionFrames(11),
              curve: Curves.easeOut,
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(modalContext).viewInsets.bottom,
              ),
              child: _buildPersonalInformationSheet(
                sheetContext: modalContext,
                onPrimaryColor: onPrimaryColor,
                isSaving: isSaving,
                onSave: handleSave,
              ),
            );
          },
        );
      },
    );
  }

  void _handleSignOut() async {
    // Don't clear all stores - cart/favorites/orders should persist per account
    // Just clear the session and reload stores for guest mode
    await ChatSupportStore.instance.clearForLogout();
    await AuthSession.clearSession();
    await GuestSession.continueAsGuest();

    // Reload stores for guest mode (null account ID)
    await CartStore.instance.reloadForCurrentAccount();
    await FavoriteProductsStore.instance.reloadForCurrentAccount();
    await OrderStore.instance.reloadForCurrentAccount();

    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  Future<void> _openChangePassword() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      AppSnackBar.showError(
        context,
        message: 'Maglagay muna ng email address bago mag-change password.',
      );
      return;
    }

    if (_validateEmail(email) != null) {
      AppSnackBar.showError(
        context,
        message: 'Ayusin muna ang email address bago mag-change password.',
      );
      return;
    }

    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => ChangePasswordPage(email: email)),
    );
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) {
      return null;
    }

    final emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailPattern.hasMatch(email)) {
      return 'Invalid email';
    }

    return null;
  }

  String? _validatePhone(String? value) {
    final phone = value?.trim() ?? '';
    if (phone.isEmpty) {
      return null;
    }

    final digitCount = phone.replaceAll(RegExp(r'\D'), '').length;
    if (digitCount < 7) {
      return 'Invalid number';
    }

    return null;
  }

  Widget _buildPersonalInformationSheet({
    required BuildContext sheetContext,
    required Color onPrimaryColor,
    required bool isSaving,
    required Future<void> Function() onSave,
  }) {
    final mediaQuery = MediaQuery.of(sheetContext);

    return SafeArea(
      top: false,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: mediaQuery.size.height * 0.9),
        child: Container(
          decoration: BoxDecoration(
            color: widget.backgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: widget.secondaryColor.withOpacity(0.24),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.person_outline_rounded,
                      size: 20,
                      color: widget.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Personal information',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: widget.titleColor,
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Review and update your saved account details.',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: widget.secondaryColor.withOpacity(
                                    0.78,
                                  ),
                                  height: 1.35,
                                ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(sheetContext).maybePop(),
                      icon: Icon(
                        Icons.close_rounded,
                        color: widget.secondaryColor,
                      ),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  child: _ProfileFormCard(
                    surfaceColor: widget.surfaceColor,
                    borderColor: Colors.transparent,
                    child: Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _firstNameController,
                                  textInputAction: TextInputAction.next,
                                  textCapitalization: TextCapitalization.words,
                                  inputFormatters: [
                                    ErrorValidation.nameInputFormatter,
                                  ],
                                  validator: ErrorValidation.validateFirstName,
                                  decoration: const InputDecoration(
                                    labelText: 'First name',
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextFormField(
                                  controller: _lastNameController,
                                  textInputAction: TextInputAction.next,
                                  textCapitalization: TextCapitalization.words,
                                  inputFormatters: [
                                    ErrorValidation.nameInputFormatter,
                                  ],
                                  validator: ErrorValidation.validateLastName,
                                  decoration: const InputDecoration(
                                    labelText: 'Last name',
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _emailController,
                            textInputAction: TextInputAction.next,
                            keyboardType: TextInputType.emailAddress,
                            validator: _validateEmail,
                            decoration: const InputDecoration(
                              labelText: 'Email address',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _phoneController,
                            textInputAction: TextInputAction.next,
                            keyboardType: TextInputType.phone,
                            validator: _validatePhone,
                            decoration: const InputDecoration(
                              labelText: 'Mobile number',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _addressController,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Address',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _addressDetailsController,
                            textInputAction: TextInputAction.done,
                            minLines: 2,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: 'Address details',
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: isSaving ? null : onSave,
                    icon: isSaving
                        ? const SkeletonCircle(size: 18)
                        : const Icon(Icons.save_rounded),
                    label: Text(
                      isSaving ? 'Saving profile...' : 'Save Profile',
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  double get _completionValue {
    var completedFields = 0;
    final values = <String>[
      _firstNameController.text.trim(),
      _lastNameController.text.trim(),
      _emailController.text.trim(),
      _phoneController.text.trim(),
      _addressController.text.trim(),
      _addressDetailsController.text.trim(),
    ];

    for (final value in values) {
      if (value.isNotEmpty) {
        completedFields++;
      }
    }

    return completedFields / values.length;
  }

  String get _displayName {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final fullName = [firstName, lastName].where((n) => n.isNotEmpty).join(' ');
    return fullName.isEmpty ? 'Guest Shopper' : fullName;
  }

  String get _displaySubtitle {
    final email = _emailController.text.trim();
    if (email.isNotEmpty) {
      return email;
    }

    return 'Add your account details for faster checkout.';
  }

  String get _completionLabel =>
      '${(_completionValue * 100).round()}% complete';

  String get _initials {
    final words = _displayName
        .split(RegExp(r'\s+'))
        .where((word) => word.trim().isNotEmpty)
        .toList(growable: false);

    if (words.isEmpty) {
      return 'GS';
    }

    if (words.length == 1) {
      return words.first.characters.take(2).toString().toUpperCase();
    }

    return '${words.first.characters.first}${words.last.characters.first}'
        .toUpperCase();
  }

  String get _memberSinceLabel {
    final memberSince = _memberSince;
    if (memberSince == null) {
      return 'New member';
    }

    const monthLabels = <String>[
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

    return 'Member since ${monthLabels[memberSince.month - 1]} ${memberSince.year}';
  }

  int _pendingOrderCount(List<OrderEntryData> orders) {
    return orders.where((order) {
      switch (order.stage) {
        case OrderStageKey.toPay:
        case OrderStageKey.toPrepare:
        case OrderStageKey.toShip:
        case OrderStageKey.toReceive:
          return true;
        case OrderStageKey.toReview:
        case OrderStageKey.returnRequest:
        case OrderStageKey.cancelled:
          return false;
      }
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return ColoredBox(
        color: widget.backgroundColor,
        child: const SkeletonFormPanel(),
      );
    }

    final theme = Theme.of(context);
    final onPrimaryColor = theme.colorScheme.onPrimary;

    return ColoredBox(
      color: widget.backgroundColor,
      child: ValueListenableBuilder<List<OrderEntryData>>(
        valueListenable: OrderStore.instance.ordersNotifier,
        builder: (context, orders, _) {
          return ValueListenableBuilder<List<String>>(
            valueListenable:
                FavoriteProductsStore.instance.favoriteProductIdsNotifier,
            builder: (context, favoriteIds, _) {
              return RefreshIndicator(
                color: widget.primaryColor,
                onRefresh: _loadProfile,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(0, 0, 0, 0),
                  children: [
                    _ProfileHeroCard(
                      primaryColor: widget.primaryColor,
                      onPrimaryColor: onPrimaryColor,
                      title: _displayName,
                      subtitle: _displaySubtitle,
                      memberSinceLabel: _memberSinceLabel,
                      completionLabel: _completionLabel,
                      completionValue: _completionValue,
                      initials: _initials,
                      imageUrl: _profileImageUrl,
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(10, 12, 10, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: _ProfileStatCard(
                                  surfaceColor: widget.surfaceColor,
                                  titleColor: widget.titleColor,
                                  secondaryColor: widget.secondaryColor,
                                  primaryColor: widget.primaryColor,
                                  label: 'Points',
                                  value: '${orders.length}',
                                  icon: Icons.stars_rounded,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _ProfileStatCard(
                                  surfaceColor: widget.surfaceColor,
                                  titleColor: widget.titleColor,
                                  secondaryColor: widget.secondaryColor,
                                  primaryColor: widget.primaryColor,
                                  label: 'Pending',
                                  value: '${_pendingOrderCount(orders)}',
                                  icon: Icons.local_shipping_rounded,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _ProfileStatCard(
                                  surfaceColor: widget.surfaceColor,
                                  titleColor: widget.titleColor,
                                  secondaryColor: widget.secondaryColor,
                                  primaryColor: widget.primaryColor,
                                  label: 'Favorites',
                                  value: '${favoriteIds.length}',
                                  icon: Icons.favorite_rounded,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: widget.surfaceColor,
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.switch_account_rounded,
                                      color: widget.primaryColor,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Account mode',
                                            style: theme.textTheme.titleMedium
                                                ?.copyWith(
                                              color: widget.titleColor,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Signed in once, switch views based on your available roles.',
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                              color: widget.secondaryColor,
                                              height: 1.35,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  decoration: BoxDecoration(
                                    color: widget.backgroundColor,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _formatModeLabel(_activeMode),
                                          style: theme.textTheme.titleSmall
                                              ?.copyWith(
                                            color: widget.titleColor,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '${_availableModes.length} role${_availableModes.length == 1 ? '' : 's'}',
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                          color: widget.secondaryColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: _availableModes.map((mode) {
                                    final isSelected = mode == _activeMode;
                                    return ChoiceChip(
                                      label: Text(_formatModeLabel(mode)),
                                      selected: isSelected,
                                      onSelected: _isRoleActionBusy
                                          ? null
                                          : (_) => _switchMode(mode),
                                    );
                                  }).toList(growable: false),
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: _isRoleActionBusy
                                        ? null
                                        : _refreshSellerAccess,
                                    icon: const Icon(Icons.refresh_rounded),
                                    label: const Text('Refresh Seller Access'),
                                  ),
                                ),
                                if (!_availableModes.contains('seller_admin'))
                                  Padding(
                                    padding: const EdgeInsets.only(top: 12),
                                    child: SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton.icon(
                                        onPressed: _isRoleActionBusy
                                            ? null
                                            : _openBecomeSellerSheet,
                                        icon: const Icon(
                                          Icons.store_mall_directory_rounded,
                                        ),
                                        label: const Text('Become a Seller'),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(top: 12),
                      padding: const EdgeInsets.fromLTRB(10, 16, 10, 16),
                      decoration: BoxDecoration(color: widget.surfaceColor),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Quick actions',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: widget.titleColor,
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Open related account tools from one place.',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: widget.secondaryColor.withOpacity(
                                    0.78,
                                  ),
                                  height: 1.4,
                                ),
                          ),
                          const SizedBox(height: 16),
                          IntrinsicHeight(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Expanded(
                                  child: _ProfileActionTile(
                                    surfaceColor: widget.backgroundColor,
                                    titleColor: widget.titleColor,
                                    secondaryColor: widget.secondaryColor,
                                    primaryColor: widget.primaryColor,
                                    icon: Icons.person_outline_rounded,
                                    title: 'Personal information',
                                    subtitle:
                                        'Open and edit your account details.',
                                    onTap: () => _openPersonalInformationSheet(
                                      onPrimaryColor,
                                    ),
                                    compact: true,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _ProfileActionTile(
                                    surfaceColor: widget.backgroundColor,
                                    titleColor: widget.titleColor,
                                    secondaryColor: widget.secondaryColor,
                                    primaryColor: widget.primaryColor,
                                    icon: Icons.lock_reset_rounded,
                                    title: 'Change password',
                                    subtitle:
                                        'Update your account password here.',
                                    onTap: _openChangePassword,
                                    compact: true,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => const SettingsPage(),
                                  ),
                                );
                              },
                              icon: const Icon(
                                Icons.settings_rounded,
                                size: 18,
                              ),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(52),
                                side: BorderSide(color: widget.primaryColor),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                foregroundColor: widget.primaryColor,
                              ),
                              label: const Text('Settings'),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: _handleSignOut,
                              icon: const Icon(Icons.logout_rounded, size: 18),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(52),
                                side: const BorderSide(
                                  color: Color(0xFFC62828),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                foregroundColor: const Color(0xFFC62828),
                              ),
                              label: const Text('Sign out'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _ProfileHeroCard extends StatelessWidget {
  const _ProfileHeroCard({
    required this.primaryColor,
    required this.onPrimaryColor,
    required this.title,
    required this.subtitle,
    required this.memberSinceLabel,
    required this.completionLabel,
    required this.completionValue,
    required this.initials,
    required this.imageUrl,
  });

  final Color primaryColor;
  final Color onPrimaryColor;
  final String title;
  final String subtitle;
  final String memberSinceLabel;
  final String completionLabel;
  final double completionValue;
  final String initials;
  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor,
            Color.lerp(primaryColor, Colors.black, 0.24) ?? primaryColor,
          ],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -10,
            right: -6,
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: -24,
            left: 72,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.white.withOpacity(0.18),
                    backgroundImage:
                        imageUrl.trim().isEmpty ? null : NetworkImage(imageUrl),
                    child: imageUrl.trim().isEmpty
                        ? Text(
                            initials,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: onPrimaryColor,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                color: onPrimaryColor,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: onPrimaryColor.withOpacity(0.86),
                                height: 1.35,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.verified_user_rounded,
                      color: onPrimaryColor,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        memberSinceLabel,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: onPrimaryColor.withOpacity(0.9),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Profile strength',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: onPrimaryColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    completionLabel,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: onPrimaryColor.withOpacity(0.9),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: completionValue,
                  minHeight: 10,
                  backgroundColor: Colors.white.withOpacity(0.18),
                  valueColor: AlwaysStoppedAnimation<Color>(onPrimaryColor),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProfileStatCard extends StatelessWidget {
  const _ProfileStatCard({
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.label,
    required this.value,
    required this.icon,
  });

  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: primaryColor, size: 28),
          const SizedBox(height: 14),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: titleColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: secondaryColor.withOpacity(0.8),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileSectionHeading extends StatelessWidget {
  const _ProfileSectionHeading({
    required this.icon,
    required this.title,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    this.subtitle = '',
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: primaryColor),
            const SizedBox(width: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: titleColor,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        if (subtitle.trim().isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: secondaryColor.withOpacity(0.78),
              height: 1.4,
            ),
          ),
        ],
      ],
    );
  }
}

class _ProfileFormCard extends StatelessWidget {
  const _ProfileFormCard({
    required this.surfaceColor,
    required this.borderColor,
    required this.child,
  });

  final Color surfaceColor;
  final Color borderColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: child,
    );
  }
}

class _ProfileSectionCard extends StatelessWidget {
  const _ProfileSectionCard({
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: titleColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: secondaryColor.withOpacity(0.78),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _ProfileActionTile extends StatelessWidget {
  const _ProfileActionTile({
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.compact = false,
    this.trailingIcon,
  });

  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool compact;
  final IconData? trailingIcon;

  @override
  Widget build(BuildContext context) {
    final resolvedTrailingIcon =
        trailingIcon ?? Icons.arrow_forward_ios_rounded;
    final tileBorderRadius = BorderRadius.circular(compact ? 8 : 20);

    return Material(
      color: compact ? Colors.transparent : surfaceColor,
      borderRadius: tileBorderRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: tileBorderRadius,
        child: Container(
          decoration: compact
              ? BoxDecoration(
                  borderRadius: tileBorderRadius,
                  border: Border.all(
                    color: secondaryColor.withOpacity(0.24),
                    width: 1,
                  ),
                )
              : null,
          padding: const EdgeInsets.all(14),
          child: compact
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(icon, color: primaryColor),
                        ),
                        const Spacer(),
                        Icon(
                          resolvedTrailingIcon,
                          size: 16,
                          color: secondaryColor.withOpacity(0.74),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: secondaryColor.withOpacity(0.78),
                        height: 1.35,
                      ),
                    ),
                  ],
                )
              : Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: primaryColor),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(
                                  color: titleColor,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            subtitle,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: secondaryColor.withOpacity(0.78),
                                  height: 1.35,
                                ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      resolvedTrailingIcon,
                      size: 16,
                      color: secondaryColor.withOpacity(0.74),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
