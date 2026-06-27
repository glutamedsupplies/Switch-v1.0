class SellerSummary {
  const SellerSummary({
    required this.adminId,
    required this.name,
    required this.companyName,
    required this.storeType,
    required this.companyPictureUrl,
    required this.profileImageUrl,
    required this.createdAt,
  });

  final String adminId;
  final String name;
  final String companyName;
  final String storeType;
  final String companyPictureUrl;
  final String profileImageUrl;
  final DateTime createdAt;

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

    return SellerSummary(
      adminId: adminId,
      name: name,
      companyName: companyName,
      storeType: storeType,
      companyPictureUrl: companyPictureUrl,
      profileImageUrl: profileImageUrl,
      createdAt: createdAt,
    );
  }
}
