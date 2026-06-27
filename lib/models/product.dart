class ProductVariantAddOn {
  const ProductVariantAddOn({
    required this.id,
    required this.name,
    this.quantity = 1,
  });

  final String id;
  final String name;
  final int quantity;

  factory ProductVariantAddOn.fromJson(Map<String, dynamic> json) {
    return ProductVariantAddOn(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
    );
  }
}

class ProductVariant {
  const ProductVariant({
    required this.id,
    required this.name,
    this.quantity = '',
    required this.imageUrl,
    required this.originalPrice,
    this.salesPrice,
    this.stock = 0,
    this.addOns = const <ProductVariantAddOn>[],
  });

  final String id;
  final String name;
  final String quantity;
  final String imageUrl;
  final double originalPrice;
  final double? salesPrice;
  final int stock;
  final List<ProductVariantAddOn> addOns;

  bool get hasSalesPrice =>
      salesPrice != null &&
      salesPrice! >= 0 &&
      salesPrice! < originalPrice;

  double get displayPrice => hasSalesPrice ? salesPrice! : originalPrice;

  ProductVariant copyWith({
    String? id,
    String? name,
    String? quantity,
    String? imageUrl,
    double? originalPrice,
    double? salesPrice,
    bool clearSalesPrice = false,
    int? stock,
    List<ProductVariantAddOn>? addOns,
  }) {
    return ProductVariant(
      id: id ?? this.id,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      imageUrl: imageUrl ?? this.imageUrl,
      originalPrice: originalPrice ?? this.originalPrice,
      salesPrice: clearSalesPrice ? null : salesPrice ?? this.salesPrice,
      stock: stock ?? this.stock,
      addOns: addOns ?? this.addOns,
    );
  }

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      quantity: json['quantity']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      originalPrice:
          (json['originalPrice'] as num?)?.toDouble() ??
          (json['price'] as num?)?.toDouble() ??
          0,
      salesPrice: (json['salesPrice'] as num?)?.toDouble(),
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      addOns: (json['addOns'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ProductVariantAddOn.fromJson)
          .toList(growable: false),
    );
  }
}

class ProductImageCrop {
  const ProductImageCrop({
    required this.sourceUrl,
    required this.croppedImageUrl,
    this.positionX = 50,
    this.positionY = 50,
  });

  final String sourceUrl;
  final String croppedImageUrl;
  final double positionX;
  final double positionY;

  ProductImageCrop copyWith({
    String? sourceUrl,
    String? croppedImageUrl,
    double? positionX,
    double? positionY,
  }) {
    return ProductImageCrop(
      sourceUrl: sourceUrl ?? this.sourceUrl,
      croppedImageUrl: croppedImageUrl ?? this.croppedImageUrl,
      positionX: positionX ?? this.positionX,
      positionY: positionY ?? this.positionY,
    );
  }

  factory ProductImageCrop.fromJson(Map<String, dynamic> json) {
    return ProductImageCrop(
      sourceUrl: json['sourceUrl']?.toString() ?? '',
      croppedImageUrl: json['croppedImageUrl']?.toString() ?? '',
      positionX: _normalizeCardImagePosition(
        (json['positionX'] as num?)?.toDouble(),
      ),
      positionY: _normalizeCardImagePosition(
        (json['positionY'] as num?)?.toDouble(),
      ),
    );
  }
}

enum ProductReviewMediaType { image, video }

class ProductReviewMedia {
  const ProductReviewMedia({
    required this.type,
    required this.url,
    this.thumbnailUrl = '',
    this.fileName = '',
    this.contentType = '',
  });

  final ProductReviewMediaType type;
  final String url;
  final String thumbnailUrl;
  final String fileName;
  final String contentType;

  bool get isImage => type == ProductReviewMediaType.image;
  bool get isVideo => type == ProductReviewMediaType.video;

  Map<String, dynamic> toJson() => {
        'type': isVideo ? 'video' : 'image',
        'url': url,
        'mediaUrl': url,
        'thumbnailUrl': thumbnailUrl,
        'fileName': fileName,
        'contentType': contentType,
      };

  factory ProductReviewMedia.fromJson(Object? value) {
    if (value is ProductReviewMedia) {
      return value;
    }

    if (value is String) {
      final url = value.trim();
      return ProductReviewMedia(
        type: _inferProductReviewMediaType(url: url),
        url: url,
      );
    }

    if (value is! Map) {
      return const ProductReviewMedia(
        type: ProductReviewMediaType.image,
        url: '',
      );
    }

    final json = Map<String, dynamic>.from(value);
    final rawVideoUrl = json['videoUrl']?.toString().trim() ?? '';
    final rawImageUrl = json['imageUrl']?.toString().trim() ?? '';
    final url = [
      json['url'],
      json['mediaUrl'],
      json['src'],
      json['imageUrl'],
      json['videoUrl'],
    ]
        .map((candidate) => candidate?.toString().trim() ?? '')
        .firstWhere((candidate) => candidate.isNotEmpty, orElse: () => '');

    return ProductReviewMedia(
      type: _inferProductReviewMediaType(
        url: url,
        type: json['type'] ??
            json['mediaType'] ??
            json['kind'] ??
            (rawVideoUrl.isNotEmpty && rawImageUrl.isEmpty ? 'video' : null),
        contentType: json['contentType'] ?? json['mimeType'],
      ),
      url: url,
      thumbnailUrl: [
        json['thumbnailUrl'],
        json['videoThumbnailUrl'],
        json['posterUrl'],
      ]
          .map((candidate) => candidate?.toString().trim() ?? '')
          .firstWhere((candidate) => candidate.isNotEmpty, orElse: () => ''),
      fileName: (json['fileName'] ?? json['name'])?.toString().trim() ?? '',
      contentType:
          (json['contentType'] ?? json['mimeType'])?.toString().trim() ?? '',
    );
  }
}

