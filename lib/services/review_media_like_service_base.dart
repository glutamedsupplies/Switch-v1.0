class ReviewMediaLikeState {
  const ReviewMediaLikeState({required this.count, required this.liked});

  /// Likes recorded by real accounts (excludes any seeded starting count).
  final int count;
  final bool liked;
}

class ReviewMediaLikeResult {
  const ReviewMediaLikeResult._({
    required this.ok,
    this.state,
    this.message = '',
    this.requiresLogin = false,
  });

  final bool ok;
  final ReviewMediaLikeState? state;
  final String message;
  final bool requiresLogin;

  factory ReviewMediaLikeResult.success(ReviewMediaLikeState state) =>
      ReviewMediaLikeResult._(ok: true, state: state);

  factory ReviewMediaLikeResult.failure(
    String message, {
    bool requiresLogin = false,
  }) => ReviewMediaLikeResult._(
    ok: false,
    message: message,
    requiresLogin: requiresLogin,
  );
}

String reviewMediaLikeKey(String reviewId, String mediaUrl) =>
    '${reviewId.trim()}::${mediaUrl.trim()}';

abstract class ReviewMediaLikeService {
  /// Like states for every review photo/video of [productId], keyed by
  /// [reviewMediaLikeKey].
  Future<Map<String, ReviewMediaLikeState>> fetchLikes(String productId);

  Future<ReviewMediaLikeResult> setLiked({
    required String productId,
    required String reviewId,
    required String mediaUrl,
    required bool liked,
  });
}
