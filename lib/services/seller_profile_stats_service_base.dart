class SellerProfileStats {
  const SellerProfileStats({
    this.rating = 0,
    this.reviewCount = 0,
    this.followerCount = 0,
    this.productCount = 0,
  });

  final double rating;
  final int reviewCount;
  final int followerCount;
  final int productCount;

  factory SellerProfileStats.fromJson(Map<String, dynamic> json) {
    int readInt(Object? value) => num.tryParse('${value ?? ''}')?.toInt() ?? 0;
    return SellerProfileStats(
      rating: num.tryParse('${json['rating'] ?? ''}')?.toDouble() ?? 0,
      reviewCount: readInt(json['reviewCount'] ?? json['commentCount']),
      followerCount: readInt(json['followersCount'] ?? json['followerCount']),
      productCount: readInt(json['productCount']),
    );
  }
}

abstract class SellerProfileStatsService {
  /// Returns null when the backend cannot be reached.
  Future<SellerProfileStats?> fetchStats(String adminId);
}
