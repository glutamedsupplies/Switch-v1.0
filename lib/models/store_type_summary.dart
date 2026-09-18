class StoreTypeCategoryDetail {
  const StoreTypeCategoryDetail({
    required this.name,
    this.iconName = '',
    this.iconImageUrl = '',
    this.imageUrl = '',
    this.status = 'active',
  });

  final String name;
  final String iconName;
  final String iconImageUrl;
  final String imageUrl;
  final String status;

  factory StoreTypeCategoryDetail.fromJson(Map<String, dynamic> json) {
    return StoreTypeCategoryDetail(
      name: (json['name'] ?? json['category'] ?? json['label'])
              ?.toString()
              .trim() ??
          '',
      iconName: (json['iconName'] ??
              json['lucideIconName'] ??
              json['categoryIconName'] ??
              '')
          .toString()
          .trim(),
      iconImageUrl: (json['iconImageUrl'] ??
              json['iconUrl'] ??
              json['categoryIconUrl'] ??
              '')
          .toString()
          .trim(),
      imageUrl: (json['imageUrl'] ??
              json['mainImageUrl'] ??
              json['thumbnailUrl'] ??
              '')
          .toString()
          .trim(),
      status: (json['status'] ?? json['categoryStatus'] ?? 'active')
          .toString()
          .trim()
          .toLowerCase(),
    );
  }
}

class StoreTypeSummary {
  const StoreTypeSummary({
    required this.name,
    required this.categories,
    this.categoryDetails = const <StoreTypeCategoryDetail>[],
    this.platformId = 'shop',
    this.iconImageUrl = '',
    this.iconName = '',
    this.heroImageUrl = '',
    this.status = 'active',
  });

  final String name;
  final String platformId;
  final List<String> categories;
  final List<StoreTypeCategoryDetail> categoryDetails;
  final String iconImageUrl;
  final String iconName;
  final String heroImageUrl;
  final String status;

  String get initial {
    final normalized = name.trim();
    if (normalized.isEmpty) return '?';
    return normalized[0].toUpperCase();
  }

  factory StoreTypeSummary.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] ?? json['storeType'] ?? json['businessType'])
            ?.toString()
            .trim() ??
        '';
    final categories = <String>[];
    final seen = <String>{};
    final categoryDetails = <StoreTypeCategoryDetail>[];
    final detailSeen = <String>{};

    void addCategory(String value) {
      final trimmed = value.trim();
      final key = trimmed.toLowerCase();
      if (trimmed.isEmpty || seen.contains(key)) return;
      seen.add(key);
      categories.add(trimmed);
    }

    void addCategoryDetail(StoreTypeCategoryDetail detail) {
      final trimmed = detail.name.trim();
      final key = trimmed.toLowerCase();
      if (trimmed.isEmpty || detailSeen.contains(key)) return;
      if (detail.status == 'inactive') return;
      detailSeen.add(key);
      categoryDetails.add(detail);
      addCategory(trimmed);
    }

    final details = json['categoryDetails'] ?? json['categoryStats'];
    if (details is List) {
      for (final entry in details) {
        if (entry is! Map) continue;
        addCategoryDetail(
          StoreTypeCategoryDetail.fromJson(Map<String, dynamic>.from(entry)),
        );
      }
    }

    final rawCategories = json['categories'];
    if (rawCategories is List) {
      for (final entry in rawCategories) {
        addCategory(entry?.toString() ?? '');
      }
    }

    final explicitPlatformId = (json['platformId'] ??
            json['platform'] ??
            json['buyerPlatform'] ??
            '')
        .toString()
        .trim()
        .toLowerCase();

    return StoreTypeSummary(
      name: name,
      platformId: explicitPlatformId.isEmpty
          ? _inferPlatformIdFromName(name)
          : explicitPlatformId,
      categories: List<String>.unmodifiable(categories),
      categoryDetails: List<StoreTypeCategoryDetail>.unmodifiable(categoryDetails),
      iconImageUrl: (json['iconImageUrl'] ?? json['iconUrl'] ?? '')
          .toString()
          .trim(),
      iconName: (json['iconName'] ?? json['lucideIconName'] ?? '')
          .toString()
          .trim(),
      heroImageUrl: (json['heroImageUrl'] ?? json['imageUrl'] ?? '')
          .toString()
          .trim(),
      status: (json['status'] ?? 'active').toString().trim().toLowerCase(),
    );
  }
}

String _inferPlatformIdFromName(String name) {
  final key = name
      .trim()
      .toLowerCase()
      .replaceAll('&', ' and ')
      .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
      .trim();
  if (key.isEmpty) return 'shop';
  if (key.contains('hotel') ||
      key.contains('hote ') ||
      (RegExp(r'\bhotes?\b').hasMatch(key) && key.contains('restaurant'))) {
    return 'hotels';
  }
  if (key == 'food' ||
      key == 'foods' ||
      key.contains('restaurant') ||
      key.contains('dining') ||
      key.contains('cafe')) {
    return 'food';
  }
  return 'shop';
}
