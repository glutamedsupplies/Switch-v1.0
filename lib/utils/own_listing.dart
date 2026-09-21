import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/unified_account_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:url_launcher/url_launcher.dart';

class OwnListingCompany {
  const OwnListingCompany({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;
}

class OwnListingScope {
  const OwnListingScope({
    this.accountId = '',
    this.email = '',
    this.activeCompanyId = '',
    this.companyIds = const <String>{},
    this.companyNames = const <String>{},
    this.companies = const <OwnListingCompany>[],
  });

  final String accountId;
  final String email;
  final String activeCompanyId;
  final Set<String> companyIds;
  final Set<String> companyNames;
  final List<OwnListingCompany> companies;

  bool get isLoggedIn => accountId.isNotEmpty || email.isNotEmpty;

  String get accountKey =>
      '${normalizeOwnListingKey(accountId)}|${normalizeOwnListingKey(email)}';
}

OwnListingScope? _cachedOwnListingScope;
String _cachedOwnListingAccountKey = '';
Future<OwnListingScope>? _pendingOwnListingScope;
String _pendingOwnListingAccountKey = '';

String normalizeOwnListingKey(String value) {
  return value.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
}

void _addIdentityKey(Set<String> keys, Object? value) {
  final normalized = normalizeOwnListingKey(value?.toString() ?? '');
  if (normalized.isEmpty || normalized == 'admin') {
    return;
  }
  keys.add(normalized);
}

void _addCompanyName(Set<String> names, Object? value) {
  final normalized = normalizeOwnListingKey(value?.toString() ?? '');
  if (normalized.length < 2) {
    return;
  }
  names.add(normalized);
}

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return const <String, dynamic>{};
}

OwnListingScope ownListingScopeFromSession(
  Map<String, dynamic> session, {
  String fallbackAccountId = '',
  String fallbackEmail = '',
}) {
  final account = _asMap(session['account']);
  final activeCompany = _asMap(session['activeCompany']);
  final companyIds = <String>{};
  final companyNames = <String>{};
  final companies = <OwnListingCompany>[];
  final seenCompanyIds = <String>{};

  final accountId = [
    account['id'],
    account['accountId'],
    account['accountCode'],
    session['accountId'],
    fallbackAccountId,
  ].map((value) => value?.toString().trim() ?? '').firstWhere(
        (value) => value.isNotEmpty,
        orElse: () => '',
      );
  final email = [
    account['email'],
    session['email'],
    fallbackEmail,
  ].map((value) => value?.toString().trim() ?? '').firstWhere(
        (value) => value.isNotEmpty,
        orElse: () => '',
      );

  // Buyer profile adminId is a shared tenant scope, not proof that this
  // account owns a listing. Only the current account id and seller companies
  // from this session should hide Buy / Chat / Add to Cart.

  void collectCompany(Map<String, dynamic> company, String fallbackId) {
    final companyId = [
      company['id'],
      company['companyId'],
      fallbackId,
    ].map((value) => value?.toString().trim() ?? '').firstWhere(
          (value) => value.isNotEmpty,
          orElse: () => '',
        );
    _addIdentityKey(companyIds, companyId);
    for (final key in const [
      'publicName',
      'name',
      'legalName',
      'maskedPublicName',
      'storeName',
      'businessName',
    ]) {
      _addCompanyName(companyNames, company[key]);
    }

    final profileData = _asMap(company['profileData']);
    for (final key in const [
      'publicName',
      'name',
      'companyName',
      'storeName',
      'businessName',
    ]) {
      _addCompanyName(companyNames, profileData[key]);
    }

    if (companyId.isEmpty || seenCompanyIds.contains(companyId.toLowerCase())) {
      return;
    }
    final name = [
      company['publicName'],
      company['name'],
      company['legalName'],
      company['maskedPublicName'],
      company['storeName'],
      company['businessName'],
    ].map((value) => value?.toString().trim() ?? '').firstWhere(
          (value) => value.isNotEmpty,
          orElse: () => 'Company',
        );
    seenCompanyIds.add(companyId.toLowerCase());
    companies.add(OwnListingCompany(id: companyId, name: name));
  }

  final companiesRaw = session['companies'];
  if (companiesRaw is List) {
    for (final item in companiesRaw) {
      final membership = _asMap(item);
      final company = _asMap(membership['company']);
      final type = company['type']?.toString().trim().toLowerCase() ?? '';
      final role =
          membership['membershipRole']?.toString().trim().toLowerCase() ?? '';
      if (type.isNotEmpty && type != 'seller') {
        continue;
      }
      if (role.isNotEmpty && role != 'owner' && role != 'seller_admin') {
        continue;
      }
      collectCompany(
        company.isEmpty ? membership : company,
        membership['companyId']?.toString() ?? '',
      );
    }
  }

  final activeCompanyId = session['activeCompanyId']?.toString().trim() ?? '';
  if (activeCompany.isNotEmpty &&
      companyIds.contains(normalizeOwnListingKey(activeCompanyId.isNotEmpty
          ? activeCompanyId
          : activeCompany['id']?.toString() ?? ''))) {
    collectCompany(activeCompany, activeCompanyId);
  }

  return OwnListingScope(
    accountId: accountId,
    email: email,
    activeCompanyId: session['activeCompanyId']?.toString().trim() ?? '',
    companyIds: Set<String>.unmodifiable(companyIds),
    companyNames: Set<String>.unmodifiable(companyNames),
    companies: List<OwnListingCompany>.unmodifiable(companies),
  );
}

void clearOwnListingScopeCache() {
  _cachedOwnListingScope = null;
  _cachedOwnListingAccountKey = '';
}

Future<OwnListingScope> loadOwnListingScope({bool forceRefresh = false}) async {
  final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
  final email = (await AuthSession.getAccountEmail())?.trim() ?? '';
  final accountKey =
      '${normalizeOwnListingKey(accountId)}|${normalizeOwnListingKey(email)}';
  if (accountId.isEmpty && email.isEmpty) {
    clearOwnListingScopeCache();
    return const OwnListingScope();
  }

  final cached = _cachedOwnListingScope;
  if (!forceRefresh &&
      cached != null &&
      _cachedOwnListingAccountKey == accountKey) {
    return cached;
  }

  if (_pendingOwnListingScope != null &&
      _pendingOwnListingAccountKey == accountKey) {
    return _pendingOwnListingScope!;
  }

  final next = _loadOwnListingScope(
    accountId: accountId,
    email: email,
    accountKey: accountKey,
  );
  _pendingOwnListingScope = next;
  _pendingOwnListingAccountKey = accountKey;
  return next;
}

Future<OwnListingScope> _loadOwnListingScope({
  required String accountId,
  required String email,
  required String accountKey,
}) async {
  try {
    var session = const <String, dynamic>{};
    try {
      final result = await createUnifiedAccountService().fetchSession(
        accountId: accountId.isEmpty ? null : accountId,
        email: email.isEmpty ? null : email,
      );
      session = result.session;
    } catch (_) {
      // Fall back to the current account id only. Do not reuse another account.
    }

    final currentAccountId = (await AuthSession.getAccountId())?.trim() ?? '';
    final currentEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
    final currentKey =
        '${normalizeOwnListingKey(currentAccountId)}|${normalizeOwnListingKey(currentEmail)}';
    if (currentKey != accountKey) {
      return loadOwnListingScope(forceRefresh: true);
    }

    final sessionScope = ownListingScopeFromSession(session);
    final requestedIds = <String>{
      normalizeOwnListingKey(accountId),
      normalizeOwnListingKey(email),
    }..remove('');
    final sessionIds = <String>{
      normalizeOwnListingKey(sessionScope.accountId),
      normalizeOwnListingKey(sessionScope.email),
    }..remove('');
    final sessionMatchesRequest = sessionIds.isEmpty ||
        sessionIds.any(requestedIds.contains);
    final scope = sessionMatchesRequest
        ? ownListingScopeFromSession(
            session,
            fallbackAccountId: currentAccountId,
            fallbackEmail: currentEmail,
          )
        : ownListingScopeFromSession(
            const <String, dynamic>{},
            fallbackAccountId: currentAccountId,
            fallbackEmail: currentEmail,
          );
    if (scope.accountKey != accountKey && scope.accountKey.isNotEmpty) {
      clearOwnListingScopeCache();
      return scope;
    }
    _cachedOwnListingScope = scope;
    _cachedOwnListingAccountKey = accountKey;
    return scope;
  } finally {
    if (_pendingOwnListingAccountKey == accountKey) {
      _pendingOwnListingScope = null;
      _pendingOwnListingAccountKey = '';
    }
  }
}

bool listingBelongsToOwnCompany({
  required OwnListingScope scope,
  required String adminId,
  String companyName = '',
}) {
  if (!scope.isLoggedIn) {
    return false;
  }

  final normalizedAdminId = normalizeOwnListingKey(adminId);
  final normalizedAccountId = normalizeOwnListingKey(scope.accountId);
  if (normalizedAdminId.isNotEmpty &&
      normalizedAdminId != 'admin' &&
      (normalizedAdminId == normalizedAccountId ||
          scope.companyIds.contains(normalizedAdminId))) {
    return true;
  }

  final normalizedCompanyName = normalizeOwnListingKey(companyName);
  return normalizedCompanyName.length >= 2 &&
      scope.companyNames.contains(normalizedCompanyName);
}

Future<bool> isOwnCompanyListing(Product product) async {
  final scope = await loadOwnListingScope(forceRefresh: true);
  return listingBelongsToOwnCompany(
    scope: scope,
    adminId: product.adminId,
    companyName: product.companyName,
  );
}

OwnListingCompany? matchingOwnListingCompany(
  OwnListingScope scope, {
  required String adminId,
  String companyName = '',
}) {
  final normalizedAdminId = normalizeOwnListingKey(adminId);
  final normalizedCompanyName = normalizeOwnListingKey(companyName);

  for (final company in scope.companies) {
    if (normalizedAdminId.isNotEmpty &&
        normalizeOwnListingKey(company.id) == normalizedAdminId) {
      return company;
    }
  }

  if (normalizedCompanyName.length >= 2) {
    for (final company in scope.companies) {
      if (normalizeOwnListingKey(company.name) == normalizedCompanyName) {
        return company;
      }
    }
  }

  final activeCompanyId = normalizeOwnListingKey(scope.activeCompanyId);
  if (activeCompanyId.isNotEmpty) {
    for (final company in scope.companies) {
      if (normalizeOwnListingKey(company.id) == activeCompanyId) {
        return company;
      }
    }
  }

  if (scope.companies.isNotEmpty) {
    return scope.companies.first;
  }

  return null;
}

Future<void> openOwnListingInsight(
  BuildContext context, {
  required Product product,
}) async {
  final scope = await loadOwnListingScope(forceRefresh: true);
  if (!context.mounted) {
    return;
  }

  if (!listingBelongsToOwnCompany(
    scope: scope,
    adminId: product.adminId,
    companyName: product.companyName,
  )) {
    AppSnackBar.showError(
      context,
      message: 'Listing Insight is only available for your company listing.',
    );
    return;
  }

  final company = matchingOwnListingCompany(
    scope,
    adminId: product.adminId,
    companyName: product.companyName,
  );
  if (company == null || company.id.trim().isEmpty) {
    AppSnackBar.showError(
      context,
      message: 'Open your seller company first, then try Listing Insight again.',
    );
    return;
  }

  final accountId = scope.accountId.trim().isNotEmpty
      ? scope.accountId.trim()
      : (await AuthSession.getAccountId())?.trim() ?? '';
  if (!context.mounted) {
    return;
  }
  if (accountId.isEmpty) {
    AppSnackBar.showError(
      context,
      message: 'Sign in to open Listing Insight.',
    );
    return;
  }

  final unlockToken = await _promptOwnListingSwitchPin(
    context,
    accountId: accountId,
    email: scope.email,
    company: company,
  );
  if (!context.mounted || unlockToken == null || unlockToken.isEmpty) {
    return;
  }

  try {
    await createUnifiedAccountService().switchRole(
      accountId: accountId,
      activeMode: 'seller_admin',
      companyId: company.id,
    );
    final bases = buildLocalApiBaseUrls(
      isAndroid: defaultTargetPlatform == TargetPlatform.android,
    );
    final base = bases.isNotEmpty ? bases.first : '';
    if (base.isEmpty) {
      throw const UnifiedAccountServiceException(
        'Seller admin is unavailable right now.',
      );
    }

    final uri = Uri.parse('$base/main.html').replace(
      queryParameters: {
        'switchPinTicket': unlockToken,
        if (product.id.trim().isNotEmpty)
          'listingInsightProduct': product.id.trim(),
      },
      fragment: 'listing-insight',
    );
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!context.mounted) {
      return;
    }
    if (!launched) {
      throw const UnifiedAccountServiceException(
        'Unable to open Listing Insight.',
      );
    }
    AppSnackBar.showSuccess(
      context,
      message: 'Opened Listing Insight for ${product.name.trim().isEmpty ? company.name : product.name.trim()}.',
    );
  } catch (error) {
    if (!context.mounted) {
      return;
    }
    AppSnackBar.showError(context, message: error.toString());
  }
}

