import 'package:switch_app/services/review_media_like_service_base.dart';

import 'review_media_like_service_stub.dart'
    if (dart.library.io) 'review_media_like_service_io.dart'
    as service;

export 'review_media_like_service_base.dart';

ReviewMediaLikeService createReviewMediaLikeService() =>
    service.createReviewMediaLikeService();
