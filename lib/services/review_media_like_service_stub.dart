import 'package:switch_app/services/review_media_like_service_base.dart';

ReviewMediaLikeService createReviewMediaLikeService() =>
    _StubReviewMediaLikeService();

class _StubReviewMediaLikeService implements ReviewMediaLikeService {
  @override
  Future<Map<String, ReviewMediaLikeState>> fetchLikes(String productId) async =>
      const <String, ReviewMediaLikeState>{};

  @override
  Future<ReviewMediaLikeResult> setLiked({
    required String productId,
    required String reviewId,
    required String mediaUrl,
    required bool liked,
  }) async {
    return ReviewMediaLikeResult.failure(
      'Liking review media is available on the mobile app.',
    );
  }
}