class ProductReviewSellerReply {
  const ProductReviewSellerReply({
    required this.message,
    this.author = '',
    this.companyName = '',
    this.companyPictureUrl = '',
    this.createdAt,
    this.updatedAt,
  });

  final String message;
  final String author;
  final String companyName;
  final String companyPictureUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory ProductReviewSellerReply.fromJson(Object? value) {
    if (value is ProductReviewSellerReply) {
      return value;
    }

    final rawReply = value is Map
        ? Map<String, dynamic>.from(value)
        : <String, dynamic>{'message': value};
    final message = [
      rawReply['message'],
      rawReply['reply'],
      rawReply['text'],
      rawReply['comment'],
    ]
        .map((candidate) => candidate?.toString().trim() ?? '')
        .firstWhere((candidate) => candidate.isNotEmpty, orElse: () => '');

    return ProductReviewSellerReply(
      message: message,
      author: [
        rawReply['author'],
        rawReply['sellerName'],
        rawReply['companyName'],
      ]
          .map((candidate) => candidate?.toString().trim() ?? '')
          .firstWhere((candidate) => candidate.isNotEmpty, orElse: () => ''),
      companyName: [
        rawReply['companyName'],
        rawReply['storeName'],
        rawReply['businessName'],
      ]
          .map((candidate) => candidate?.toString().trim() ?? '')
          .firstWhere((candidate) => candidate.isNotEmpty, orElse: () => ''),
      companyPictureUrl: [
        rawReply['companyPictureUrl'],
        rawReply['companyProfileImageUrl'],
        rawReply['profileImageUrl'],
        rawReply['logoUrl'],
      ]
          .map((candidate) => candidate?.toString().trim() ?? '')
          .firstWhere((candidate) => candidate.isNotEmpty, orElse: () => ''),
      createdAt: _normalizeProductReviewDate(
        rawReply['createdAt'] ?? rawReply['repliedAt'],
        rawReply['createdAtEpochMs'] ?? rawReply['repliedAtEpochMs'],
      ),
      updatedAt: _normalizeProductReviewDate(
        rawReply['updatedAt'] ?? rawReply['editedAt'],
        rawReply['updatedAtEpochMs'] ?? rawReply['editedAtEpochMs'],
      ),
    );
  }
}

class ProductReviewComment {
  const ProductReviewComment({
    required this.reviewer,
    required this.message,
    this.id = '',
    this.title = '',
    this.rating = 0,
    this.media = const <ProductReviewMedia>[],
    this.sellerReply,
    this.createdAt,
  });

  final String id;
  final String reviewer;
  final String title;
  final String message;
  final double rating;
  final List<ProductReviewMedia> media;
  final ProductReviewSellerReply? sellerReply;
  final DateTime? createdAt;