Future<String?> _promptOwnListingSwitchPin(
  BuildContext context, {
  required String accountId,
  required String email,
  required OwnListingCompany company,
}) async {
  final service = createUnifiedAccountService();
  final status = await service.fetchSellerSwitchPinStatus(
    accountId: accountId,
    companyId: company.id,
    email: email,
  );
  if (!context.mounted) {
    return null;
  }

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
              final confirm = confirmController.text.replaceAll(RegExp(r'\D'), '');
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
                    ? await service.setSellerSwitchPin(
                        accountId: accountId,
                        companyId: company.id,
                        email: email,
                        pin: pin,
                        confirmPin: confirm,
                      )
                    : await service.verifySellerSwitchPin(
                        accountId: accountId,
                        companyId: company.id,
                        email: email,
                        pin: pin,
                      );
                if (!dialogContext.mounted) {
                  return;
                }
                Navigator.of(dialogContext).pop(result.unlockToken);
              } catch (error) {
                if (!dialogContext.mounted) {
                  return;
                }
                setDialogState(() {
                  busy = false;
                  errorText = error.toString();
                });
              }
            }

            return AlertDialog(
              title: const Text('Listing Insight'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    creating
                        ? 'Create a Switch PIN for ${company.name} to open Listing Insight. This is not your login password.'
                        : 'Enter the Switch PIN for ${company.name} to open Listing Insight. This is not your login password.',
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: pinController,
                    enabled: !busy,
                    obscureText: obscure,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: InputDecoration(
                      labelText: creating ? 'Create Switch PIN' : 'Switch PIN',
                      counterText: '',
                      suffixIcon: IconButton(
                        onPressed: () => setDialogState(() => obscure = !obscure),
                        icon: Icon(
                          obscure
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                        ),
                      ),
                    ),
                    onChanged: (_) {
                      if (errorText != null) {
                        setDialogState(() => errorText = null);
                      }
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
                  onPressed: busy ? null : () => Navigator.of(dialogContext).pop(),
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
