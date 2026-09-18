class BuyerPlatformSummary {
  const BuyerPlatformSummary({
    required this.id,
    required this.name,
    this.status = 'active',
    this.sortOrder = 0,
    this.comingSoon = false,
    this.iconName = '',
    this.iconImageUrl = '',
    this.heroImageUrl = '',
    this.primaryColor = '',
    this.secondaryColor = '',
  });

  final String id;
  final String name;
  final String status;
  final int sortOrder;
  final bool comingSoon;
  final String iconName;
  final String iconImageUrl;
  final String heroImageUrl;
  final String primaryColor;
  final String secondaryColor;

  factory BuyerPlatformSummary.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? json['platformId'] ?? json['slug'] ?? '')
        .toString()
        .trim()
        .toLowerCase();
    final name = (json['name'] ?? json['label'] ?? json['title'] ?? '')
        .toString()
        .trim();
    final sortOrderRaw = json['sortOrder'] ?? json['order'] ?? 0;
    final sortOrder = sortOrderRaw is num
        ? sortOrderRaw.toInt()
        : int.tryParse(sortOrderRaw.toString()) ?? 0;
    final comingSoonRaw = json['comingSoon'] ?? json['isComingSoon'] ?? json['soon'];
    final comingSoon = comingSoonRaw == true ||
        comingSoonRaw.toString().trim().toLowerCase() == 'true';

    return BuyerPlatformSummary(
      id: id,
      name: name.isEmpty ? id : name,
      status: (json['status'] ?? 'active').toString().trim().toLowerCase(),
      sortOrder: sortOrder,
      comingSoon: comingSoon,
      iconName: (json['iconName'] ?? json['lucideIconName'] ?? '')
          .toString()
          .trim(),
      iconImageUrl: (json['iconImageUrl'] ?? json['iconUrl'] ?? '')
          .toString()
          .trim(),
      heroImageUrl: (json['heroImageUrl'] ?? json['imageUrl'] ?? '')
          .toString()
          .trim(),
      primaryColor: (json['primaryColor'] ?? json['color'] ?? json['accentColor'] ?? '')
          .toString()
          .trim()
          .toLowerCase(),
      secondaryColor:
          (json['secondaryColor'] ?? json['secondaryAccent'] ?? '')
              .toString()
              .trim()
              .toLowerCase(),
    );
  }
}