  factory ProductReviewComment.fromJson(Map<String, dynamic> json) {
    final rating = _normalizeProductReviewRating(json['rating']);
    final reviewer = [
      json['reviewer'],
      json['author'],
      json['user'],
      json['userName'],
      json['customerName'],
    ]
        .map((value) => value?.toString().trim() ?? '')
        .firstWhere((value) => value.isNotEmpty, orElse: () => 'Verified Buyer');
    final message = [
      json['message'],
      json['comment'],
      json['text'],
      json['review'],
    ]
        .map((value) => value?.toString().trim() ?? '')
        .firstWhere(
          (value) => value.isNotEmpty,
          orElse: () => _defaultProductReviewCommentForRating(rating),
        );

    return ProductReviewComment(
      id: json['id']?.toString().trim() ?? '',
      reviewer: reviewer,
      title: json['title']?.toString().trim() ?? '',
      message: message,
      rating: rating,
      media: _normalizeProductReviewMediaList(<Object?>[
        json['media'],
        json['reviewMedia'],
        json['mediaItems'],
        json['attachments'],
        json['mediaUrls'],
        _wrapProductReviewMediaUrls(json['imageUrls'], 'image'),
        _wrapProductReviewMediaUrls(json['videoUrls'], 'video'),
      ]),
      sellerReply: _normalizeProductReviewSellerReply(
        json['sellerReply'] ??
            json['reply'] ??
            json['sellerResponse'] ??
            json['response'],
        fallbackMessage: json['sellerReplyMessage'] ?? json['replyMessage'],
      ),
      createdAt: _normalizeProductReviewDate(
        json['createdAt'] ?? json['date'] ?? json['dateLabel'],
        json['createdAtEpochMs'] ?? json['ratedAtEpochMs'],
      ),
    );
  }
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.originalPrice,
    required this.category,
    required this.description,
    required this.imageUrl,
    required this.createdAt,
    this.imageUrls = const <String>[],
    this.categories = const <String>[],
    this.deliveryPartnerIds = const <String>[],
    this.paymentPartnerIds = const <String>[],
    this.videoUrl = '',
    this.videoUrls = const <String>[],
    this.videoThumbnailUrl = '',
    this.videoThumbnailUrls = const <String>[],
    this.detailsVideoSourceUrl = '',
    this.visualSearchImageUrl = '',
    this.model3dUrl = '',
    this.model3dScanImageUrls = const <String>[],
    this.variants = const <ProductVariant>[],
    this.mainImageIndex = 0,
    this.buyModalImageUrl = '',
    this.buyModalImageSourceUrl = '',
    this.cardImageUrl = '',
    this.cardImageSourceUrl = '',
    this.detailsImageCrops = const <ProductImageCrop>[],
    this.detailsVideoPositionX = 50,
    this.detailsVideoPositionY = 50,
    this.detailsVideoZoomPercent = 0,
    this.detailsVideoVisibleWidthFraction = 0,
    this.detailsVideoVisibleHeightFraction = 0,
    this.detailsVideoPreviewTimeMs = 0,
    this.buyModalImagePositionX = 50,
    this.buyModalImagePositionY = 50,
    this.cardImagePositionX = 50,
    this.cardImagePosition = 50,
    this.salesPrice,
    this.stock = 0,
    this.sold = 0,
    this.rating = 0,
    this.ratingCount = 0,
    this.ratingPoints = 0,
    this.commentCount = 0,
    this.reviewComments = const <ProductReviewComment>[],
    this.isActive = true,
    this.adminId = '',
    this.approvalStatus = 'approved',
    this.companyName = '',
    this.companyPictureUrl = '',
  });

  final String id;
  final String adminId;
  final String approvalStatus;
  final String companyName;
  final String companyPictureUrl;
  final String name;
  final double originalPrice;
  final String category;
  final List<String> categories;
  final List<String> deliveryPartnerIds;
  final List<String> paymentPartnerIds;
  final String description;
  final String imageUrl;
  final DateTime createdAt;
  final List<String> imageUrls;
  final String videoUrl;
  final List<String> videoUrls;
  final String videoThumbnailUrl;
  final List<String> videoThumbnailUrls;
  final String detailsVideoSourceUrl;
  final String visualSearchImageUrl;
  final String model3dUrl;
  final List<String> model3dScanImageUrls;
  final List<ProductVariant> variants;
  final int mainImageIndex;
  final String buyModalImageUrl;
  final String buyModalImageSourceUrl;
  final String cardImageUrl;
  final String cardImageSourceUrl;
  final List<ProductImageCrop> detailsImageCrops;
  final double detailsVideoPositionX;
  final double detailsVideoPositionY;
  final double detailsVideoZoomPercent;
  final double detailsVideoVisibleWidthFraction;
  final double detailsVideoVisibleHeightFraction;
  final double detailsVideoPreviewTimeMs;
  final double buyModalImagePositionX;
  final double buyModalImagePositionY;
  final double cardImagePositionX;
  final double cardImagePosition;
  final double? salesPrice;
  final int stock;
  final int sold;
  final double rating;
  final int ratingCount;
  final double ratingPoints;
  final int commentCount;
  final List<ProductReviewComment> reviewComments;
  final bool isActive;

  bool get hasVideo => galleryVideoUrls.isNotEmpty;

  bool get hasModel3d => model3dUrl.trim().isNotEmpty;

  bool get hasModel3dScan => model3dScanImageUrls.isNotEmpty;

  bool get hasCompanyIdentity =>
      companyName.trim().isNotEmpty || companyPictureUrl.trim().isNotEmpty;

  bool get isApprovedForApp =>
      approvalStatus.trim().isEmpty ||
      approvalStatus.trim().toLowerCase() == 'approved';

  List<String> get categoryList =>
      _normalizeProductCategories(categories, category);

  String get primaryCategory =>
      categoryList.isNotEmpty ? categoryList.first : category.trim();

  String get categoryLabel => categoryList.join(', ');

  bool belongsToCategory(String value) {
    final normalizedCategory = value.trim().toLowerCase();
    if (normalizedCategory.isEmpty) {
      return false;
    }

    return categoryList.any(
      (category) => category.trim().toLowerCase() == normalizedCategory,
    );
  }

  List<String> get galleryVideoUrls {
    final normalizedVideoUrls = <String>[];
    final seen = <String>{};

    for (final candidate in videoUrls) {
      final video = candidate.trim();
      final normalizedKey = video.toLowerCase();
      if (video.isEmpty || seen.contains(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      normalizedVideoUrls.add(video);
    }

    final fallbackVideoUrl = videoUrl.trim();
    if (normalizedVideoUrls.isEmpty && fallbackVideoUrl.isNotEmpty) {
      normalizedVideoUrls.add(fallbackVideoUrl);
    }

    return normalizedVideoUrls;
  }

  List<String> get galleryVideoThumbnailUrls {
    final videos = galleryVideoUrls;
    if (videos.isEmpty) {
      return const <String>[];
    }

    final normalizedThumbnailUrls = List<String>.filled(videos.length, '');
    for (var index = 0; index < videos.length && index < videoThumbnailUrls.length; index += 1) {
      normalizedThumbnailUrls[index] = videoThumbnailUrls[index].trim();
    }

    final fallbackThumbnailUrl = videoThumbnailUrl.trim();
    if (normalizedThumbnailUrls.isNotEmpty &&
        normalizedThumbnailUrls.first.isEmpty &&
        fallbackThumbnailUrl.isNotEmpty) {
      normalizedThumbnailUrls[0] = fallbackThumbnailUrl;
    }

    return List<String>.unmodifiable(normalizedThumbnailUrls);
  }

  String resolveVideoThumbnailUrl(String videoUrl) {
    final normalizedTargetUrl = videoUrl.trim().toLowerCase();
    if (normalizedTargetUrl.isEmpty) {
      return '';
    }

    final videos = galleryVideoUrls;
    final thumbnails = galleryVideoThumbnailUrls;
    final matchingIndex = videos.indexWhere(
      (candidate) => candidate.trim().toLowerCase() == normalizedTargetUrl,
    );
    if (matchingIndex < 0 || matchingIndex >= thumbnails.length) {
      return '';
    }

    return thumbnails[matchingIndex].trim();
  }

  List<String> get galleryImageUrls {
    final normalizedImageUrls = <String>[];
    final seen = <String>{};

    for (final candidate in imageUrls) {
      final image = candidate.trim();
      final normalizedKey = image.toLowerCase();
      if (image.isEmpty || seen.contains(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      normalizedImageUrls.add(image);
    }

    final fallbackImageUrl = imageUrl.trim();
    if (normalizedImageUrls.isEmpty && fallbackImageUrl.isNotEmpty) {
      normalizedImageUrls.add(fallbackImageUrl);
    }

    for (final variant in variants) {
      final image = variant.imageUrl.trim();
      final normalizedKey = image.toLowerCase();
      if (image.isEmpty || seen.contains(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      normalizedImageUrls.add(image);
    }

    return normalizedImageUrls;
  }

  int get resolvedMainImageIndex {
    final images = galleryImageUrls;
    if (images.isEmpty) {
      return 0;
    }

    if (mainImageIndex >= 0 && mainImageIndex < images.length) {
      return mainImageIndex;
    }

    final fallbackIndex = images.indexOf(imageUrl.trim());
    return fallbackIndex >= 0 ? fallbackIndex : 0;
  }

  bool get hasSavedCardImageCrop {
    final trimmedCardImageUrl = cardImageUrl.trim();
    return trimmedCardImageUrl.isNotEmpty;
  }

  bool get hasSavedBuyModalImageCrop {
    final trimmedBuyModalImageUrl = buyModalImageUrl.trim();
    return trimmedBuyModalImageUrl.isNotEmpty;
  }

  String get buyModalDisplayImageUrl =>
      hasSavedBuyModalImageCrop ? buyModalImageUrl.trim() : imageUrl.trim();

  String get cardDisplayImageUrl =>
      hasSavedCardImageCrop ? cardImageUrl.trim() : imageUrl.trim();

  bool get hasSavedDetailsVideoCrop {
    final trimmedDetailsVideoSourceUrl = detailsVideoSourceUrl.trim();
    if (trimmedDetailsVideoSourceUrl.isEmpty) {
      return false;
    }

    final normalizedSourceKey = trimmedDetailsVideoSourceUrl.toLowerCase();
    return galleryVideoUrls.any(
      (videoUrl) => videoUrl.trim().toLowerCase() == normalizedSourceKey,
    );
  }

  List<String> get detailsDisplayImageUrls {
    final baseImageUrls = galleryImageUrls;
    if (baseImageUrls.isEmpty || detailsImageCrops.isEmpty) {
      return baseImageUrls;
    }

    final cropBySourceUrl = <String, String>{};
    for (final crop in detailsImageCrops) {
      final sourceUrl = crop.sourceUrl.trim();
      final croppedImageUrl = crop.croppedImageUrl.trim();
      if (sourceUrl.isEmpty || croppedImageUrl.isEmpty) {
        continue;
      }

      cropBySourceUrl[sourceUrl.toLowerCase()] = croppedImageUrl;
    }

    return baseImageUrls
        .map(
          (imageUrl) =>
              cropBySourceUrl[imageUrl.trim().toLowerCase()] ?? imageUrl.trim(),
        )
        .toList(growable: false);
  }

  double get normalizedCardImagePositionX =>
      _normalizeCardImagePosition(cardImagePositionX);

  double get cardImageAlignmentX =>
      ((normalizedCardImagePositionX - 50) / 50).clamp(-1, 1).toDouble();

  double get normalizedCardImagePosition =>
      _normalizeCardImagePosition(cardImagePosition);

  double get cardImageAlignmentY =>
      ((normalizedCardImagePosition - 50) / 50).clamp(-1, 1).toDouble();

  double get normalizedDetailsVideoPositionX =>
      _normalizeCardImagePosition(detailsVideoPositionX);

  double get normalizedDetailsVideoPositionY =>
      _normalizeCardImagePosition(detailsVideoPositionY);

  double get normalizedDetailsVideoZoomPercent =>
      _normalizeCropZoomPercent(detailsVideoZoomPercent);

  double get normalizedDetailsVideoVisibleWidthFraction =>
      _normalizeVisibleFraction(detailsVideoVisibleWidthFraction);

  double get normalizedDetailsVideoVisibleHeightFraction =>
      _normalizeVisibleFraction(detailsVideoVisibleHeightFraction);

  double get normalizedDetailsVideoPreviewTimeMs =>
      _normalizeMediaTimeMs(detailsVideoPreviewTimeMs);

  Product copyWith({
    String? id,
    String? adminId,
    String? approvalStatus,
    String? companyName,
    String? companyPictureUrl,
    String? name,
    double? originalPrice,
    String? category,
    List<String>? categories,
    List<String>? deliveryPartnerIds,
    List<String>? paymentPartnerIds,
    String? description,
    String? imageUrl,
    DateTime? createdAt,
    List<String>? imageUrls,
    String? videoUrl,
    List<String>? videoUrls,
    String? videoThumbnailUrl,
    List<String>? videoThumbnailUrls,
    String? detailsVideoSourceUrl,
    String? visualSearchImageUrl,
    String? model3dUrl,
    List<String>? model3dScanImageUrls,
    List<ProductVariant>? variants,
    int? mainImageIndex,
    String? buyModalImageUrl,
    String? buyModalImageSourceUrl,
    String? cardImageUrl,
    String? cardImageSourceUrl,
    List<ProductImageCrop>? detailsImageCrops,
    double? detailsVideoPositionX,
    double? detailsVideoPositionY,
    double? detailsVideoZoomPercent,
    double? detailsVideoVisibleWidthFraction,
    double? detailsVideoVisibleHeightFraction,
    double? detailsVideoPreviewTimeMs,
    double? buyModalImagePositionX,
    double? buyModalImagePositionY,
    double? cardImagePositionX,
    double? cardImagePosition,
    double? salesPrice,
    int? stock,
    int? sold,
    double? rating,
    int? ratingCount,
    double? ratingPoints,
    int? commentCount,
    List<ProductReviewComment>? reviewComments,
    bool? isActive,
  }) {
    return Product(
      id: id ?? this.id,
      adminId: adminId ?? this.adminId,
      approvalStatus: approvalStatus ?? this.approvalStatus,
      companyName: companyName ?? this.companyName,
      companyPictureUrl: companyPictureUrl ?? this.companyPictureUrl,
      name: name ?? this.name,
      originalPrice: originalPrice ?? this.originalPrice,
      category: category ?? this.category,
      categories: categories ?? this.categories,
      deliveryPartnerIds: deliveryPartnerIds ?? this.deliveryPartnerIds,
      paymentPartnerIds: paymentPartnerIds ?? this.paymentPartnerIds,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt ?? this.createdAt,
      imageUrls: imageUrls ?? this.imageUrls,
      videoUrl: videoUrl ?? this.videoUrl,
      videoUrls: videoUrls ?? this.videoUrls,
      videoThumbnailUrl: videoThumbnailUrl ?? this.videoThumbnailUrl,
      videoThumbnailUrls: videoThumbnailUrls ?? this.videoThumbnailUrls,
      detailsVideoSourceUrl:
          detailsVideoSourceUrl ?? this.detailsVideoSourceUrl,
      visualSearchImageUrl: visualSearchImageUrl ?? this.visualSearchImageUrl,
      model3dUrl: model3dUrl ?? this.model3dUrl,
      model3dScanImageUrls:
          model3dScanImageUrls ?? this.model3dScanImageUrls,
      variants: variants ?? this.variants,
      mainImageIndex: mainImageIndex ?? this.mainImageIndex,
      buyModalImageUrl: buyModalImageUrl ?? this.buyModalImageUrl,
      buyModalImageSourceUrl:
          buyModalImageSourceUrl ?? this.buyModalImageSourceUrl,
      cardImageUrl: cardImageUrl ?? this.cardImageUrl,
      cardImageSourceUrl: cardImageSourceUrl ?? this.cardImageSourceUrl,
      detailsImageCrops: detailsImageCrops ?? this.detailsImageCrops,
      detailsVideoPositionX:
          detailsVideoPositionX ?? this.detailsVideoPositionX,
      detailsVideoPositionY:
          detailsVideoPositionY ?? this.detailsVideoPositionY,
      detailsVideoZoomPercent:
          detailsVideoZoomPercent ?? this.detailsVideoZoomPercent,
      detailsVideoVisibleWidthFraction:
          detailsVideoVisibleWidthFraction ??
          this.detailsVideoVisibleWidthFraction,
      detailsVideoVisibleHeightFraction:
          detailsVideoVisibleHeightFraction ??
          this.detailsVideoVisibleHeightFraction,
      detailsVideoPreviewTimeMs:
          detailsVideoPreviewTimeMs ?? this.detailsVideoPreviewTimeMs,
      buyModalImagePositionX:
          buyModalImagePositionX ?? this.buyModalImagePositionX,
      buyModalImagePositionY:
          buyModalImagePositionY ?? this.buyModalImagePositionY,
      cardImagePositionX: cardImagePositionX ?? this.cardImagePositionX,
      cardImagePosition: cardImagePosition ?? this.cardImagePosition,
      salesPrice: salesPrice ?? this.salesPrice,
      stock: stock ?? this.stock,
      sold: sold ?? this.sold,
      rating: rating ?? this.rating,
      ratingCount: ratingCount ?? this.ratingCount,
      ratingPoints: ratingPoints ?? this.ratingPoints,
      commentCount: commentCount ?? this.commentCount,
      reviewComments: reviewComments ?? this.reviewComments,
      isActive: isActive ?? this.isActive,
    );
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    final originalPrice =
        (json['originalPrice'] as num?)?.toDouble() ??
            (json['price'] as num?)?.toDouble() ??
            0;
    final salesPrice = (json['salesPrice'] as num?)?.toDouble();
    final stock = (json['stock'] as num?)?.toInt() ?? 0;
    final sold = (json['sold'] as num?)?.toInt() ?? 0;
    final rating = (json['rating'] as num?)?.toDouble() ?? 0;
    final ratingCount = _normalizeNonNegativeInt(
      json['ratingCount'] ??
          json['ratingsCount'] ??
          json['reviewRatingCount'] ??
          json['productRatingCount'],
    );
    final ratingPoints = _normalizeNonNegativeDouble(
      json['ratingPoints'] ??
          json['totalRatingPoints'] ??
          json['productRatingPoints'],
    );
    final commentCount = _normalizeNonNegativeInt(
      json['commentCount'] ??
          json['reviewCommentCount'] ??
          json['productReviewCommentCount'],
    );
    final reviewComments = _normalizeProductReviewComments(
      json['reviewComments'] ?? json['productReviewComments'] ?? json['reviews'],
    );
    final variants = (json['variants'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ProductVariant.fromJson)
        .toList(growable: false);
    final detailsImageCrops = _normalizeProductImageCrops(
      json['detailsImageCrops'] as List<dynamic>?,
    );
    final fallbackImageUrl = json['imageUrl']?.toString() ?? '';
    final imageUrls = _normalizeProductImageUrls(
      json['imageUrls'] as List<dynamic>?,
      fallbackImageUrl,
    );
    final fallbackVideoUrl = json['videoUrl']?.toString() ?? '';
    final videoUrls = _normalizeProductVideoUrls(
      json['videoUrls'] as List<dynamic>?,
      fallbackVideoUrl,
    );
    final videoThumbnailUrls = _normalizeProductVideoThumbnailUrls(
      json['videoThumbnailUrls'] as List<dynamic>?,
      videoUrls,
      json['videoThumbnailUrl']?.toString() ?? '',
    );
    final mainImageIndex = _resolveProductMainImageIndex(
      imageUrls: imageUrls,
      requestedIndex: (json['mainImageIndex'] as num?)?.toInt(),
      requestedMainImageUrl:
          json['mainImageUrl']?.toString() ?? fallbackImageUrl,
    );
    final normalizedCategories = _normalizeProductCategories(
      json['categories'] as List<dynamic>?,
      json['category']?.toString() ?? '',
    );
    final resolvedMainImageUrl = imageUrls.isEmpty
        ? fallbackImageUrl.trim()
        : imageUrls[mainImageIndex];

    return Product(
      id: json['id']?.toString() ?? '',
      adminId: (json['adminId'] ??
              json['tenantId'] ??
              json['ownerAdminId'] ??
              json['workspaceId'] ??
              json['storeAdminId'])
          ?.toString()
          .trim() ??
          '',
      companyName: (json['companyName'] ??
              json['storeName'] ??
              json['businessName'] ??
              json['adminCompanyName'] ??
              json['sellerName'])
          ?.toString()
          .trim() ??
          '',
      approvalStatus: (json['approvalStatus'] ??
              json['reviewStatus'] ??
              json['productApprovalStatus'])
          ?.toString()
          .trim()
          .toLowerCase() ??
          'approved',
      companyPictureUrl: (json['companyPictureUrl'] ??
              json['companyProfileImageUrl'] ??
              json['profileImageUrl'] ??
              json['logoUrl'] ??
              json['avatarUrl'] ??
              json['photoUrl'])
          ?.toString()
          .trim() ??
          '',
      name: json['name']?.toString() ?? '',
      originalPrice: originalPrice,
      category: normalizedCategories.isNotEmpty
          ? normalizedCategories.first
          : json['category']?.toString() ?? '',
      categories: normalizedCategories,
      deliveryPartnerIds:
          _normalizeStringList(json['deliveryPartnerIds'] as List<dynamic>?),
      paymentPartnerIds:
          _normalizeStringList(json['paymentPartnerIds'] as List<dynamic>?),
      description: json['description']?.toString() ?? '',
      imageUrl: resolvedMainImageUrl,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      imageUrls: imageUrls,
      videoUrl: videoUrls.isNotEmpty ? videoUrls.first : fallbackVideoUrl,
      videoUrls: videoUrls,
      videoThumbnailUrl: videoThumbnailUrls.isNotEmpty
          ? videoThumbnailUrls.first
          : (json['videoThumbnailUrl']?.toString() ?? ''),
      videoThumbnailUrls: videoThumbnailUrls,
      detailsVideoSourceUrl: json['detailsVideoSourceUrl']?.toString() ?? '',
      visualSearchImageUrl: json['visualSearchImageUrl']?.toString() ?? '',
      model3dUrl:
          json['model3dUrl']?.toString() ??
          json['model3DUrl']?.toString() ??
          json['threeDModelUrl']?.toString() ??
          json['modelUrl']?.toString() ??
          '',
      model3dScanImageUrls:
          _normalizeStringList(json['model3dScanImageUrls'] as List<dynamic>?),
      variants: variants,
      mainImageIndex: mainImageIndex,
      buyModalImageUrl: json['buyModalImageUrl']?.toString() ?? '',
      buyModalImageSourceUrl:
          json['buyModalImageSourceUrl']?.toString() ?? '',
      cardImageUrl: json['cardImageUrl']?.toString() ?? '',
      cardImageSourceUrl: json['cardImageSourceUrl']?.toString() ?? '',
      detailsImageCrops: detailsImageCrops,
      detailsVideoPositionX: _normalizeCardImagePosition(
        (json['detailsVideoPositionX'] as num?)?.toDouble(),
      ),
      detailsVideoPositionY: _normalizeCardImagePosition(
        (json['detailsVideoPositionY'] as num?)?.toDouble(),
      ),
      detailsVideoZoomPercent: _normalizeCropZoomPercent(
        (json['detailsVideoZoomPercent'] as num?)?.toDouble(),
      ),
      detailsVideoVisibleWidthFraction: _normalizeVisibleFraction(
        (json['detailsVideoVisibleWidthFraction'] as num?)?.toDouble(),
      ),
      detailsVideoVisibleHeightFraction: _normalizeVisibleFraction(
        (json['detailsVideoVisibleHeightFraction'] as num?)?.toDouble(),
      ),
      detailsVideoPreviewTimeMs: _normalizeMediaTimeMs(
        (json['detailsVideoPreviewTimeMs'] as num?)?.toDouble(),
      ),
      buyModalImagePositionX: _normalizeCardImagePosition(
        (json['buyModalImagePositionX'] as num?)?.toDouble(),
      ),
      buyModalImagePositionY: _normalizeCardImagePosition(
        (json['buyModalImagePositionY'] as num?)?.toDouble(),
      ),
      cardImagePositionX: _normalizeCardImagePosition(
        (json['cardImagePositionX'] as num?)?.toDouble(),
      ),
      cardImagePosition: _normalizeCardImagePosition(
        (json['cardImagePosition'] as num?)?.toDouble(),
      ),
      salesPrice: salesPrice,
      stock: stock,
      sold: sold,
      rating: rating,
      ratingCount: ratingCount,
      ratingPoints: ratingPoints,
      commentCount: commentCount,
      reviewComments: reviewComments,
      isActive: _normalizeProductActiveState(json['isActive']),
    );
  }
}

int _normalizeNonNegativeInt(dynamic value, [int fallback = 0]) {
  final number = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (number == null || !number.isFinite) {
    return fallback;
  }

  return number < 0 ? fallback : number.toInt();
}

double _normalizeNonNegativeDouble(dynamic value, [double fallback = 0]) {
  final number = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (number == null || !number.isFinite) {
    return fallback;
  }

  return number < 0 ? fallback : number.toDouble();
}

double _normalizeProductReviewRating(dynamic value) {
  final rating = value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '');
  if (rating == null || !rating.isFinite || rating <= 0) {
    return 0;
  }

  return rating.clamp(0, 5).toDouble();
}

String _defaultProductReviewCommentForRating(double rating) {
  final normalizedRating = rating.round().clamp(1, 5).toInt();
  if (rating <= 0) {
    return '';
  }

  switch (normalizedRating) {
    case 1:
      return 'Very Bad';
    case 2:
      return 'Bad';
    case 3:
      return 'Good';
    case 4:
      return 'Very Good';
    case 5:
      return 'Excellent';
  }

  return '';
}

ProductReviewMediaType _inferProductReviewMediaType({
  required String url,
  Object? type,
  Object? contentType,
}) {
  final normalizedType = type?.toString().trim().toLowerCase() ?? '';
  final normalizedContentType =
      contentType?.toString().trim().toLowerCase() ?? '';
  final normalizedUrl = url.trim().toLowerCase().split('?').first;

  if (normalizedType.contains('video') ||
      normalizedContentType.startsWith('video/')) {
    return ProductReviewMediaType.video;
  }
  if (normalizedType.contains('image') ||
      normalizedType.contains('photo') ||
      normalizedContentType.startsWith('image/')) {
    return ProductReviewMediaType.image;
  }
  if (RegExp(r'\.(mp4|mov|m4v|webm|avi|mkv|3gp)$')
      .hasMatch(normalizedUrl)) {
    return ProductReviewMediaType.video;
  }

  return ProductReviewMediaType.image;
}

Object? _wrapProductReviewMediaUrls(Object? value, String type) {
  if (value is List) {
    return value
        .map((url) => {
              'type': type,
              'url': url,
            })
        .toList(growable: false);
  }
  if (value == null || value.toString().trim().isEmpty) {
    return null;
  }

  return {
    'type': type,
    'url': value,
  };
}

List<ProductReviewMedia> _normalizeProductReviewMediaList(
  Iterable<Object?> values,
) {
  final media = <ProductReviewMedia>[];
  final seenUrls = <String>{};

  void addValue(Object? value) {
    if (value == null) {
      return;
    }
    if (value is List) {
      for (final item in value) {
        addValue(item);
      }
      return;
    }

    final reviewMedia = ProductReviewMedia.fromJson(value);
    final url = reviewMedia.url.trim();
    if (url.isEmpty) {
      return;
    }

    final dedupeKey = url.toLowerCase();
    if (!seenUrls.add(dedupeKey)) {
      return;
    }

    media.add(reviewMedia);
  }

  for (final value in values) {
    addValue(value);
  }

  return List<ProductReviewMedia>.unmodifiable(media);
}

ProductReviewSellerReply? _normalizeProductReviewSellerReply(
  Object? value, {
  Object? fallbackMessage,
}) {
  final hasUsableValue = value is Map ||
      (value != null && value.toString().trim().isNotEmpty);
  final reply = ProductReviewSellerReply.fromJson(
    hasUsableValue ? value : {'message': fallbackMessage},
  );
  if (reply.message.trim().isEmpty) {
    return null;
  }

  return reply;
}

DateTime? _normalizeProductReviewDate(dynamic value, dynamic epochMs) {
  final epochNumber =
      epochMs is num ? epochMs : num.tryParse(epochMs?.toString() ?? '');
  if (epochNumber != null && epochNumber.isFinite && epochNumber > 0) {
    return DateTime.fromMillisecondsSinceEpoch(epochNumber.toInt());
  }

  final rawValue = value?.toString().trim() ?? '';
  if (rawValue.isEmpty) {
    return null;
  }

  return DateTime.tryParse(rawValue);
}

List<ProductReviewComment> _normalizeProductReviewComments(dynamic rawValues) {
  if (rawValues is! List) {
    return const <ProductReviewComment>[];
  }

  final comments = <ProductReviewComment>[];
  for (final candidate in rawValues) {
    if (candidate is! Map) {
      continue;
    }

    final review = ProductReviewComment.fromJson(
      Map<String, dynamic>.from(candidate),
    );
    if (review.message.trim().isEmpty && review.media.isEmpty) {
      continue;
    }

    comments.add(review);
  }

  comments.sort((left, right) {
    final leftDate = left.createdAt;
    final rightDate = right.createdAt;
    if (leftDate == null && rightDate == null) {
      return 0;
    }
    if (leftDate == null) {
      return 1;
    }
    if (rightDate == null) {
      return -1;
    }
    return rightDate.compareTo(leftDate);
  });

  return List<ProductReviewComment>.unmodifiable(comments);
}

bool _normalizeProductActiveState(dynamic value, [bool fallback = true]) {
  if (value is bool) {
    return value;
  }

  if (value is num) {
    return value != 0;
  }

  if (value is String) {
    final normalizedValue = value.trim().toLowerCase();
    if (normalizedValue == 'true') {
      return true;
    }
    if (normalizedValue == 'false') {
      return false;
    }
  }

  return fallback;
}

double _normalizeCardImagePosition(double? value) {
  final normalizedValue = value ?? 50;
  if (!normalizedValue.isFinite) {
    return 50;
  }

  return normalizedValue.clamp(0, 100).toDouble();
}

double _normalizeCropZoomPercent(double? value) {
  final normalizedValue = value ?? 0;
  if (!normalizedValue.isFinite) {
    return 0;
  }

  return normalizedValue.clamp(0, 500).toDouble();
}

double _normalizeVisibleFraction(double? value) {
  final normalizedValue = value ?? 0;
  if (!normalizedValue.isFinite) {
    return 0;
  }

  return normalizedValue.clamp(0, 1).toDouble();
}

double _normalizeMediaTimeMs(double? value) {
  final normalizedValue = value ?? 0;
  if (!normalizedValue.isFinite) {
    return 0;
  }

  return normalizedValue < 0 ? 0 : normalizedValue;
}

ProductVariant? findProductVariantById(Product product, String variantId) {
  final normalizedVariantId = variantId.trim().toLowerCase();
  if (normalizedVariantId.isEmpty) {
    return null;
  }

  for (final variant in product.variants) {
    if (variant.id.trim().toLowerCase() == normalizedVariantId) {
      return variant;
    }
  }

  return null;
}

int resolveProductAvailableStock(
  Product product, {
  ProductVariant? variant,
  List<Product> catalogProducts = const <Product>[],
}) {
  final resolvedVariant = variant;
  if (resolvedVariant == null) {
    return product.stock <= 0 ? 0 : product.stock;
  }

  if (resolvedVariant.addOns.isEmpty) {
    return product.stock <= 0 ? 0 : product.stock;
  }

  if (catalogProducts.isEmpty) {
    return 0;
  }

  int? availableStock;
  for (final addOn in resolvedVariant.addOns) {
    final requiredQuantity = addOn.quantity <= 0 ? 1 : addOn.quantity;
    Product? inventoryProduct;

    for (final product in catalogProducts) {
      if (product.id.trim().toLowerCase() == addOn.id.trim().toLowerCase()) {
        inventoryProduct = product;
        break;
      }
    }

    if (inventoryProduct == null || inventoryProduct.stock <= 0) {
      return 0;
    }

    final supportedUnits = inventoryProduct.stock ~/ requiredQuantity;
    if (supportedUnits <= 0) {
      return 0;
    }

    if (availableStock == null || supportedUnits < availableStock) {
      availableStock = supportedUnits;
    }
  }

  return availableStock ?? 0;
}

bool isProductVisibleToUsers(Product product) {
  return product.isApprovedForApp &&
      product.isActive &&
      resolveProductAvailableStock(product) > 0;
}

List<Product> filterVisibleProducts(Iterable<Product> products) {
  return products.where(isProductVisibleToUsers).toList(growable: false);
}

List<String> _normalizeProductCategories(
  List<dynamic>? rawCategories,
  String fallbackCategory,
) {
  final normalizedCategories = <String>[];
  final seen = <String>{};

  for (final candidate in rawCategories ?? const <dynamic>[]) {
    final category = candidate?.toString().trim() ?? '';
    final normalizedKey = category.toLowerCase();
    if (category.isEmpty || seen.contains(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedCategories.add(category);
  }

  final fallback = fallbackCategory.trim();
  if (normalizedCategories.isEmpty && fallback.isNotEmpty) {
    normalizedCategories.add(fallback);
  }

  return List<String>.unmodifiable(normalizedCategories);
}

List<String> _normalizeProductImageUrls(
  List<dynamic>? rawImageUrls,
  String fallbackImageUrl,
) {
  final normalizedImageUrls = <String>[];
  final seen = <String>{};

  for (final candidate in rawImageUrls ?? const <dynamic>[]) {
    final imageUrl = candidate?.toString().trim() ?? '';
    final normalizedKey = imageUrl.toLowerCase();
    if (imageUrl.isEmpty || seen.contains(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedImageUrls.add(imageUrl);
  }

  final fallback = fallbackImageUrl.trim();
  if (normalizedImageUrls.isEmpty && fallback.isNotEmpty) {
    normalizedImageUrls.add(fallback);
  }

  return List<String>.unmodifiable(normalizedImageUrls);
}

List<String> _normalizeStringList(List<dynamic>? rawValues) {
  final normalizedValues = <String>[];
  final seen = <String>{};

  for (final candidate in rawValues ?? const <dynamic>[]) {
    final value = candidate?.toString().trim() ?? '';
    final normalizedKey = value.toLowerCase();
    if (value.isEmpty || seen.contains(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.add(value);
  }

  return List<String>.unmodifiable(normalizedValues);
}

List<String> _normalizeProductVideoUrls(
  List<dynamic>? rawVideoUrls,
  String fallbackVideoUrl,
) {
  final normalizedVideoUrls = <String>[];
  final seen = <String>{};

  for (final candidate in rawVideoUrls ?? const <dynamic>[]) {
    final videoUrl = candidate?.toString().trim() ?? '';
    final normalizedKey = videoUrl.toLowerCase();
    if (videoUrl.isEmpty || seen.contains(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedVideoUrls.add(videoUrl);
  }

  final fallback = fallbackVideoUrl.trim();
  if (normalizedVideoUrls.isEmpty && fallback.isNotEmpty) {
    normalizedVideoUrls.add(fallback);
  }

  return List<String>.unmodifiable(normalizedVideoUrls);
}

List<String> _normalizeProductVideoThumbnailUrls(
  List<dynamic>? rawVideoThumbnailUrls,
  List<String> videoUrls,
  String fallbackVideoThumbnailUrl,
) {
  if (videoUrls.isEmpty) {
    return const <String>[];
  }

  final normalizedThumbnailUrls = <String>[];
  for (var index = 0; index < videoUrls.length; index += 1) {
    final thumbnailUrl =
        rawVideoThumbnailUrls != null && index < rawVideoThumbnailUrls.length
            ? rawVideoThumbnailUrls[index]?.toString().trim() ?? ''
            : '';
    if (thumbnailUrl.isNotEmpty) {
      normalizedThumbnailUrls.add(thumbnailUrl);
      continue;
    }

    normalizedThumbnailUrls.add(
      index == 0 ? fallbackVideoThumbnailUrl.trim() : '',
    );
  }

  return List<String>.unmodifiable(normalizedThumbnailUrls);
}

List<ProductImageCrop> _normalizeProductImageCrops(
  List<dynamic>? rawImageCrops,
) {
  final normalizedImageCrops = <ProductImageCrop>[];
  final seen = <String>{};

  for (final candidate in rawImageCrops ?? const <dynamic>[]) {
    if (candidate is! Map<String, dynamic>) {
      continue;
    }

    final imageCrop = ProductImageCrop.fromJson(candidate);
    final sourceUrl = imageCrop.sourceUrl.trim();
    final croppedImageUrl = imageCrop.croppedImageUrl.trim();
    final normalizedKey = sourceUrl.toLowerCase();
    if (sourceUrl.isEmpty ||
        croppedImageUrl.isEmpty ||
        seen.contains(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedImageCrops.add(imageCrop);
  }

  return List<ProductImageCrop>.unmodifiable(normalizedImageCrops);
}

int _resolveProductMainImageIndex({
  required List<String> imageUrls,
  required int? requestedIndex,
  required String requestedMainImageUrl,
}) {
  if (imageUrls.isEmpty) {
    return 0;
  }

  if (requestedIndex != null &&
      requestedIndex >= 0 &&
      requestedIndex < imageUrls.length) {
    return requestedIndex;
  }

  final fallbackIndex = imageUrls.indexOf(requestedMainImageUrl.trim());
  return fallbackIndex >= 0 ? fallbackIndex : 0;
}
