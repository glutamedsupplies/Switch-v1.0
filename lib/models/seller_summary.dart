class SellerSummary {
  const SellerSummary({
    required this.adminId,
    required this.name,
    required this.companyName,
    required this.storeType,
    required this.companyPictureUrl,
    required this.profileImageUrl,
    required this.createdAt,
    this.planName = 'Free Plan',
    this.hasPaidPlan = false,
  });

  final String adminId;
  final String name;
  final String companyName;
  final String storeType;
  final String companyPictureUrl;
  final String profileImageUrl;
  final DateTime createdAt;
  final String planName;
  final bool hasPaidPlan;

  bool get isLegitSeller => hasPaidPlan;

  String get displayName {
    final normalizedCompanyName = companyName.trim();
    if (normalizedCompanyName.isNotEmpty) {
      return normalizedCompanyName;
    }

    final normalizedName = name.trim();
    if (normalizedName.isNotEmpty) {
      return normalizedName;
    }

    return adminId.trim().isEmpty ? 'Company' : adminId.trim();
  }

  String get displayImageUrl {
    final normalizedCompanyPictureUrl = companyPictureUrl.trim();
    if (normalizedCompanyPictureUrl.isNotEmpty) {
      return normalizedCompanyPictureUrl;
    }

    return profileImageUrl.trim();
  }

  factory SellerSummary.fromJson(Map<String, dynamic> json) {
    final adminId = (json['adminId'] ??
            json['id'] ??
            json['accountCode'] ??
            json['sellerId'] ??
            json['shopId'])
        ?.toString()
        .trim() ??
        '';
    final companyName = (json['companyName'] ??
            json['storeName'] ??
            json['businessName'] ??
            json['displayName'])
        ?.toString()
        .trim() ??
        '';
    final name = (json['name'] ??
            json['displayName'] ??
            json['firstName'] ??
            adminId)
        ?.toString()
        .trim() ??
        '';
    final storeType =
        (json['storeType'] ?? json['storeTypeName'] ?? json['businessType'])
                ?.toString()
                .trim() ??
            '';
    final companyPictureUrl = (json['companyPictureUrl'] ??
            json['companyProfileImageUrl'] ??
            json['logoUrl'] ??
            json['avatarUrl'] ??
            json['photoUrl'])
        ?.toString()
        .trim() ??
        '';
    final profileImageUrl = (json['profileImageUrl'] ??
            json['avatarUrl'] ??
            json['photoUrl'] ??
            companyPictureUrl)
        ?.toString()
        .trim() ??
        '';
    final createdAt = DateTime.tryParse(
          (json['createdAt'] ?? json['registeredAt'] ?? '').toString(),
        ) ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final planName =
        (json['planName'] ?? json['subscriptionPlan'] ?? 'Free Plan')
            .toString()
            .trim();
    final hasPaidPlan = json['hasPaidPlan'] == true ||
        json['isLegitSeller'] == true ||
        _sellerPlanLooksPaid(
          planName,
          json['planAmount'] ?? json['subscriptionAmount'] ?? json['amount'],
        );

    return SellerSummary(
      adminId: adminId,
      name: name,
      companyName: companyName,
      storeType: storeType,
      companyPictureUrl: companyPictureUrl,
      profileImageUrl: profileImageUrl,
      createdAt: createdAt,
      planName: planName.isEmpty ? 'Free Plan' : planName,
      hasPaidPlan: hasPaidPlan,
    );
  }
}

bool _sellerPlanLooksPaid(String planName, Object? amountRaw) {
  final amount = amountRaw is num
      ? amountRaw.toDouble()
      : double.tryParse(amountRaw?.toString() ?? '') ?? 0;
  if (amount > 0) return true;
  final name = planName.trim().toLowerCase();
  if (name.isEmpty ||
      name == 'free' ||
      name == 'free plan' ||
      name.startsWith('free ')) {
    return false;
  }
  return name == 'basic' ||
      name == 'pro' ||
      name == 'premium' ||
      name == 'starter seller plan';
}
