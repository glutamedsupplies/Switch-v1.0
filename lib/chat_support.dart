import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show compute;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/services/product_repository.dart';
import 'package:gms_shopping/services/chat_support_sync.dart';
import 'package:gms_shopping/services/chat_support_sync_base.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/utils/currency_format.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:gms_shopping/widgets/product_online_status_badge.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';

final _chatSupportSyncService = createChatSupportSyncService();

const String _chatSupportEmployeeAvatarAsset =
    'assets/images/chat_support_employee_avatar.jpg';
const String _chatSupportEmployeeName = 'Support Employee';
const String _chatSupportPinProductMessageSource = 'pin-product';
const Color _chatSupportLightBubbleBackgroundColor = Color(0xFFFAFAFA);

String _chatSupportProductDisplayName(Product product) {
  final trimmedName = product.name.trim();
  return trimmedName.isEmpty ? 'Unnamed Product' : trimmedName;
}

double _chatSupportProductDisplayPrice(Product product) {
  final salesPrice = product.salesPrice;
  if (salesPrice != null &&
      salesPrice >= 0 &&
      salesPrice < product.originalPrice) {
    return salesPrice;
  }

  return product.originalPrice;
}

String _chatSupportProductPriceLabel(Product product) {
  final price = _chatSupportProductDisplayPrice(product);
  if (price <= 0) {
    return 'Price unavailable';
  }
  return formatPesoCurrency(price);
}

bool _isChatSupportPinnableProduct(Product product) {
  return product.id.trim().isNotEmpty &&
      product.name.trim().isNotEmpty &&
      product.isActive &&
      isProductVisibleToUsers(product);
}

String _generateChatCustomerId() {
  return 'customer-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';
}

String _buildChatThreadId(
  String customerId,
  String productId, {
  String adminId = '',
}) {
  final normalizedCustomerId = customerId.trim().isEmpty
      ? 'customer-local'
      : customerId.trim();
  final normalizedAdminId = adminId.trim().isNotEmpty
      ? adminId.trim().toLowerCase()
      : '';
  final normalizedProductId = productId.trim().isNotEmpty
      ? productId.trim().toLowerCase()
      : 'product';
  if (normalizedAdminId.isNotEmpty) {
    return 'thread-$normalizedCustomerId-$normalizedAdminId-$normalizedProductId';
  }
  return 'thread-$normalizedCustomerId-$normalizedProductId';
}

String _defaultChatCustomerLabel(String customerId) {
  final trimmedCustomerId = customerId.trim();
  if (trimmedCustomerId.isEmpty) {
    return 'App User';
  }

  final suffix = trimmedCustomerId.length <= 4
      ? trimmedCustomerId
      : trimmedCustomerId.substring(trimmedCustomerId.length - 4);
  return 'App User ${suffix.toUpperCase()}';
}

DateTime _parseChatDate(
  String rawValue, {
  DateTime? fallback,
}) {
  final parsedDate = DateTime.tryParse(rawValue);
  if (parsedDate != null) {
    return parsedDate.toLocal();
  }

  return (fallback ?? DateTime.now()).toLocal();
}

DateTime? _parseNullableChatDate(String? rawValue) {
  final trimmedValue = rawValue?.trim() ?? '';
  if (trimmedValue.isEmpty) {
    return null;
  }

  final parsedDate = DateTime.tryParse(trimmedValue);
  return parsedDate?.toLocal();
}

double _normalizeChatRating(Object? rawValue) {
  final parsedValue = rawValue is num
      ? rawValue.toDouble()
      : double.tryParse(rawValue?.toString() ?? '');
  if (parsedValue == null || !parsedValue.isFinite) {
    return 0;
  }
  if (parsedValue < 0) {
    return 0;
  }
  if (parsedValue > 5) {
    return 5;
  }
  return parsedValue;
}

String _normalizeEmployeeRatingComment(String? rawValue) {
  return rawValue?.trim() ?? '';
}

DateTime _laterChatDate(DateTime left, DateTime right) {
  return left.isAfter(right) ? left : right;
}

DateTime? _laterNullableChatDate(DateTime? left, DateTime? right) {
  if (left == null) {
    return right;
  }
  if (right == null) {
    return left;
  }

  return _laterChatDate(left, right);
}

String _generateChatMessageId(bool isFromSupport) {
  final role = isFromSupport ? 'support' : 'user';
  return 'msg-${DateTime.now().microsecondsSinceEpoch}-$role';
}

bool _isChatSupportProductInTopSelling(
  Product product,
  List<Product> products, {
  int limit = 10,
}) {
  final rankedProducts = [
    ...filterVisibleProducts(products).where((product) => product.sold > 0),
  ]..sort((first, second) {
    final soldCompare = second.sold.compareTo(first.sold);
    if (soldCompare != 0) {
      return soldCompare;
    }

    final ratingCompare = second.rating.compareTo(first.rating);
    if (ratingCompare != 0) {
      return ratingCompare;
    }

    return first.name.compareTo(second.name);
  });

  return rankedProducts.take(limit).any((candidate) => candidate.id == product.id);
}

String _formatChatSupportSoldCount(int sold) {
  if (sold < 1000) {
    return sold.toString();
  }

  final thousands = sold ~/ 1000;
  final suffix = sold % 1000 == 0 ? 'K' : 'K+';
  return '$thousands$suffix';
}

final RegExp _chatWhitespacePattern = RegExp(r'\s+');

String _normalizeChatPreviewText(String text) {
  return text.replaceAll(_chatWhitespacePattern, ' ').trim();
}

String _chatReplyPreviewText(ChatSupportStoredMessage message) {
  if (_isQuickTapHeartMessage(message)) {
    return 'Heart';
  }

  final messageText = _normalizeChatPreviewText(message.text);
  if (messageText.isNotEmpty) {
    return messageText;
  }

  if (message.hasMedia) {
    return message.hasVideo ? 'Video attachment' : 'Photo attachment';
  }

  return 'Message';
}

bool _isCurrentChatReplySenderLabel(
  String senderLabel, {
  required String currentCustomerLabel,
  required String currentCustomerId,
}) {
  final normalizedSenderLabel = senderLabel.trim().toLowerCase();
  if (normalizedSenderLabel.isEmpty) {
    return false;
  }

  final normalizedCurrentCustomerLabel = currentCustomerLabel.trim().toLowerCase();
  final normalizedDefaultCustomerLabel =
      _defaultChatCustomerLabel(currentCustomerId).trim().toLowerCase();
  return normalizedSenderLabel == normalizedCurrentCustomerLabel ||
      normalizedSenderLabel == normalizedDefaultCustomerLabel;
}

String _resolveReplySenderDisplayLabel(
  ChatSupportStoredMessage message, {
  required String currentCustomerLabel,
  required String currentCustomerId,
}) {
  final rawSenderLabel = message.replyTo?.senderLabel.trim() ?? '';
  if (rawSenderLabel.isEmpty) {
    return '';
  }

  if (rawSenderLabel.toLowerCase() == 'you') {
    if (message.isFromSupport) {
      return message.isAi ? 'AI Assistant' : 'Support';
    }
    return 'You';
  }

  if (_isCurrentChatReplySenderLabel(
    rawSenderLabel,
    currentCustomerLabel: currentCustomerLabel,
    currentCustomerId: currentCustomerId,
  )) {
    return 'You';
  }

  return rawSenderLabel;
}

String _buildReplyLineLabel(
  ChatSupportStoredMessage message, {
  required String currentCustomerLabel,
  required String currentCustomerId,
}) {
  final senderLabel = _resolveReplySenderDisplayLabel(
    message,
    currentCustomerLabel: currentCustomerLabel,
    currentCustomerId: currentCustomerId,
  );
  if (senderLabel.isEmpty) {
    return '';
  }

  if (senderLabel == 'You') {
    return message.isFromSupport ? 'Replied to themself' : 'Replied to Yourself';
  }

  if (message.isFromSupport && senderLabel == 'Support') {
    return 'Replied to Themself';
  }

  return 'Replied to $senderLabel';
}

String _resolveChatMessageId({
  required String rawId,
  required String text,
  required bool isFromSupport,
  required DateTime timestamp,
}) {
  final trimmedId = rawId.trim();
  if (trimmedId.isNotEmpty) {
    return trimmedId;
  }

  return 'legacy-${timestamp.microsecondsSinceEpoch}-${isFromSupport ? 'support' : 'user'}-${text.hashCode}';
}

bool _didChatReplyReferenceChange(
  ChatSupportReplyReference? previous,
  ChatSupportReplyReference? next,
) {
  if (identical(previous, next)) {
    return false;
  }

  if (previous == null || next == null) {
    return previous != next;
  }

  return previous.messageId != next.messageId ||
      previous.senderLabel != next.senderLabel ||
      previous.previewText != next.previewText;
}

bool _didChatMessageChange(
  ChatSupportStoredMessage previous,
  ChatSupportStoredMessage next,
) {
  return previous.id != next.id ||
      previous.text != next.text ||
      previous.isFromSupport != next.isFromSupport ||
      previous.timestamp != next.timestamp ||
      previous.imageUrl != next.imageUrl ||
      previous.imageName != next.imageName ||
      previous.isSentToServer != next.isSentToServer ||
      previous.reactionEmoji != next.reactionEmoji ||
      previous.source != next.source ||
      previous.editedAt != next.editedAt ||
      previous.deletedAt != next.deletedAt ||
      _didChatReplyReferenceChange(previous.replyTo, next.replyTo);
}

bool _chatAttachmentLooksLikeVideo({
  required String url,
  required String name,
}) {
  final normalizedUrl = url.trim().toLowerCase();
  final normalizedName = name.trim().toLowerCase();
  const videoExtensions = <String>[
    '.mp4',
    '.mov',
    '.m4v',
    '.webm',
    '.avi',
    '.mkv',
    '.3gp',
  ];

  return videoExtensions.any(
    (extension) =>
        normalizedUrl.endsWith(extension) || normalizedName.endsWith(extension),
  );
}

const Duration _agedUserMediaThreshold = Duration(days: 7);
const double _chatSupportBorderRadius = 8;
const double _chatSupportImageUploadMaxWidth = 1280;
const double _chatSupportImageUploadMaxHeight = 720;
const int _chatSupportImageCacheWidth = 1280;
const int _chatSupportImageCacheHeight = 720;

bool _shouldRenderAgedUserMedia(
  ChatSupportStoredMessage message, {
  DateTime? now,
}) {
  if (message.isFromSupport || !message.hasMedia) {
    return false;
  }

  final currentTime = now ?? DateTime.now();
  return !currentTime.isBefore(
    message.timestamp.add(_agedUserMediaThreshold),
  );
}

bool _isQuickTapHeartMessage(ChatSupportStoredMessage message) {
  if (message.hasMedia) {
    return false;
  }

  final normalizedText = message.text
      .replaceAll('\uFE0F', '')
      .replaceAll('\u200D', '')
      .trim();
  return normalizedText == '❤';
}

bool _isEmojiPresentationRune(int rune) {
  if (rune == 0x200D || rune == 0xFE0F || rune == 0x20E3) {
    return true;
  }

  return (rune >= 0x1F000 && rune <= 0x1FAFF) ||
      (rune >= 0x2600 && rune <= 0x27BF) ||
      (rune >= 0x2B00 && rune <= 0x2BFF) ||
      (rune >= 0x2300 && rune <= 0x23FF);
}

bool _isEmojiOnlyMessage(ChatSupportStoredMessage message) {
  if (message.hasMedia) {
    return false;
  }

  final text = message.text.trim();
  if (text.isEmpty) {
    return false;
  }

  var hasVisibleEmojiRune = false;
  for (final rune in text.runes) {
    if (rune == 0x20 || rune == 0x0A || rune == 0x09 || rune == 0x0D) {
      continue;
    }
    if (!_isEmojiPresentationRune(rune)) {
      return false;
    }
    if (rune != 0x200D && rune != 0xFE0F && rune != 0x20E3) {
      hasVisibleEmojiRune = true;
    }
  }

  return hasVisibleEmojiRune;
}

List<ChatSupportStoredMessage> _mergeChatMessages(
  List<ChatSupportStoredMessage> primary,
  List<ChatSupportStoredMessage> secondary,
  {
    bool authoritativeSecondary = false,
  }
) {
  final messagesById = <String, ChatSupportStoredMessage>{};

  void addMessages(List<ChatSupportStoredMessage> messages) {
    for (final message in messages) {
      if (message.text.trim().isEmpty && !message.hasMedia) {
        if (!message.isDeleted) {
          continue;
        }
      }
      final normalizedMessageId = message.id.trim();
      final existingMessage = messagesById[normalizedMessageId];
      if (existingMessage == null) {
        messagesById[normalizedMessageId] = message;
        continue;
      }

      final shouldKeepDeletedState = existingMessage.isDeleted && !message.isDeleted;

      messagesById[normalizedMessageId] = existingMessage.copyWith(
        text: shouldKeepDeletedState
            ? existingMessage.text
            : message.isDeleted
            ? message.text
            : (message.text.trim().isNotEmpty ? message.text : existingMessage.text),
        isFromSupport: message.isFromSupport,
        timestamp: message.timestamp,
        imageUrl: shouldKeepDeletedState
            ? existingMessage.imageUrl
            : message.isDeleted
            ? message.imageUrl
            : (message.imageUrl.trim().isNotEmpty
                ? message.imageUrl
                : existingMessage.imageUrl),
        imageName: shouldKeepDeletedState
            ? existingMessage.imageName
            : message.isDeleted
            ? message.imageName
            : (message.imageName.trim().isNotEmpty
                ? message.imageName
                : existingMessage.imageName),
        isSentToServer:
            existingMessage.isSentToServer || message.isSentToServer,
        reactionEmoji: shouldKeepDeletedState
            ? existingMessage.reactionEmoji
            : message.isDeleted
            ? message.reactionEmoji
            : (message.reactionEmoji.trim().isNotEmpty
                ? message.reactionEmoji
                : existingMessage.reactionEmoji),
        source: message.source.trim().isNotEmpty
            ? message.source
            : existingMessage.source,
        editedAt: shouldKeepDeletedState
            ? existingMessage.editedAt
            : (message.editedAt ?? existingMessage.editedAt),
        deletedAt: message.deletedAt ?? existingMessage.deletedAt,
        replyTo: shouldKeepDeletedState
            ? null
            : (message.isDeleted ? null : (message.replyTo ?? existingMessage.replyTo)),
      );
    }
  }

  addMessages(primary);
  addMessages(secondary);

  if (authoritativeSecondary) {
    final secondaryMessageIds =
        secondary
            .map((message) => message.id.trim())
            .where((messageId) => messageId.isNotEmpty)
            .toSet();
    messagesById.removeWhere((messageId, message) {
      if (secondaryMessageIds.contains(messageId)) {
        return false;
      }

      return message.isFromSupport || message.isSentToServer;
    });
  }

  final mergedMessages = messagesById.values.toList(growable: false)
    ..sort((left, right) {
      final timestampComparison = left.timestamp.compareTo(right.timestamp);
      if (timestampComparison != 0) {
        return timestampComparison;
      }
      return left.id.compareTo(right.id);
    });

  return List<ChatSupportStoredMessage>.unmodifiable(mergedMessages);
}

Future<void> openChatSupportPage(
  BuildContext context, {
  required Product product,
  bool slideFromChats = false,
  bool showsTopBrand = false,
}) async {
  await ChatSupportStore.instance.ensureLoaded();

  var resolvedProduct = product;
  var resolvedShowsTopBrand = showsTopBrand;

  final needsProductHydration =
      product.rating <= 0 || product.sold <= 0 || !showsTopBrand;

  if (needsProductHydration) {
    try {
      final catalogProducts = await createProductRepository().fetchProducts();
      Product? catalogMatch;
      for (final candidate in catalogProducts) {
        if (candidate.id.trim().toLowerCase() == product.id.trim().toLowerCase()) {
          catalogMatch = candidate;
          break;
        }
      }

      if (catalogMatch != null) {
        resolvedProduct = catalogMatch;
        resolvedShowsTopBrand =
            resolvedShowsTopBrand ||
            _isChatSupportProductInTopSelling(catalogMatch, catalogProducts);
      }
    } catch (_) {}
  }

  if (!context.mounted) {
    return;
  }

  await Navigator.of(context).push(
    slideFromChats
        ? CupertinoPageRoute<void>(
            builder: (_) => ChatSupportPage(
              product: resolvedProduct,
              showsTopBrand: resolvedShowsTopBrand,
              pinProductOnOpen: false,
              pinProductOnFirstUserChat: false,
            ),
          )
        : MaterialPageRoute<void>(
            builder: (_) => ChatSupportPage(
              product: resolvedProduct,
              showsTopBrand: resolvedShowsTopBrand,
              pinProductOnOpen: false,
              pinProductOnFirstUserChat: true,
            ),
          ),
  );

  await ChatSupportStore.instance.refreshThreadsFromServer();
}

const Object _chatReplyReferenceNoChange = Object();
const Object _chatEditedAtNoChange = Object();
const Object _chatDeletedAtNoChange = Object();
const Object _chatTypingEntryNoChange = Object();

class ChatSupportReplyReference {
  const ChatSupportReplyReference({
    required this.messageId,
    required this.senderLabel,
    required this.previewText,
  });

  final String messageId;
  final String senderLabel;
  final String previewText;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'messageId': messageId,
      'senderLabel': senderLabel,
      'previewText': previewText,
    };
  }

  static ChatSupportReplyReference? tryParse(Object? rawValue) {
    if (rawValue is! Map) {
      return null;
    }

    final replyMap = rawValue.cast<Object?, Object?>();
    final messageId = replyMap['messageId']?.toString().trim() ?? '';
    final senderLabel = replyMap['senderLabel']?.toString().trim() ?? '';
    final previewText =
        _normalizeChatPreviewText(replyMap['previewText']?.toString() ?? '');
    if (messageId.isEmpty || senderLabel.isEmpty || previewText.isEmpty) {
      return null;
    }

    return ChatSupportReplyReference(
      messageId: messageId,
      senderLabel: senderLabel,
      previewText: previewText,
    );
  }
}

class ChatSupportTypingEntry {
  const ChatSupportTypingEntry({
    required this.actor,
    required this.displayName,
    required this.updatedAt,
    this.avatarUrl = '',
  });

  final String actor;
  final String displayName;
  final String avatarUrl;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'actor': actor,
      'isTyping': true,
      'displayName': displayName,
      'avatarUrl': avatarUrl,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static ChatSupportTypingEntry? tryParse(
    Object? rawValue, {
    required String fallbackActor,
  }) {
    if (rawValue is! Map) {
      return null;
    }

    final typingMap = rawValue.cast<Object?, Object?>();
    if (typingMap['isTyping'] != true) {
      return null;
    }

    final actor =
        (typingMap['actor']?.toString().trim().toLowerCase() ??
            fallbackActor)
            .trim()
            .toLowerCase();
    if (actor != 'user' && actor != 'employee') {
      return null;
    }

    final updatedAt = _parseNullableChatDate(
      typingMap['updatedAt']?.toString(),
    );
    if (updatedAt == null) {
      return null;
    }

    final rawDisplayName = typingMap['displayName']?.toString() ?? '';
    final displayName = rawDisplayName
        .replaceAll(_chatWhitespacePattern, ' ')
        .trim();
    final entry = ChatSupportTypingEntry(
      actor: actor,
      displayName: displayName.isNotEmpty
          ? displayName
          : (actor == 'employee' ? 'Employee' : 'App User'),
      avatarUrl: typingMap['avatarUrl']?.toString().trim() ?? '',
      updatedAt: updatedAt,
    );

    return entry;
  }
}

bool _didChatTypingEntryChange(
  ChatSupportTypingEntry? previous,
  ChatSupportTypingEntry? next,
) {
  if (previous == null || next == null) {
    return previous != next;
  }

  return previous.actor != next.actor ||
      previous.displayName != next.displayName ||
      previous.avatarUrl != next.avatarUrl ||
      previous.updatedAt != next.updatedAt;
}

class ChatSupportStoredMessage {
  const ChatSupportStoredMessage({
    required this.id,
    required this.text,
    required this.isFromSupport,
    required this.timestamp,
    this.imageUrl = '',
    this.imageName = '',
    this.isSentToServer = false,
    this.reactionEmoji = '',
    String? source,
    this.editedAt,
    this.deletedAt,
    this.replyTo,
  }) : source = source ?? (isFromSupport ? 'support' : 'user');

  final String id;
  final String text;
  final bool isFromSupport;
  final DateTime timestamp;
  final String imageUrl;
  final String imageName;
  final bool isSentToServer;
  final String reactionEmoji;
  final String source;
  final DateTime? editedAt;
  final DateTime? deletedAt;
  final ChatSupportReplyReference? replyTo;

  bool get isAi => source == 'ai';
  bool get isPinProductIndicator => source == _chatSupportPinProductMessageSource;
  bool get isEdited => editedAt != null;
  bool get isDeleted => deletedAt != null;
  bool get hasMedia => imageUrl.trim().isNotEmpty;
  bool get hasVideo =>
      hasMedia &&
      _chatAttachmentLooksLikeVideo(url: imageUrl, name: imageName);
  bool get hasImage => hasMedia && !hasVideo;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'text': text,
      'isFromSupport': isFromSupport,
      'timestamp': timestamp.toIso8601String(),
      'imageUrl': imageUrl,
      'imageName': imageName,
      'isSentToServer': isSentToServer,
      'reactionEmoji': reactionEmoji,
      'source': source,
      'editedAt': editedAt?.toIso8601String(),
      'deletedAt': deletedAt?.toIso8601String(),
      'replyTo': replyTo?.toJson(),
    };
  }

  factory ChatSupportStoredMessage.fromJson(Map<String, dynamic> json) {
    final isFromSupport = json['isFromSupport'] == true;
    final timestamp = _parseChatDate(json['timestamp']?.toString() ?? '');
    final text = json['text']?.toString() ?? '';
    final imageUrl = json['imageUrl']?.toString() ?? '';
    final imageName = json['imageName']?.toString() ?? '';
    final isSentToServer = json['isSentToServer'] == true;
    final reactionEmoji = json['reactionEmoji']?.toString() ?? '';

    return ChatSupportStoredMessage(
      id: _resolveChatMessageId(
        rawId: json['id']?.toString() ?? '',
        text: text,
        isFromSupport: isFromSupport,
        timestamp: timestamp,
      ),
      text: text,
      isFromSupport: isFromSupport,
      timestamp: timestamp,
      imageUrl: imageUrl,
      imageName: imageName,
      isSentToServer: isSentToServer,
      reactionEmoji: reactionEmoji,
      source: isFromSupport
          ? ((json['source']?.toString().trim().toLowerCase() == 'ai')
                ? 'ai'
                : 'support')
          : (json['source']?.toString().trim().toLowerCase() ==
                  _chatSupportPinProductMessageSource
              ? _chatSupportPinProductMessageSource
              : 'user'),
      editedAt: _parseNullableChatDate(json['editedAt']?.toString()),
      deletedAt: _parseNullableChatDate(json['deletedAt']?.toString()),
      replyTo: ChatSupportReplyReference.tryParse(json['replyTo']),
    );
  }

  ChatSupportStoredMessage copyWith({
    String? id,
    String? text,
    bool? isFromSupport,
    DateTime? timestamp,
    String? imageUrl,
    String? imageName,
    bool? isSentToServer,
    String? reactionEmoji,
    String? source,
    Object? editedAt = _chatEditedAtNoChange,
    Object? deletedAt = _chatDeletedAtNoChange,
    Object? replyTo = _chatReplyReferenceNoChange,
  }) {
    return ChatSupportStoredMessage(
      id: id ?? this.id,
      text: text ?? this.text,
      isFromSupport: isFromSupport ?? this.isFromSupport,
      timestamp: timestamp ?? this.timestamp,
      imageUrl: imageUrl ?? this.imageUrl,
      imageName: imageName ?? this.imageName,
      isSentToServer: isSentToServer ?? this.isSentToServer,
      reactionEmoji: reactionEmoji ?? this.reactionEmoji,
      source: source ?? this.source,
      editedAt: identical(editedAt, _chatEditedAtNoChange)
          ? this.editedAt
          : editedAt as DateTime?,
      deletedAt: identical(deletedAt, _chatDeletedAtNoChange)
          ? this.deletedAt
          : deletedAt as DateTime?,
      replyTo: identical(replyTo, _chatReplyReferenceNoChange)
          ? this.replyTo
          : replyTo as ChatSupportReplyReference?,
    );
  }
}

class ChatSupportThreadData {
  const ChatSupportThreadData({
    required this.threadId,
    required this.adminId,
    required this.customerId,
    required this.customerLabel,
    required this.productId,
    required this.productName,
    required this.productCategory,
    required this.productDescription,
    required this.productImageUrl,
    required this.productOriginalPrice,
    required this.productSalesPrice,
    required this.productStock,
    required this.productSold,
    required this.productRating,
    required this.productShowsTopBrand,
    required this.companyName,
    required this.companyPictureUrl,
    required this.employeeRating,
    required this.employeeRatingComment,
    required this.employeeRatingUpdatedAt,
    required this.updatedAt,
    required this.lastReadAt,
    required this.supportReadAt,
    required this.messages,
    this.userTyping,
    this.employeeTyping,
  });

  final String threadId;
  final String adminId;
  final String customerId;
  final String customerLabel;
  final String productId;
  final String productName;
  final String productCategory;
  final String productDescription;
  final String productImageUrl;
  final double productOriginalPrice;
  final double? productSalesPrice;
  final int productStock;
  final int productSold;
  final double productRating;
  final bool productShowsTopBrand;
  final String companyName;
  final String companyPictureUrl;
  final double employeeRating;
  final String employeeRatingComment;
  final DateTime? employeeRatingUpdatedAt;
  final DateTime updatedAt;
  final DateTime lastReadAt;
  final DateTime? supportReadAt;
  final List<ChatSupportStoredMessage> messages;
  final ChatSupportTypingEntry? userTyping;
  final ChatSupportTypingEntry? employeeTyping;

  bool get hasEmployeeRating => employeeRating > 0;

  String get latestMessage {
    if (messages.isEmpty) {
      return 'No messages yet.';
    }

    final lastMessage = messages.last;
    if (lastMessage.isPinProductIndicator) {
      return 'Pinned ${lastMessage.text}';
    }
    if (lastMessage.isDeleted) {
      return lastMessage.isFromSupport
          ? 'Support deleted a message'
          : 'You deleted a message';
    }
    if (lastMessage.text.trim().isNotEmpty) {
      return lastMessage.text;
    }

    if (lastMessage.hasVideo) {
      return 'Video';
    }

    return lastMessage.hasImage ? 'Photo' : 'No messages yet.';
  }

  ChatSupportStoredMessage? get latestDisplayMessage {
    for (final message in messages.reversed) {
      if (message.isPinProductIndicator) {
        continue;
      }
      if (message.text.trim().isEmpty) {
        if (!message.hasMedia && !message.isDeleted) {
          continue;
        }
      }
      return message;
    }

    return null;
  }

  ChatSupportStoredMessage? get latestUnreadSupportMessage {
    for (final message in messages.reversed) {
      if (!message.isFromSupport) {
        continue;
      }
      if (!message.timestamp.isAfter(lastReadAt)) {
        continue;
      }
      if (message.text.trim().isEmpty) {
        if (!message.hasMedia && !message.isDeleted) {
          continue;
        }
      }
      return message;
    }

    return null;
  }

  ChatSupportStoredMessage? get latestUserMessage {
    for (final message in messages.reversed) {
      if (message.isFromSupport) {
        continue;
      }
      if (message.isPinProductIndicator) {
        continue;
      }
      if (message.text.trim().isEmpty && !message.hasMedia && !message.isDeleted) {
        continue;
      }
      return message;
    }

    return null;
  }

  String get chatListPreviewMessage {
    if (employeeTyping != null) {
      return '${employeeTyping!.displayName} is typing...';
    }

    final unreadSupportMessage = latestUnreadSupportMessage;
    if (unreadSupportMessage != null) {
      if (unreadSupportMessage.isDeleted) {
        return 'Support deleted a message';
      }
      if (unreadSupportMessage.text.trim().isNotEmpty) {
        return unreadSupportMessage.isAi
            ? 'AI: ${unreadSupportMessage.text}'
            : unreadSupportMessage.text;
      }

      final mediaLabel = unreadSupportMessage.hasVideo ? 'video' : 'photo';
      return unreadSupportMessage.isAi
          ? 'AI sent a $mediaLabel'
          : 'Support sent a $mediaLabel';
    }

    final latestMessageForDisplay = latestDisplayMessage;
    if (latestMessageForDisplay == null) {
      return latestMessage;
    }

    if (latestMessageForDisplay.isAi) {
      if (latestMessageForDisplay.text.trim().isNotEmpty) {
        return 'AI: ${latestMessageForDisplay.text}';
      }
      return latestMessageForDisplay.hasVideo
          ? 'AI sent a video'
          : 'AI sent a photo';
    }

    if (latestMessageForDisplay.isPinProductIndicator) {
      return 'Pinned ${latestMessageForDisplay.text}';
    }

    if (latestMessageForDisplay.isDeleted) {
      return latestMessageForDisplay.isFromSupport
          ? 'Support deleted a message'
          : 'You deleted a message';
    }

    if (latestMessageForDisplay.isFromSupport) {
      if (latestMessageForDisplay.text.trim().isNotEmpty) {
        return latestMessageForDisplay.text;
      }
      return latestMessageForDisplay.hasVideo
          ? 'Support sent a video'
          : 'Support sent a photo';
    }

    if (latestMessageForDisplay.text.trim().isNotEmpty) {
      return 'You: ${latestMessageForDisplay.text}';
    }
    return latestMessageForDisplay.hasVideo
        ? 'You sent a video'
        : 'You sent a photo';
  }

  DateTime get chatListPreviewTimestamp {
    return latestUnreadSupportMessage?.timestamp ??
        latestDisplayMessage?.timestamp ??
        updatedAt;
  }

  int get unreadMessageCount {
    return messages
        .where(
          (message) =>
              message.isFromSupport && message.timestamp.isAfter(lastReadAt),
        )
        .length;
  }

  bool get hasUnreadMessage {
    return unreadMessageCount > 0;
  }

  bool isUserMessageSeen(ChatSupportStoredMessage message) {
    if (message.isFromSupport ||
        message.isDeleted ||
        message.isPinProductIndicator) {
      return false;
    }

    final effectiveSupportReadAt = supportReadAt;
    if (effectiveSupportReadAt == null) {
      return false;
    }

    return !message.timestamp.isAfter(effectiveSupportReadAt);
  }

  ChatSupportThreadData copyWith({
    String? threadId,
    String? adminId,
    String? customerId,
    String? customerLabel,
    String? productId,
    String? productName,
    String? productCategory,
    String? productDescription,
    String? productImageUrl,
    double? productOriginalPrice,
    double? productSalesPrice,
    int? productStock,
    int? productSold,
    double? productRating,
    bool? productShowsTopBrand,
    String? companyName,
    String? companyPictureUrl,
    double? employeeRating,
    String? employeeRatingComment,
    DateTime? employeeRatingUpdatedAt,
    DateTime? updatedAt,
    DateTime? lastReadAt,
    DateTime? supportReadAt,
    List<ChatSupportStoredMessage>? messages,
    Object? userTyping = _chatTypingEntryNoChange,
    Object? employeeTyping = _chatTypingEntryNoChange,
  }) {
    return ChatSupportThreadData(
      threadId: threadId ?? this.threadId,
      adminId: adminId ?? this.adminId,
      customerId: customerId ?? this.customerId,
      customerLabel: customerLabel ?? this.customerLabel,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      productCategory: productCategory ?? this.productCategory,
      productDescription: productDescription ?? this.productDescription,
      productImageUrl: productImageUrl ?? this.productImageUrl,
      productOriginalPrice: productOriginalPrice ?? this.productOriginalPrice,
      productSalesPrice: productSalesPrice ?? this.productSalesPrice,
      productStock: productStock ?? this.productStock,
      productSold: productSold ?? this.productSold,
      productRating: productRating ?? this.productRating,
      productShowsTopBrand: productShowsTopBrand ?? this.productShowsTopBrand,
      companyName: companyName ?? this.companyName,
      companyPictureUrl: companyPictureUrl ?? this.companyPictureUrl,
      employeeRating: employeeRating ?? this.employeeRating,
      employeeRatingComment:
          employeeRatingComment ?? this.employeeRatingComment,
      employeeRatingUpdatedAt:
          employeeRatingUpdatedAt ?? this.employeeRatingUpdatedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastReadAt: lastReadAt ?? this.lastReadAt,
      supportReadAt: supportReadAt ?? this.supportReadAt,
      messages: messages ?? this.messages,
      userTyping: identical(userTyping, _chatTypingEntryNoChange)
          ? this.userTyping
          : userTyping as ChatSupportTypingEntry?,
      employeeTyping: identical(employeeTyping, _chatTypingEntryNoChange)
          ? this.employeeTyping
          : employeeTyping as ChatSupportTypingEntry?,
    );
  }

  Product toProduct() {
    return Product(
      id: productId,
      adminId: adminId,
      companyName: companyName,
      companyPictureUrl: companyPictureUrl,
      name: productName,
      originalPrice: productOriginalPrice,
      category: productCategory,
      description: productDescription,
      imageUrl: productImageUrl,
      createdAt: updatedAt,
      salesPrice: productSalesPrice,
      stock: productStock,
      sold: productSold,
      rating: productRating,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'threadId': threadId,
      'adminId': adminId,
      'sellerId': adminId,
      'shopId': adminId,
      'customerId': customerId,
      'userId': customerId,
      'user_id': customerId,
      'customerLabel': customerLabel,
      'productId': productId,
      'productName': productName,
      'productCategory': productCategory,
      'productDescription': productDescription,
      'productImageUrl': productImageUrl,
      'productOriginalPrice': productOriginalPrice,
      'productSalesPrice': productSalesPrice,
      'productStock': productStock,
      'productSold': productSold,
      'productRating': productRating,
      'productShowsTopBrand': productShowsTopBrand,
      'companyName': companyName,
      'companyPictureUrl': companyPictureUrl,
      'employeeRating': employeeRating,
      'employeeRatingComment': employeeRatingComment,
      'employeeRatingUpdatedAt': employeeRatingUpdatedAt?.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'lastReadAt': lastReadAt.toIso8601String(),
      'supportReadAt': supportReadAt?.toIso8601String(),
      'messages': [
        for (final message in messages) message.toJson(),
      ],
    };
  }

  factory ChatSupportThreadData.fromJson(Map<String, dynamic> json) {
    final productId = json['productId']?.toString() ?? '';
    final customerId =
        (json['customerId'] ?? json['userId'] ?? json['user_id'])
            ?.toString()
            .trim() ??
        'customer-local';
    final updatedAt = _parseChatDate(json['updatedAt']?.toString() ?? '');
    final rawMessages = (json['messages'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map(ChatSupportStoredMessage.fromJson)
        .toList(growable: false);
    final rawTyping = json['typing'] is Map ? json['typing'] as Map : const {};
    final typingMap = rawTyping.cast<Object?, Object?>();

    final extractedAdminId = (json['adminId'] ??
              json['tenantId'] ??
              json['ownerAdminId'] ??
              json['workspaceId'] ??
              json['storeAdminId'] ??
              json['sellerId'] ??
              json['seller_id'] ??
              json['shopId'] ??
              json['shop_id'])
          ?.toString()
          .trim() ?? '';
    final normalizedThreadId = _buildChatThreadId(
      customerId,
      productId,
      adminId: extractedAdminId,
    );

    return ChatSupportThreadData(
      threadId: normalizedThreadId,
      adminId: extractedAdminId,
      customerId: customerId.isEmpty ? 'customer-local' : customerId,
      customerLabel: json['customerLabel']?.toString().trim().isNotEmpty == true
          ? json['customerLabel']!.toString().trim()
          : _defaultChatCustomerLabel(customerId),
      productId: productId,
      productName: json['productName']?.toString() ?? 'Unnamed Product',
      productCategory: json['productCategory']?.toString() ?? '',
      productDescription: json['productDescription']?.toString() ?? '',
      productImageUrl: json['productImageUrl']?.toString() ?? '',
      productOriginalPrice:
          (json['productOriginalPrice'] as num?)?.toDouble() ?? 0,
      productSalesPrice: (json['productSalesPrice'] as num?)?.toDouble(),
      productStock: (json['productStock'] as num?)?.toInt() ?? 0,
      productSold: (json['productSold'] as num?)?.toInt() ?? 0,
      productRating: (json['productRating'] as num?)?.toDouble() ?? 0,
      productShowsTopBrand: json['productShowsTopBrand'] == true,
      companyName: json['companyName']?.toString() ?? '',
      companyPictureUrl: json['companyPictureUrl']?.toString() ?? '',
      employeeRating: _normalizeChatRating(json['employeeRating']),
      employeeRatingComment: _normalizeEmployeeRatingComment(
        json['employeeRatingComment']?.toString(),
      ),
      employeeRatingUpdatedAt: _parseNullableChatDate(
        json['employeeRatingUpdatedAt']?.toString(),
      ),
      updatedAt: updatedAt,
      lastReadAt: _parseChatDate(
        json['lastReadAt']?.toString() ?? '',
        fallback: updatedAt,
      ),
      supportReadAt: _parseNullableChatDate(json['supportReadAt']?.toString()),
      messages: _mergeChatMessages(const <ChatSupportStoredMessage>[], rawMessages),
      userTyping: ChatSupportTypingEntry.tryParse(
        typingMap['user'],
        fallbackActor: 'user',
      ),
      employeeTyping: ChatSupportTypingEntry.tryParse(
        typingMap['employee'],
        fallbackActor: 'employee',
      ),
    );
  }
}

double _resolveMergedEmployeeRating({
  required ChatSupportThreadData localThread,
  required ChatSupportThreadData remoteThread,
}) {
  final localUpdatedAt = localThread.employeeRatingUpdatedAt;
  final remoteUpdatedAt = remoteThread.employeeRatingUpdatedAt;
  if (localUpdatedAt == null && remoteUpdatedAt == null) {
    return remoteThread.employeeRating > 0
        ? remoteThread.employeeRating
        : localThread.employeeRating;
  }
  if (localUpdatedAt == null) {
    return remoteThread.employeeRating;
  }
  if (remoteUpdatedAt == null) {
    return localThread.employeeRating;
  }

  return remoteUpdatedAt.isBefore(localUpdatedAt)
      ? localThread.employeeRating
      : remoteThread.employeeRating;
}

String _resolveMergedEmployeeRatingComment({
  required ChatSupportThreadData localThread,
  required ChatSupportThreadData remoteThread,
}) {
  final localUpdatedAt = localThread.employeeRatingUpdatedAt;
  final remoteUpdatedAt = remoteThread.employeeRatingUpdatedAt;
  final localComment =
      _normalizeEmployeeRatingComment(localThread.employeeRatingComment);
  final remoteComment =
      _normalizeEmployeeRatingComment(remoteThread.employeeRatingComment);
  if (localUpdatedAt == null && remoteUpdatedAt == null) {
    return remoteComment.isNotEmpty ? remoteComment : localComment;
  }
  if (localUpdatedAt == null) {
    return remoteComment;
  }
  if (remoteUpdatedAt == null) {
    return localComment;
  }

  return remoteUpdatedAt.isBefore(localUpdatedAt)
      ? localComment
      : remoteComment;
}

Future<List<ChatSupportThreadData>> _decodeStoredChatThreadsInBackground(
  String rawData,
) {
  return compute(_decodeStoredChatThreads, rawData);
}

List<ChatSupportThreadData> _decodeStoredChatThreads(String rawData) {
  final decoded = jsonDecode(rawData) as List<dynamic>;

  return decoded
      .whereType<Map>()
      .map(
        (entry) => ChatSupportThreadData.fromJson(
          Map<String, dynamic>.from(entry),
        ),
      )
      .where((thread) => thread.productId.trim().isNotEmpty)
      .toList(growable: false);
}

class ChatSupportStore {
  ChatSupportStore._();

  static const String _profileFirstNameStorageKey = 'profile_first_name';
  static const String _profileLastNameStorageKey = 'profile_last_name';
  static const String _storageVersionKey = 'chat_support_storage_version';
  /// Bump this when the thread storage format changes to force a clean reload.
  static const int _currentStorageVersion = 2;
  static final ChatSupportStore instance = ChatSupportStore._();

  final ValueNotifier<int> incomingSupportEventNotifier = ValueNotifier<int>(0);
  final ValueNotifier<List<ChatSupportThreadData>> threadListNotifier =
      ValueNotifier<List<ChatSupportThreadData>>(const <ChatSupportThreadData>[]);

  bool _hasLoaded = false;
  bool _hasCompletedFirstServerRefresh = false;
  String? _customerId;
  String? _lastAccountId;
  Future<void>? _ongoingRefreshRequest;
  String? _ongoingRefreshAccountId;

  String _normalizeAccountId(String? accountId) {
    return accountId?.trim() ?? '';
  }

  void _resetInMemoryForAccount(String? accountId) {
    _hasLoaded = false;
    _hasCompletedFirstServerRefresh = false;
    _customerId = null;
    _lastAccountId = _normalizeAccountId(accountId);
    threadListNotifier.value = const <ChatSupportThreadData>[];
  }

  Future<void> reloadForCurrentAccount() async {
    final currentAccountId = await AuthSession.getAccountId();
    _resetInMemoryForAccount(currentAccountId);
    await ensureLoaded();
  }

  Future<void> clearForLogout() async {
    _ongoingRefreshAccountId = null;
    _ongoingRefreshRequest = null;
    _resetInMemoryForAccount(null);

    final preferences = await SharedPreferences.getInstance();
    final keys = preferences.getKeys().toList(growable: false);
    for (final key in keys) {
      final shouldRemove = key == 'chat_support_threads' ||
          key == 'chat_support_customer_id' ||
          key == _storageVersionKey ||
          key.startsWith('chat_support_threads_') ||
          key.startsWith('chat_support_customer_id_') ||
          key.startsWith('chat_support_storage_version_');
      if (shouldRemove) {
        await preferences.remove(key);
      }
    }
  }

  Future<String> _resolveStorageKey() async {
    final accountId = await AuthSession.getAccountId();
    if (accountId != null && accountId.isNotEmpty) {
      return 'chat_support_threads_$accountId';
    }
    return 'chat_support_threads';
  }

  Future<String> _resolveCustomerIdKey() async {
    final accountId = await AuthSession.getAccountId();
    if (accountId != null && accountId.isNotEmpty) {
      return 'chat_support_customer_id_$accountId';
    }
    return 'chat_support_customer_id';
  }

  String get customerId {
    final trimmedCustomerId = _customerId?.trim() ?? '';
    return trimmedCustomerId.isEmpty ? 'customer-local' : trimmedCustomerId;
  }

  bool _isThreadForCurrentCustomer(ChatSupportThreadData thread) {
    return thread.customerId.trim().toLowerCase() ==
        customerId.trim().toLowerCase();
  }

  String _resolvePreferredCustomerLabel(
    SharedPreferences preferences, {
    required String threadCustomerId,
    String? existingLabel,
  }) {
    final storedFirstName =
        preferences.getString(_profileFirstNameStorageKey)?.trim() ?? '';
    final storedLastName =
        preferences.getString(_profileLastNameStorageKey)?.trim() ?? '';
    final storedProfileName = [storedFirstName, storedLastName]
        .where((n) => n.isNotEmpty)
        .join(' ');
    if (storedProfileName.isNotEmpty &&
        threadCustomerId.trim().toLowerCase() == customerId.trim().toLowerCase()) {
      return storedProfileName;
    }

    final normalizedExistingLabel = existingLabel?.trim() ?? '';
    if (normalizedExistingLabel.isNotEmpty) {
      return normalizedExistingLabel;
    }

    return _defaultChatCustomerLabel(threadCustomerId);
  }

  List<ChatSupportThreadData> _applyPreferredCustomerLabels(
    List<ChatSupportThreadData> threads,
    SharedPreferences preferences,
  ) {
    return threads
        .map(
          (thread) => thread.copyWith(
            customerLabel: _resolvePreferredCustomerLabel(
              preferences,
              threadCustomerId: thread.customerId,
              existingLabel: thread.customerLabel,
            ),
          ),
        )
        .toList(growable: false);
  }

  List<ChatSupportThreadData> _collapseThreadsByCustomer(
    List<ChatSupportThreadData> threads,
  ) {
    final orderedThreads = List<ChatSupportThreadData>.from(threads)
      ..sort((first, second) => first.updatedAt.compareTo(second.updatedAt));
    final threadsByConversation = <String, ChatSupportThreadData>{};

    for (final thread in orderedThreads) {
      final customerKey = thread.customerId.trim().toLowerCase().isEmpty
          ? customerId.trim().toLowerCase()
          : thread.customerId.trim().toLowerCase();
      final adminKey = thread.adminId.trim().toLowerCase();
      final productKey = thread.productId.trim().toLowerCase();
      final conversationKey = '$customerKey::$adminKey::$productKey';
      if (customerKey.isEmpty) {
        continue;
      }

      final normalizedThread = thread.copyWith(
        customerId: thread.customerId.trim().isEmpty ? customerId : thread.customerId,
        threadId: _buildChatThreadId(
          thread.customerId.trim().isEmpty ? customerId : thread.customerId,
          thread.productId,
          adminId: thread.adminId,
        ),
      );
      final existingThread = threadsByConversation[conversationKey];
      threadsByConversation[conversationKey] = existingThread == null
          ? normalizedThread
          : _mergeThreadData(existingThread, normalizedThread).copyWith(
              threadId: _buildChatThreadId(
                normalizedThread.customerId,
                normalizedThread.productId,
                adminId: normalizedThread.adminId,
              ),
            );
    }

    return threadsByConversation.values.toList(growable: false)
      ..sort((first, second) => second.updatedAt.compareTo(first.updatedAt));
  }

  List<String> get _knownCustomerIdsForSync {
    final normalizedCustomerId = customerId.trim();
    if (normalizedCustomerId.isEmpty) {
      return const <String>[];
    }
    return <String>[normalizedCustomerId];
  }

  List<String> get _knownAdminIdsForSync {
    final normalizedAdminIds = <String>{};
    for (final thread in threadListNotifier.value) {
      final normalizedAdminId = thread.adminId.trim();
      if (normalizedAdminId.isNotEmpty) {
        normalizedAdminIds.add(normalizedAdminId);
      }
    }
    return normalizedAdminIds.toList(growable: false);
  }

  Future<void> ensureLoaded() async {
    final currentAccountId = await AuthSession.getAccountId();
    final normalizedCurrentAccountId = _normalizeAccountId(currentAccountId);
    if (_hasLoaded && _lastAccountId == normalizedCurrentAccountId) {
      return;
    }
    if (_lastAccountId != normalizedCurrentAccountId) {
      _resetInMemoryForAccount(currentAccountId);
    }

    final preferences = await SharedPreferences.getInstance();
    final storageKey = await _resolveStorageKey();
    final customerIdKey = await _resolveCustomerIdKey();
    final storedVersion = preferences.getInt(_storageVersionKey) ?? 0;
    final storedCustomerId =
        preferences.getString(customerIdKey)?.trim() ?? '';
    if (storedCustomerId.isNotEmpty) {
      _customerId = storedCustomerId;
    } else {
      // Use account ID as customer ID when logged in, otherwise generate
      if (currentAccountId != null && currentAccountId.isNotEmpty) {
        _customerId = currentAccountId;
      } else {
        _customerId = _generateChatCustomerId();
      }
      await preferences.setString(customerIdKey, _customerId!);
    }

    // Migrate: if the stored data is from an older format (v1), discard it
    // so threads from different companies don't stay merged.
    final rawData = storedVersion >= _currentStorageVersion
        ? preferences.getString(storageKey)
        : null;

    if (rawData == null || rawData.trim().isEmpty) {
      threadListNotifier.value = const <ChatSupportThreadData>[];
      _hasLoaded = true;
    } else {
      try {
        final threads = await _decodeStoredChatThreadsInBackground(rawData);
        final resolvedThreads = _collapseThreadsByCustomer(
          _applyPreferredCustomerLabels(
            threads.where(_isThreadForCurrentCustomer).toList(growable: false),
            preferences,
          ),
        );
        threadListNotifier.value =
            List<ChatSupportThreadData>.unmodifiable(resolvedThreads);
      } catch (_) {
        threadListNotifier.value = const <ChatSupportThreadData>[];
      }

      _hasLoaded = true;
    }

    await refreshThreadsFromServer();
  }

  ChatSupportThreadData? threadForProduct(String productId, {String adminId = ''}) {
    final normalizedId = productId.trim().toLowerCase();
    final normalizedCustomerId = customerId.trim().toLowerCase();
    final normalizedAdminId = adminId.trim().toLowerCase();

    // First, try to find a thread that matches both product and admin (most specific)
    if (normalizedId.isNotEmpty && normalizedAdminId.isNotEmpty) {
      for (final thread in threadListNotifier.value) {
        if (thread.productId.trim().toLowerCase() == normalizedId &&
            thread.adminId.trim().toLowerCase() == normalizedAdminId) {
          return thread;
        }
      }
    }

    // Fall back to finding by productId + customerId (product-level, no admin)
    if (normalizedId.isNotEmpty) {
      for (final thread in threadListNotifier.value) {
        if (thread.productId.trim().toLowerCase() == normalizedId &&
            thread.customerId.trim().toLowerCase() == normalizedCustomerId) {
          return thread;
        }
      }
    }

    // No match — do NOT fall back to customerId-only (would return wrong company's thread)
    return null;
  }

  ChatSupportThreadData? _threadForId(String threadId) {
    final normalizedThreadId = threadId.trim().toLowerCase();
    if (normalizedThreadId.isEmpty) {
      return null;
    }

    for (final thread in threadListNotifier.value) {
      if (thread.threadId.trim().toLowerCase() == normalizedThreadId) {
        return thread;
      }
    }

    return null;
  }

  int _indexOfThread(
    List<ChatSupportThreadData> threads,
    ChatSupportThreadData targetThread,
  ) {
    final normalizedThreadId = targetThread.threadId.trim().toLowerCase();
    if (normalizedThreadId.isNotEmpty) {
      final threadIndex = threads.indexWhere(
        (thread) => thread.threadId.trim().toLowerCase() == normalizedThreadId,
      );
      if (threadIndex >= 0) {
        return threadIndex;
      }
    }

    final normalizedCustomerId = targetThread.customerId.trim().toLowerCase();
    final normalizedProductId = targetThread.productId.trim().toLowerCase();
    final normalizedAdminId = targetThread.adminId.trim().toLowerCase();

    // First try by productId + adminId + customerId (most specific)
    if (normalizedProductId.isNotEmpty && normalizedAdminId.isNotEmpty) {
      final productAdminThreadIndex = threads.indexWhere(
        (thread) =>
            thread.productId.trim().toLowerCase() == normalizedProductId &&
            thread.adminId.trim().toLowerCase() == normalizedAdminId &&
            thread.customerId.trim().toLowerCase() == normalizedCustomerId,
      );
      if (productAdminThreadIndex >= 0) {
        return productAdminThreadIndex;
      }
    }

    // Then try by productId + customerId (product-level match, no admin)
    if (normalizedProductId.isNotEmpty) {
      final productThreadIndex = threads.indexWhere(
        (thread) =>
            thread.productId.trim().toLowerCase() == normalizedProductId &&
            thread.customerId.trim().toLowerCase() == normalizedCustomerId,
      );
      if (productThreadIndex >= 0) {
        return productThreadIndex;
      }
    }

    // No match found — do NOT fall back to customerId-only (would merge different companies)
    return -1;
  }

  int _countNewSupportMessagesFromRemote({
    required ChatSupportThreadData? localThread,
    required ChatSupportThreadData remoteThread,
  }) {
    final existingSupportMessageIds = <String>{
      for (final message in localThread?.messages ?? const <ChatSupportStoredMessage>[])
        if (message.isFromSupport && message.text.trim().isNotEmpty) message.id.trim(),
    };

    return remoteThread.messages.where((message) {
      final normalizedMessageId = message.id.trim();
      return message.isFromSupport &&
          message.text.trim().isNotEmpty &&
          normalizedMessageId.isNotEmpty &&
          !existingSupportMessageIds.contains(normalizedMessageId);
    }).length;
  }

  ChatSupportThreadData _mergeThreadData(
    ChatSupportThreadData localThread,
    ChatSupportThreadData remoteThread,
  ) {
    final mergedMessages = _mergeChatMessages(
      localThread.messages,
      remoteThread.messages,
      authoritativeSecondary: true,
    );
    final mergedUpdatedAt = mergedMessages.isNotEmpty
        ? mergedMessages.last.timestamp
        : _laterChatDate(localThread.updatedAt, remoteThread.updatedAt);
    final mergedEmployeeRatingUpdatedAt = _laterNullableChatDate(
      localThread.employeeRatingUpdatedAt,
      remoteThread.employeeRatingUpdatedAt,
    );

    return remoteThread.copyWith(
      threadId: remoteThread.threadId.trim().isEmpty
          ? localThread.threadId
          : remoteThread.threadId,
      adminId: remoteThread.adminId.trim().isEmpty
          ? localThread.adminId
          : remoteThread.adminId,
      customerId: remoteThread.customerId.trim().isEmpty
          ? localThread.customerId
          : remoteThread.customerId,
      customerLabel: remoteThread.customerLabel.trim().isEmpty
          ? localThread.customerLabel
          : remoteThread.customerLabel,
      productName: remoteThread.productName.trim().isEmpty
          ? localThread.productName
          : remoteThread.productName,
      productCategory: remoteThread.productCategory.trim().isEmpty
          ? localThread.productCategory
          : remoteThread.productCategory,
      productDescription: remoteThread.productDescription.trim().isEmpty
          ? localThread.productDescription
          : remoteThread.productDescription,
      productImageUrl: remoteThread.productImageUrl.trim().isEmpty
          ? localThread.productImageUrl
          : remoteThread.productImageUrl,
      productOriginalPrice: remoteThread.productOriginalPrice <= 0
          ? localThread.productOriginalPrice
          : remoteThread.productOriginalPrice,
      productSalesPrice:
          remoteThread.productSalesPrice ?? localThread.productSalesPrice,
      productStock: remoteThread.productStock == 0
          ? localThread.productStock
          : remoteThread.productStock,
      productSold: remoteThread.productSold == 0
          ? localThread.productSold
          : remoteThread.productSold,
      productRating: remoteThread.productRating <= 0
          ? localThread.productRating
          : remoteThread.productRating,
      productShowsTopBrand:
          remoteThread.productShowsTopBrand || localThread.productShowsTopBrand,
      companyName: remoteThread.companyName.trim().isEmpty
          ? localThread.companyName
          : remoteThread.companyName,
      companyPictureUrl: remoteThread.companyPictureUrl.trim().isEmpty
          ? localThread.companyPictureUrl
          : remoteThread.companyPictureUrl,
      employeeRating: _resolveMergedEmployeeRating(
        localThread: localThread,
        remoteThread: remoteThread,
      ),
      employeeRatingComment: _resolveMergedEmployeeRatingComment(
        localThread: localThread,
        remoteThread: remoteThread,
      ),
      employeeRatingUpdatedAt: mergedEmployeeRatingUpdatedAt,
      updatedAt: mergedUpdatedAt,
      lastReadAt: _laterChatDate(localThread.lastReadAt, remoteThread.lastReadAt),
      supportReadAt: _laterNullableChatDate(
        localThread.supportReadAt,
        remoteThread.supportReadAt,
      ),
      messages: mergedMessages,
      userTyping: remoteThread.userTyping,
      employeeTyping: remoteThread.employeeTyping,
    );
  }

  Future<void> refreshThreadsFromServer() async {
    if (!_hasLoaded) {
      await ensureLoaded();
      return;
    }

    final refreshAccountId =
        _normalizeAccountId(await AuthSession.getAccountId());
    if (_lastAccountId != refreshAccountId) {
      await ensureLoaded();
      return;
    }

    final ongoingRefreshRequest = _ongoingRefreshRequest;
    if (ongoingRefreshRequest != null &&
        _ongoingRefreshAccountId == refreshAccountId) {
      await ongoingRefreshRequest;
      return;
    }

    final request = () async {
      try {
        final refreshCustomerId = customerId.trim().toLowerCase();
        if (refreshCustomerId.isEmpty) {
          return;
        }

        final remoteThreadMaps = <Map<String, dynamic>>[];
        final seenThreadIds = <String>{};

        for (final customerIdForSync in _knownCustomerIdsForSync) {
          final adminIdsForSync = <String>[
            '',
            ..._knownAdminIdsForSync,
          ];

          for (final adminIdForSync in adminIdsForSync) {
            final fetchedThreads = await _chatSupportSyncService.fetchThreads(
              customerId: customerIdForSync,
              adminId: adminIdForSync,
            );

            for (final fetchedThread in fetchedThreads) {
              final normalizedThreadId =
                  fetchedThread['threadId']?.toString().trim().toLowerCase() ?? '';
              if (normalizedThreadId.isEmpty || seenThreadIds.contains(normalizedThreadId)) {
                continue;
              }

              seenThreadIds.add(normalizedThreadId);
              remoteThreadMaps.add(fetchedThread);
            }
          }
        }

        final shouldEmitIncomingSupportEvent = _hasCompletedFirstServerRefresh;

        if (remoteThreadMaps.isEmpty) {
          _hasCompletedFirstServerRefresh = true;
          return;
        }

        final parsedRemoteThreads = remoteThreadMaps
            .map(ChatSupportThreadData.fromJson)
            .where(
              (thread) =>
                  thread.productId.trim().isNotEmpty &&
                  thread.customerId.trim().toLowerCase() == refreshCustomerId,
            )
            .toList(growable: false);

        if (parsedRemoteThreads.isEmpty) {
          _hasCompletedFirstServerRefresh = true;
          return;
        }

        final latestAccountId =
            _normalizeAccountId(await AuthSession.getAccountId());
        if (_lastAccountId != refreshAccountId ||
            latestAccountId != refreshAccountId) {
          return;
        }

        final nextThreads = List<ChatSupportThreadData>.from(
          threadListNotifier.value.where(_isThreadForCurrentCustomer),
        );
        var newSupportMessageCount = 0;

        for (final remoteThread in parsedRemoteThreads) {
          final existingIndex = _indexOfThread(nextThreads, remoteThread);
          final existingThread = existingIndex >= 0 ? nextThreads[existingIndex] : null;

          if (shouldEmitIncomingSupportEvent) {
            newSupportMessageCount += _countNewSupportMessagesFromRemote(
              localThread: existingThread,
              remoteThread: remoteThread,
            );
          }

          if (existingIndex >= 0) {
            nextThreads[existingIndex] = _mergeThreadData(
              nextThreads[existingIndex],
              remoteThread,
            );
          } else {
            nextThreads.add(remoteThread);
          }
        }

        final preferences = await SharedPreferences.getInstance();
        final resolvedThreads = _collapseThreadsByCustomer(
          _applyPreferredCustomerLabels(
            nextThreads,
            preferences,
          ),
        );
        await _persist(resolvedThreads);
        _hasCompletedFirstServerRefresh = true;

        if (shouldEmitIncomingSupportEvent && newSupportMessageCount > 0) {
          incomingSupportEventNotifier.value =
              incomingSupportEventNotifier.value + newSupportMessageCount;
        }
      } catch (_) {}
    }();

    _ongoingRefreshRequest = request;
    _ongoingRefreshAccountId = refreshAccountId;
    try {
      await request;
    } finally {
      if (identical(_ongoingRefreshRequest, request)) {
        _ongoingRefreshRequest = null;
        _ongoingRefreshAccountId = null;
      }
    }
  }

  Future<void> saveThread({
    required Product product,
    required List<ChatSupportStoredMessage> messages,
    bool showsTopBrand = false,
    double? employeeRating,
    String? employeeRatingComment,
    DateTime? employeeRatingUpdatedAt,
  }) async {
    await ensureLoaded();
    final preferences = await SharedPreferences.getInstance();

    final normalizedMessages = _mergeChatMessages(
      const <ChatSupportStoredMessage>[],
      messages
          .where(
            (message) =>
                message.text.trim().isNotEmpty ||
                message.hasMedia ||
                message.isDeleted,
          )
          .toList(growable: false),
    );
    final existingThread = threadForProduct(product.id, adminId: product.adminId);
    final resolvedCustomerId = customerId;
    final normalizedProductId = product.id.trim();
    final normalizedProductName =
        product.name.trim().isEmpty ? 'Unnamed Product' : product.name;
    final hasEmployeeRatingCommentOverride = employeeRatingComment != null;
    final hasEmployeeRatingOverride =
        employeeRating != null ||
        employeeRatingUpdatedAt != null ||
        hasEmployeeRatingCommentOverride;
    final productChanged = existingThread == null ||
        existingThread.adminId.trim() != product.adminId.trim() ||
        existingThread.productId.trim() != normalizedProductId ||
        existingThread.productName.trim() != normalizedProductName.trim() ||
        existingThread.productCategory.trim() != product.category.trim() ||
        existingThread.productDescription.trim() != product.description.trim() ||
        existingThread.productImageUrl.trim() != product.imageUrl.trim() ||
        existingThread.productOriginalPrice != product.originalPrice ||
        existingThread.productSalesPrice != product.salesPrice ||
        existingThread.productStock != product.stock ||
        existingThread.productSold != product.sold ||
        existingThread.productRating != product.rating;
    final now = DateTime.now();
    final updatedAt = productChanged || hasEmployeeRatingOverride
        ? now
        : (normalizedMessages.isNotEmpty ? normalizedMessages.last.timestamp : now);
    final nextThread = ChatSupportThreadData(
      threadId: existingThread?.threadId ??
          _buildChatThreadId(resolvedCustomerId, normalizedProductId, adminId: product.adminId),
      adminId: product.adminId,
      customerId: resolvedCustomerId,
      customerLabel:
          _resolvePreferredCustomerLabel(
            preferences,
            threadCustomerId: resolvedCustomerId,
            existingLabel: existingThread?.customerLabel,
          ),
      productId: normalizedProductId,
      productName: normalizedProductName,
      productCategory: product.category,
      productDescription: product.description,
      productImageUrl: product.imageUrl,
      productOriginalPrice: product.originalPrice,
      productSalesPrice: product.salesPrice,
      productStock: product.stock,
      productSold: product.sold,
      productRating: product.rating,
      productShowsTopBrand:
          showsTopBrand || (existingThread?.productShowsTopBrand ?? false),
      companyName: product.companyName,
      companyPictureUrl: product.companyPictureUrl,
      employeeRating: hasEmployeeRatingOverride
          ? _normalizeChatRating(employeeRating)
          : (existingThread?.employeeRating ?? 0),
      employeeRatingComment: hasEmployeeRatingOverride
          ? (hasEmployeeRatingCommentOverride
              ? _normalizeEmployeeRatingComment(employeeRatingComment)
              : (existingThread?.employeeRatingComment ?? ''))
          : (existingThread?.employeeRatingComment ?? ''),
      employeeRatingUpdatedAt: hasEmployeeRatingOverride
          ? employeeRatingUpdatedAt?.toLocal()
          : existingThread?.employeeRatingUpdatedAt,
      updatedAt: updatedAt,
      lastReadAt: existingThread?.lastReadAt ?? updatedAt,
      supportReadAt: existingThread?.supportReadAt,
      messages: normalizedMessages,
      userTyping: null,
      employeeTyping: existingThread?.employeeTyping,
    );

    final nextThreads = List<ChatSupportThreadData>.from(threadListNotifier.value);
    final existingIndex = _indexOfThread(nextThreads, nextThread);

    if (existingIndex >= 0) {
      nextThreads[existingIndex] = nextThread;
    } else {
      nextThreads.add(nextThread);
    }

    final collapsedThreads = _collapseThreadsByCustomer(nextThreads);
    await _persist(collapsedThreads);
    await _syncThreadToServer(nextThread);
  }

  Map<String, dynamic> _buildThreadSyncPayload(
    ChatSupportThreadData thread, {
    bool includeAllMessages = true,
  }) {
    final payload = Map<String, dynamic>.from(thread.toJson());
    if (includeAllMessages) {
      return payload;
    }

    payload['messages'] = [
      for (final message in thread.messages)
        if (!message.isFromSupport && !message.isSentToServer) message.toJson(),
    ];
    return payload;
  }

  Future<void> _syncThreadToServer(ChatSupportThreadData thread) async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final resolvedThread = thread.copyWith(
        customerLabel: _resolvePreferredCustomerLabel(
          preferences,
          threadCustomerId: thread.customerId,
          existingLabel: thread.customerLabel,
        ),
      );
      Map<String, dynamic> syncedThreadMap;

      try {
        syncedThreadMap = await _chatSupportSyncService.syncThread(
          _buildThreadSyncPayload(resolvedThread),
          adminId: resolvedThread.adminId,
        );
      } catch (fullSyncError, fullSyncStackTrace) {
        debugPrint(
          'Chat support full thread sync failed for ${resolvedThread.threadId}. '
          'Retrying with pending user messages only. Error: $fullSyncError',
        );
        debugPrintStack(stackTrace: fullSyncStackTrace);

        syncedThreadMap = await _chatSupportSyncService.syncThread(
          _buildThreadSyncPayload(
            resolvedThread,
            includeAllMessages: false,
          ),
          adminId: resolvedThread.adminId,
        );
      }

      final syncedThread = ChatSupportThreadData.fromJson(syncedThreadMap);
      final nextThreads = List<ChatSupportThreadData>.from(threadListNotifier.value);
      final existingIndex = _indexOfThread(nextThreads, syncedThread);

      if (existingIndex >= 0) {
        nextThreads[existingIndex] = _mergeThreadData(
          nextThreads[existingIndex],
          syncedThread,
        );
      } else {
        nextThreads.add(syncedThread);
      }

      await _persist(_collapseThreadsByCustomer(nextThreads));
    } catch (error, stackTrace) {
      debugPrint('Chat support sync failed for ${thread.threadId}: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  Future<void> markThreadRead(
    String productId, {
    String adminId = '',
    DateTime? readAt,
    bool syncToServer = true,
  }) async {
    await ensureLoaded();

    final targetThread = threadForProduct(productId, adminId: adminId);
    if (targetThread == null) {
      return;
    }

    final nextThreads = List<ChatSupportThreadData>.from(threadListNotifier.value);
    final threadIndex = _indexOfThread(nextThreads, targetThread);

    if (threadIndex < 0) {
      return;
    }

    final thread = nextThreads[threadIndex];
    final latestSeenMessageTimestamp = thread.messages.isNotEmpty
        ? thread.messages.last.timestamp
        : thread.updatedAt;
    var effectiveReadAt = readAt ?? latestSeenMessageTimestamp;
    if (effectiveReadAt.isAfter(latestSeenMessageTimestamp)) {
      effectiveReadAt = latestSeenMessageTimestamp;
    }

    if (!effectiveReadAt.isAfter(thread.lastReadAt)) {
      return;
    }

    nextThreads[threadIndex] = thread.copyWith(lastReadAt: effectiveReadAt);
    await _persist(nextThreads);

    if (syncToServer) {
      await _syncThreadToServer(nextThreads[threadIndex]);
    }
  }

  Future<void> removeThread(String productId, {String adminId = ''}) async {
    await ensureLoaded();

    final thread = threadForProduct(productId, adminId: adminId);
    if (thread == null) {
      return;
    }

    final nextThreads = threadListNotifier.value
        .where((candidate) => candidate.threadId != thread.threadId)
        .toList(growable: false);
    await _persist(nextThreads);

    try {
      await _chatSupportSyncService.deleteThread(
        thread.threadId,
        adminId: thread.adminId,
      );
    } catch (_) {}
  }

  Future<void> _persist(List<ChatSupportThreadData> threads) async {
    final normalizedThreads = List<ChatSupportThreadData>.unmodifiable(
      threads
          .where(_isThreadForCurrentCustomer)
          .map(
            (thread) => thread.copyWith(
              threadId: _buildChatThreadId(
                thread.customerId,
                thread.productId,
                adminId: thread.adminId,
              ),
            ),
          )
          .toList(growable: false),
    );
    threadListNotifier.value = normalizedThreads;

    final preferences = await SharedPreferences.getInstance();
    final storageKey = await _resolveStorageKey();
    await preferences.setInt(_storageVersionKey, _currentStorageVersion);
    await preferences.setString(
      storageKey,
      jsonEncode([
        for (final thread in normalizedThreads) thread.toJson(),
      ]),
    );
  }
}

class ChatSupportPage extends StatefulWidget {
  const ChatSupportPage({
    super.key,
    required this.product,
    this.showsTopBrand = false,
    this.pinProductOnOpen = false,
    this.pinProductOnFirstUserChat = false,
  });

  final Product product;
  final bool showsTopBrand;
  final bool pinProductOnOpen;
  final bool pinProductOnFirstUserChat;

  @override
  State<ChatSupportPage> createState() => _ChatSupportPageState();
}

class _ChatSupportEmojiOption {
  const _ChatSupportEmojiOption({
    required this.emoji,
    required this.assetPath,
    this.previewProgress = 0,
  });

  final String emoji;
  final String assetPath;
  final double previewProgress;
}

String _normalizeEmojiText(String text) {
  return text.replaceAll('\uFE0F', '').replaceAll('\u200D', '').trim();
}

_ChatSupportEmojiOption? _findChatSupportEmojiOption(
  String text,
  List<_ChatSupportEmojiOption> options,
) {
  final normalizedText = _normalizeEmojiText(text);
  for (final option in options) {
    if (_normalizeEmojiText(option.emoji) == normalizedText) {
      return option;
    }
  }

  return null;
}

class _PendingChatReply {
  const _PendingChatReply({
    required this.reference,
    required this.displaySenderLabel,
  });

  final ChatSupportReplyReference reference;
  final String displaySenderLabel;
}

class _ChatSupportPageState extends State<ChatSupportPage>
    with WidgetsBindingObserver {
  static const List<String> _reactionEmojiOptions = <String>[
    '👍',
    '❤️',
    '😂',
    '😮',
    '😢',
  ];
  static const List<_ChatSupportEmojiOption> _reactionPickerOptions =
      <_ChatSupportEmojiOption>[
        _ChatSupportEmojiOption(
          emoji: '\u2764\uFE0F',
          assetPath: 'assets/animations/reaction_heart.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F602}',
          assetPath: 'assets/animations/reaction_laugh.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F62E}',
          assetPath: 'assets/animations/reaction_wow.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F622}',
          assetPath: 'assets/animations/reaction_cry.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F621}',
          assetPath: 'assets/animations/reaction_rage.json',
        ),
      ];
  static const List<String> _legacyEmojiOptions = <String>[
    '😀',
    '😁',
    '😂',
    '😊',
    '😍',
    '😘',
    '🤗',
    '🤔',
    '😎',
    '🥳',
    '🙏',
    '👍',
    '👏',
    '💯',
    '🔥',
    '✨',
    '❤️',
    '💙',
    '💚',
    '💛',
    '📦',
    '🚚',
    '💊',
    '🛒',
  ];
  static const List<_ChatSupportEmojiOption> _chooserEmojiOptions =
      <_ChatSupportEmojiOption>[
        _ChatSupportEmojiOption(
          emoji: '\u2764\uFE0F',
          assetPath: 'assets/animations/reaction_heart.json',
          previewProgress: 0.3,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F602}',
          assetPath: 'assets/animations/reaction_laugh.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F62E}',
          assetPath: 'assets/animations/reaction_wow.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F622}',
          assetPath: 'assets/animations/reaction_cry.json',
          previewProgress: 0.5,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F621}',
          assetPath: 'assets/animations/reaction_rage.json',
          previewProgress: 0.7,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F494}',
          assetPath: 'assets/animations/lottie_broken_heart.json',
          previewProgress: 0.2,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u2B50',
          assetPath: 'assets/animations/lottie_star.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F525}',
          assetPath: 'assets/animations/lottie_fire.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F4AF}',
          assetPath: 'assets/animations/lottie_100.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F44F}',
          assetPath: 'assets/animations/lottie_clap.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F91D}',
          assetPath: 'assets/animations/lottie_shakehands.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F64F}',
          assetPath: 'assets/animations/lottie_folded-hands.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F631}',
          assetPath: 'assets/animations/lottie_screaming.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F60E}',
          assetPath: 'assets/animations/lottie_sunglasses_face.json',

        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F607}',
          assetPath: 'assets/animations/lottie_halo.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F620}',
          assetPath: 'assets/animations/lottie_angry.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F92D}',
          assetPath: 'assets/animations/lottie_smiling_with_hand.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F97A}',
          assetPath: 'assets/animations/lottie_pleading.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F60F}',
          assetPath: 'assets/animations/lottie_smirk.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F929}',
          assetPath: 'assets/animations/lottie_star_struck.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u263A\uFE0F',
          assetPath: 'assets/animations/lottie_warm_smile.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F60A}',
          assetPath: 'assets/animations/lottie_blush.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F979}',
          assetPath: 'assets/animations/lottie_holding_back_tears.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F60D}',
          assetPath: 'assets/animations/lottie_heart_eye.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F970}',
          assetPath: 'assets/animations/lottie_heart_face.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F609}',
          assetPath: 'assets/animations/lottie_wink.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F62D}',
          assetPath: 'assets/animations/lottie_crying.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F605}',
          assetPath: 'assets/animations/lottie_grin_sweat.json',
          previewProgress: 0.4,
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F606}',
          assetPath: 'assets/animations/lottie_laughing.json',
        ),
        _ChatSupportEmojiOption(
          emoji: '\u{1F642}',
          assetPath: 'assets/animations/lottie_smile.json',
          previewProgress: 0.4,
        ),
      ];
  static const Duration _conversationRefreshInterval = Duration(
    milliseconds: 150,
  );
  static const Duration _typingRefreshInterval = Duration(milliseconds: 1200);
  static const Duration _typingIdleDelay = Duration(milliseconds: 2500);
  static const Duration _presenceHeartbeatInterval = Duration(seconds: 20);
  static const int _initialVisibleMessageBatch = 24;
  static const int _visibleMessageBatchIncrement = 20;
  static const double _loadOlderMessagesTriggerDistance = 240;
  static const double _scrollToLatestButtonShowDistance = 72;
  static const double _scrollToLatestButtonHideDistance = 28;
  static const double _scrollToLatestButtonDirectionEpsilon = 2;

  late final TextEditingController _messageController;
  late final FocusNode _messageFocusNode;
  late final ScrollController _scrollController;
  late final ImagePicker _imagePicker;
  late final ProductRepository _productRepository;
  late Product _pinnedProduct;
  late List<ChatSupportStoredMessage> _messages;
  int _visibleMessageCount = _initialVisibleMessageBatch;
  double _employeeRating = 0;
  String _employeeRatingComment = '';
  DateTime? _employeeRatingUpdatedAt;
  DateTime? _supportReadAt;
  ChatSupportTypingEntry? _employeeTyping;
  String? _revealedMessageId;
  String? _replyJumpTargetMessageId;
  _PendingChatReply? _pendingReply;
  ChatSupportStoredMessage? _editingMessage;
  Timer? _refreshTimer;
  Timer? _typingIdleTimer;
  Timer? _presenceHeartbeatTimer;
  Timer? _replyJumpHighlightTimer;
  DateTime? _lastUserTypingSentAt;
  String _lastUserTypingThreadId = '';
  bool _isChatPresenceOnline = false;
  bool _isUserTypingSent = false;
  bool _isRefreshingFromServer = false;
  bool _isConversationViewportReady = false;
  bool _isUploadingPhoto = false;
  bool _isLoadingOlderMessages = false;
  bool _showScrollToLatestButton = false;
  bool _hasLocalPinnedProductOverride = false;
  bool _isPinnedProductCardVisible = false;
  bool _hasPinnedProductInCurrentSession = false;
  bool _wasKeyboardVisible = false;
  double _lastConversationScrollOffset = 0;
  OverlayEntry? _reactionPickerEntry;
  final Map<String, GlobalKey> _messageKeys = <String, GlobalKey>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _messageController = TextEditingController();
    _messageFocusNode = FocusNode();
    _scrollController = ScrollController();
    _scrollController.addListener(_handleConversationScroll);
    _imagePicker = ImagePicker();
    _productRepository = createProductRepository();
    final existingThread =
        ChatSupportStore.instance.threadForProduct(widget.product.id, adminId: widget.product.adminId);
    final shouldUseIncomingProduct =
        widget.pinProductOnOpen || widget.pinProductOnFirstUserChat;
    _hasLocalPinnedProductOverride = widget.pinProductOnOpen;
    _isPinnedProductCardVisible = widget.pinProductOnOpen;
    _pinnedProduct = shouldUseIncomingProduct
        ? widget.product
        : (_productFromThread(existingThread) ?? widget.product);
    _hasPinnedProductInCurrentSession = widget.pinProductOnOpen;
    if (existingThread != null) {
      _employeeRating = existingThread.employeeRating;
      _employeeRatingComment = existingThread.employeeRatingComment;
      _employeeRatingUpdatedAt = existingThread.employeeRatingUpdatedAt;
    }
    if (existingThread != null && existingThread.messages.isNotEmpty) {
      _messages = List<ChatSupportStoredMessage>.from(existingThread.messages);
      _supportReadAt = existingThread.supportReadAt;
      _employeeTyping = existingThread.employeeTyping;
    } else {
      _messages = _buildSeedConversation();
    }
    if (widget.pinProductOnOpen && !_hasPinnedProductIndicatorFor(widget.product)) {
      _appendPinnedProductIndicatorMessage(widget.product);
    }
    unawaited(_loadSavedConversation());
    if (widget.pinProductOnOpen) {
      unawaited(_persistConversation());
    }
    _refreshTimer = Timer.periodic(_conversationRefreshInterval, (_) {
      unawaited(_refreshConversationFromServer());
    });
    _markChatPresenceOnline();
    _prepareInitialConversationViewport();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _markChatPresenceOffline();
    WidgetsBinding.instance.removeObserver(this);
    _typingIdleTimer?.cancel();
    _replyJumpHighlightTimer?.cancel();
    _hideReactionPicker();
    _messageController.dispose();
    _messageFocusNode.dispose();
    _scrollController.removeListener(_handleConversationScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _markChatPresenceOnline();
    } else {
      _markChatPresenceOffline();
    }
  }

  String get _displayProductName {
    return _chatSupportProductDisplayName(_pinnedProduct);
  }

  String get _displayCompanyName {
    final productCompanyName = _pinnedProduct.companyName.trim();
    if (productCompanyName.isNotEmpty) {
      return productCompanyName;
    }

    final existingThread =
        ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);
    final threadCompanyName = existingThread?.companyName.trim() ?? '';
    if (threadCompanyName.isNotEmpty) {
      return threadCompanyName;
    }

    return _displayProductName;
  }

  String get _displayCompanyPictureUrl {
    final productCompanyPictureUrl = _pinnedProduct.companyPictureUrl.trim();
    if (productCompanyPictureUrl.isNotEmpty) {
      return productCompanyPictureUrl;
    }

    final existingThread =
        ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);
    return existingThread?.companyPictureUrl.trim() ?? '';
  }

  String get _pinnedProductId {
    final pinnedProductId = _pinnedProduct.id.trim();
    if (pinnedProductId.isNotEmpty) {
      return pinnedProductId;
    }
    final fallbackProductId = widget.product.id.trim();
    return fallbackProductId.isEmpty ? 'product' : fallbackProductId;
  }

  String get _activeChatAdminId {
    final widgetAdminId = widget.product.adminId.trim();
    if (widgetAdminId.isNotEmpty) {
      return widgetAdminId;
    }

    final pinnedProductAdminId = _pinnedProduct.adminId.trim();
    if (pinnedProductAdminId.isNotEmpty) {
      return pinnedProductAdminId;
    }

    final existingThread = ChatSupportStore.instance.threadForProduct(
      _pinnedProductId,
      adminId: _pinnedProduct.adminId,
    );
    return existingThread?.adminId.trim() ?? '';
  }

  bool _isProductFromActiveChatAdmin(Product product) {
    final normalizedActiveAdminId = _activeChatAdminId.trim().toLowerCase();
    if (normalizedActiveAdminId.isEmpty) {
      return true;
    }

    return product.adminId.trim().toLowerCase() == normalizedActiveAdminId;
  }

  bool get _pinnedProductShowsTopBrand {
    return widget.showsTopBrand &&
        _pinnedProductId.toLowerCase() ==
            widget.product.id.trim().toLowerCase();
  }

  Product? _productFromThread(ChatSupportThreadData? thread) {
    if (thread == null) {
      return null;
    }

    if (thread.productId.trim().isEmpty &&
        thread.productName.trim().isEmpty &&
        thread.productImageUrl.trim().isEmpty) {
      return null;
    }

    return thread.toProduct();
  }

  Product? _productFromThreadForCurrentView(ChatSupportThreadData? thread) {
    final product = _productFromThread(thread);
    if (product == null) {
      return null;
    }

    if (_isDeferringProductPinUntilCurrentUserChat) {
      return null;
    }

    if (!_hasLocalPinnedProductOverride) {
      return product;
    }

    final normalizedThreadProductId = product.id.trim().toLowerCase();
    final normalizedPinnedProductId = _pinnedProductId.trim().toLowerCase();
    if (normalizedThreadProductId == normalizedPinnedProductId) {
      return product;
    }

    return null;
  }

  bool _didPinnedProductChange(Product product) {
    return _pinnedProduct.id.trim() != product.id.trim() ||
        _pinnedProduct.name.trim() != product.name.trim() ||
        _pinnedProduct.category.trim() != product.category.trim() ||
        _pinnedProduct.imageUrl.trim() != product.imageUrl.trim() ||
        _pinnedProduct.originalPrice != product.originalPrice ||
        _pinnedProduct.salesPrice != product.salesPrice ||
        _pinnedProduct.stock != product.stock ||
        _pinnedProduct.sold != product.sold ||
        _pinnedProduct.rating != product.rating;
  }

  bool _hasPinnedProductIndicatorFor(Product product) {
    final normalizedProductName =
        _chatSupportProductDisplayName(product).trim().toLowerCase();
    for (final message in _messages) {
      if (message.isPinProductIndicator &&
          !message.isDeleted &&
          message.text.trim().toLowerCase() == normalizedProductName) {
        return true;
      }
    }

    return false;
  }

  bool get _isDeferringProductPinUntilCurrentUserChat {
    return widget.pinProductOnFirstUserChat &&
        !widget.pinProductOnOpen &&
        !_hasPinnedProductInCurrentSession;
  }

  bool get _shouldActivateProductPinOnFirstUserChat {
    return widget.pinProductOnFirstUserChat &&
        !_hasPinnedProductInCurrentSession &&
        _isChatSupportPinnableProduct(_pinnedProduct);
  }

  bool get _shouldAppendProductPinOnFirstUserChat {
    return _shouldActivateProductPinOnFirstUserChat &&
        !_hasPinnedProductIndicatorFor(_pinnedProduct);
  }

  ChatSupportStoredMessage _buildPinnedProductIndicatorMessage(
    Product product, {
    DateTime? timestamp,
  }) {
    final resolvedTimestamp = timestamp ?? DateTime.now();
    return ChatSupportStoredMessage(
      id:
          'pin-${resolvedTimestamp.microsecondsSinceEpoch}-${product.id.trim().hashCode}',
      text: _chatSupportProductDisplayName(product),
      isFromSupport: false,
      timestamp: resolvedTimestamp,
      isSentToServer: false,
      source: _chatSupportPinProductMessageSource,
    );
  }

  void _appendPinnedProductIndicatorMessage(
    Product product, {
    DateTime? timestamp,
  }) {
    _messages = List<ChatSupportStoredMessage>.from(_messages)
      ..add(
        _buildPinnedProductIndicatorMessage(
          product,
          timestamp: timestamp,
        ),
      );
    _revealedMessageId = null;
    _replyJumpTargetMessageId = null;
  }

  int get _effectiveVisibleMessageCount {
    final totalMessages = _messages.length;
    if (totalMessages <= 0) {
      return 0;
    }

    if (_visibleMessageCount <= 0) {
      return totalMessages < _initialVisibleMessageBatch
          ? totalMessages
          : _initialVisibleMessageBatch;
    }

    return _visibleMessageCount > totalMessages
        ? totalMessages
        : _visibleMessageCount;
  }

  bool get _hasHiddenOlderMessages =>
      _effectiveVisibleMessageCount < _messages.length;

  int get _oldestVisibleMessageIndex {
    final visibleCount = _effectiveVisibleMessageCount;
    if (visibleCount <= 0) {
      return 0;
    }

    return _messages.length - visibleCount;
  }

  Widget _buildHeaderCompanyAvatar(Color primaryColor) {
    return _ChatSupportCompanyAvatar(
      size: 42,
      primaryColor: primaryColor,
      imageUrl: _displayCompanyPictureUrl,
      label: _displayCompanyName,
    );
  }

  String get _activeThreadId {
    final existingThread =
        ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);
    final resolvedProductId = _pinnedProductId;
    return existingThread?.threadId ??
        _buildChatThreadId(ChatSupportStore.instance.customerId, resolvedProductId, adminId: _pinnedProduct.adminId);
  }

  String get _currentCustomerDisplayName {
    final existingThread =
        ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);
    final customerLabel = existingThread?.customerLabel.trim() ?? '';
    if (customerLabel.isNotEmpty) {
      return customerLabel;
    }

    return _defaultChatCustomerLabel(ChatSupportStore.instance.customerId);
  }

  bool get _showsEmployeeTypingIndicator => _employeeTyping != null;

  Map<String, dynamic> _buildTypingThreadContext() {
    final existingThread =
        ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);
    final now = DateTime.now();
    final updatedAt =
        existingThread?.updatedAt ??
        (_messages.isNotEmpty ? _messages.last.timestamp : now);
    final customerId = ChatSupportStore.instance.customerId;

    return <String, dynamic>{
      'threadId': _activeThreadId,
      'adminId': _pinnedProduct.adminId,
      'customerId': customerId,
      'customerLabel': _currentCustomerDisplayName,
      'productId': _pinnedProductId,
      'productName': _displayProductName,
      'productCategory': _pinnedProduct.category,
      'productDescription': _pinnedProduct.description,
      'productImageUrl': _pinnedProduct.imageUrl,
      'productOriginalPrice': _pinnedProduct.originalPrice,
      'productSalesPrice': _pinnedProduct.salesPrice,
      'productStock': _pinnedProduct.stock,
      'productSold': _pinnedProduct.sold,
      'productRating': _pinnedProduct.rating,
      'productShowsTopBrand':
          _pinnedProductShowsTopBrand ||
          (existingThread?.productShowsTopBrand ?? false),
      'companyName': _pinnedProduct.companyName,
      'companyPictureUrl': _pinnedProduct.companyPictureUrl,
      'employeeRating': existingThread?.employeeRating ?? _employeeRating,
      'employeeRatingComment':
          existingThread?.employeeRatingComment ?? _employeeRatingComment,
      'employeeRatingUpdatedAt':
          (existingThread?.employeeRatingUpdatedAt ?? _employeeRatingUpdatedAt)
              ?.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'lastReadAt': (existingThread?.lastReadAt ?? updatedAt).toIso8601String(),
      'supportReadAt':
          (existingThread?.supportReadAt ?? _supportReadAt)?.toIso8601String(),
      'messages': const <Map<String, dynamic>>[],
    };
  }

  void _startPresenceHeartbeat() {
    _presenceHeartbeatTimer?.cancel();
    _presenceHeartbeatTimer = Timer.periodic(_presenceHeartbeatInterval, (_) {
      unawaited(
        _sendUserTypingState(
          _isUserTypingSent,
          force: true,
          isOnlineOverride: true,
        ),
      );
    });
  }

  void _markChatPresenceOnline() {
    if (!_isChatPresenceOnline) {
      _isChatPresenceOnline = true;
      _startPresenceHeartbeat();
    }

    unawaited(
      _sendUserTypingState(
        _isUserTypingSent,
        force: true,
        isOnlineOverride: true,
      ),
    );
  }

  void _markChatPresenceOffline() {
    _isChatPresenceOnline = false;
    _isUserTypingSent = false;
    _presenceHeartbeatTimer?.cancel();
    _presenceHeartbeatTimer = null;
    _typingIdleTimer?.cancel();

    unawaited(
      _sendUserTypingState(
        false,
        force: true,
        isOnlineOverride: false,
      ),
    );
  }

  Future<void> _sendUserTypingState(
    bool isTyping, {
    bool force = false,
    bool? isOnlineOverride,
  }) async {
    final threadId = _activeThreadId.trim();
    if (threadId.isEmpty) {
      return;
    }

    final isOnline = isOnlineOverride ?? _isChatPresenceOnline;
    final shouldCreateThreadContext = isTyping || isOnline;
    final now = DateTime.now();
    if (isTyping) {
      final lastSentAt = _lastUserTypingSentAt;
      if (!force &&
          _lastUserTypingThreadId == threadId &&
          lastSentAt != null &&
          now.difference(lastSentAt) < _typingRefreshInterval) {
        return;
      }
      _lastUserTypingThreadId = threadId;
      _lastUserTypingSentAt = now;
    } else if (!force &&
        _lastUserTypingThreadId != threadId &&
        _lastUserTypingSentAt == null) {
      return;
    }

    if (!isTyping && _lastUserTypingThreadId == threadId) {
      _lastUserTypingThreadId = '';
      _lastUserTypingSentAt = null;
    }

    _isUserTypingSent = isTyping && isOnline;

    try {
      await _chatSupportSyncService.updateTyping(
        threadId: threadId,
        adminId: _pinnedProduct.adminId,
        actor: 'user',
        isTyping: isTyping,
        isOnline: isOnline,
        displayName: _currentCustomerDisplayName,
        thread: shouldCreateThreadContext ? _buildTypingThreadContext() : null,
      );
    } catch (_) {}
  }

  void _handleComposerTextChanged(String value) {
    final hasText = value.trim().isNotEmpty;
    _typingIdleTimer?.cancel();

    if (!hasText) {
      unawaited(_sendUserTypingState(false, force: true));
      return;
    }

    unawaited(_sendUserTypingState(true));
    _typingIdleTimer = Timer(_typingIdleDelay, () {
      unawaited(_sendUserTypingState(false, force: true));
    });
  }

  GlobalKey _messageKeyFor(String messageId) {
    return _messageKeys.putIfAbsent(messageId, GlobalKey.new);
  }

  ChatSupportReplyReference? _buildReplyReferenceForMessage(
    ChatSupportStoredMessage message,
  ) {
    final messageId = message.id.trim();
    if (messageId.isEmpty) {
      return null;
    }

    final senderLabel = message.isFromSupport
        ? (message.isAi ? 'AI Assistant' : 'Support')
        : _currentCustomerDisplayName;
    final previewText = _chatReplyPreviewText(message);
    if (senderLabel.trim().isEmpty || previewText.trim().isEmpty) {
      return null;
    }

    return ChatSupportReplyReference(
      messageId: messageId,
      senderLabel: senderLabel,
      previewText: previewText,
    );
  }

  void _setPendingReply(ChatSupportStoredMessage message) {
    final replyReference = _buildReplyReferenceForMessage(message);
    if (replyReference == null) {
      return;
    }

    _hideReactionPicker();
    final displaySenderLabel = message.isFromSupport
        ? (message.isAi ? 'AI Assistant' : 'Support')
        : 'You';
    setState(() {
      _editingMessage = null;
      _pendingReply = _PendingChatReply(
        reference: replyReference,
        displaySenderLabel: displaySenderLabel,
      );
    });

    _messageFocusNode.requestFocus();
    final currentText = _messageController.text;
    _messageController.selection = TextSelection.collapsed(
      offset: currentText.length,
    );
  }

  void _clearPendingReply() {
    if (_pendingReply == null) {
      return;
    }

    setState(() {
      _pendingReply = null;
    });
  }

  bool _canEditMessage(ChatSupportStoredMessage message) {
    return !message.isFromSupport &&
        !message.isAi &&
        !message.isPinProductIndicator &&
        !message.isDeleted &&
        !message.hasMedia &&
        message.text.trim().isNotEmpty;
  }

  bool _canDeleteMessage(ChatSupportStoredMessage message) {
    return !message.isFromSupport &&
        !message.isAi &&
        !message.isPinProductIndicator &&
        !message.isDeleted;
  }

  _PendingChatReply? _rebuildPendingReply(
    List<ChatSupportStoredMessage> messages,
  ) {
    final pendingReply = _pendingReply;
    if (pendingReply == null) {
      return null;
    }

    ChatSupportStoredMessage? targetMessage;
    for (final message in messages) {
      if (message.id == pendingReply.reference.messageId) {
        targetMessage = message;
        break;
      }
    }

    if (targetMessage == null) {
      return null;
    }

    final replyReference = _buildReplyReferenceForMessage(targetMessage);
    if (replyReference == null) {
      return null;
    }

    return _PendingChatReply(
      reference: replyReference,
      displaySenderLabel:
          targetMessage.isFromSupport
              ? (targetMessage.isAi ? 'AI Assistant' : 'Support')
              : 'You',
    );
  }

  Future<void> _applyConversationMessages(
    List<ChatSupportStoredMessage> nextMessages, {
    bool clearEditing = false,
    bool clearComposer = false,
  }) async {
    final normalizedMessages = List<ChatSupportStoredMessage>.unmodifiable(
      nextMessages,
    );
    final nextPendingReply = _rebuildPendingReply(normalizedMessages);

    if (!mounted) {
      return;
    }

    setState(() {
      _messages = normalizedMessages;
      _pendingReply = nextPendingReply;
      if (clearEditing) {
        _editingMessage = null;
      }
      _revealLatestMessageFrom(normalizedMessages);
    });

    if (clearComposer) {
      _messageController.clear();
    }

    await _persistConversation();
  }

  Future<void> _applyServerConversationThread(
    Map<String, dynamic> threadMap, {
    bool clearEditing = false,
    bool clearComposer = false,
  }) async {
    final thread = ChatSupportThreadData.fromJson(threadMap);
    final nextMessages = List<ChatSupportStoredMessage>.unmodifiable(
      thread.messages,
    );
    final nextPendingReply = _rebuildPendingReply(nextMessages);
    final nextPinnedProduct = _productFromThreadForCurrentView(thread);

    if (!mounted) {
      return;
    }

    setState(() {
      _messages = nextMessages;
      _supportReadAt = thread.supportReadAt;
      _employeeTyping = thread.employeeTyping;
      _employeeRating = thread.employeeRating;
      _employeeRatingComment = thread.employeeRatingComment;
      _employeeRatingUpdatedAt = thread.employeeRatingUpdatedAt;
      if (nextPinnedProduct != null) {
        _pinnedProduct = nextPinnedProduct;
      }
      _pendingReply = nextPendingReply;
      if (clearEditing) {
        _editingMessage = null;
      }
      _revealLatestMessageFrom(nextMessages);
    });

    if (clearComposer) {
      _messageController.clear();
    }

    await _persistConversation();
  }

  String _describeMessageActionError(
    Object error, {
    required String fallback,
  }) {
    if (error is ChatSupportSyncException) {
      final message = error.message.trim();
      if (message.isNotEmpty) {
        return message;
      }
    }

    final rawMessage = error.toString().trim();
    if (rawMessage.isNotEmpty) {
      return rawMessage.replaceFirst('ChatSupportSyncException: ', '');
    }

    return fallback;
  }

  void _startEditingMessage(ChatSupportStoredMessage message) {
    if (!_canEditMessage(message)) {
      return;
    }

    _hideReactionPicker();
    final nextText = message.text.trim();
    setState(() {
      _editingMessage = message;
      _pendingReply = null;
    });

    _messageController.value = TextEditingValue(
      text: nextText,
      selection: TextSelection.collapsed(offset: nextText.length),
    );
    _messageFocusNode.requestFocus();
  }

  void _clearEditingMessage({bool clearComposer = true}) {
    if (_editingMessage == null) {
      return;
    }

    setState(() {
      _editingMessage = null;
    });

    if (clearComposer) {
      _messageController.clear();
    }
  }

  void _handleConversationScroll() {
    if (!_scrollController.hasClients) {
      return;
    }

    final currentOffset = _scrollController.position.pixels;
    final previousOffset = _lastConversationScrollOffset;
    _lastConversationScrollOffset = currentOffset;

    final isNearBottom = currentOffset <= _scrollToLatestButtonHideDistance;
    final isFarFromBottom = currentOffset >= _scrollToLatestButtonShowDistance;
    final isScrollingUpConversation =
        currentOffset >
        previousOffset + _scrollToLatestButtonDirectionEpsilon;
    final shouldShowScrollToLatestButton =
        !isNearBottom &&
        isFarFromBottom &&
        (isScrollingUpConversation || _showScrollToLatestButton);
    if (shouldShowScrollToLatestButton != _showScrollToLatestButton && mounted) {
      setState(() {
        _showScrollToLatestButton = shouldShowScrollToLatestButton;
      });
    }

    if (!_hasHiddenOlderMessages || _isLoadingOlderMessages) {
      return;
    }

    final remainingOlderMessageDistance =
        _scrollController.position.maxScrollExtent - currentOffset;
    if (remainingOlderMessageDistance > _loadOlderMessagesTriggerDistance) {
      return;
    }

    _loadOlderMessages();
  }

  void _loadOlderMessages({int minimumVisibleCount = 0}) {
    if (_isLoadingOlderMessages) {
      return;
    }

    final currentVisibleCount = _effectiveVisibleMessageCount;
    var nextVisibleCount = currentVisibleCount + _visibleMessageBatchIncrement;
    if (minimumVisibleCount > nextVisibleCount) {
      nextVisibleCount = minimumVisibleCount;
    }
    if (nextVisibleCount > _messages.length) {
      nextVisibleCount = _messages.length;
    }
    if (nextVisibleCount <= currentVisibleCount) {
      return;
    }

    _isLoadingOlderMessages = true;
    setState(() {
      _visibleMessageCount = nextVisibleCount;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _isLoadingOlderMessages = false;
    });
  }

  Future<void> _waitForNextFrame() {
    final completer = Completer<void>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!completer.isCompleted) {
        completer.complete();
      }
    });
    return completer.future;
  }

  Future<void> _jumpToRepliedMessage(String messageId) async {
    final normalizedMessageId = messageId.trim();
    if (normalizedMessageId.isEmpty) {
      return;
    }

    final targetMessageIndex = _messages.indexWhere(
      (message) => message.id == normalizedMessageId,
    );
    if (targetMessageIndex < 0) {
      _showComposerSnackBar('Original message could not be found.');
      return;
    }

    final minimumVisibleCount = _messages.length - targetMessageIndex;
    if (minimumVisibleCount > _effectiveVisibleMessageCount) {
      _loadOlderMessages(minimumVisibleCount: minimumVisibleCount);
      await _waitForNextFrame();
    }

    final targetContext = _messageKeys[normalizedMessageId]?.currentContext;
    if (targetContext == null) {
      _showComposerSnackBar('Original message could not be found.');
      return;
    }

    _replyJumpHighlightTimer?.cancel();
    if (mounted) {
      setState(() {
        _replyJumpTargetMessageId = normalizedMessageId;
      });
    }

    await Scrollable.ensureVisible(
      targetContext,
      duration: appMotionFrames(19),
      curve: Curves.easeOutCubic,
      alignment: 0.5,
    );

    _replyJumpHighlightTimer = Timer(const Duration(milliseconds: 1300), () {
      if (!mounted) {
        return;
      }
      setState(() {
        if (_replyJumpTargetMessageId == normalizedMessageId) {
          _replyJumpTargetMessageId = null;
        }
      });
    });
  }

  double get _displayPrice {
    final salesPrice = _pinnedProduct.salesPrice;
    if (salesPrice != null &&
        salesPrice >= 0 &&
        salesPrice < _pinnedProduct.originalPrice) {
      return salesPrice;
    }

    return _pinnedProduct.originalPrice;
  }

  bool get _hasSalesPrice {
    final salesPrice = _pinnedProduct.salesPrice;
    return salesPrice != null &&
        salesPrice >= 0 &&
        salesPrice < _pinnedProduct.originalPrice;
  }

  int? get _discountPercent {
    final salesPrice = _pinnedProduct.salesPrice;
    if (salesPrice == null || _pinnedProduct.originalPrice <= 0) {
      return null;
    }

    final discountAmount = _pinnedProduct.originalPrice - salesPrice;
    if (discountAmount <= 0) {
      return null;
    }

    final percent =
        ((discountAmount / _pinnedProduct.originalPrice) * 100).round();
    return percent > 0 ? percent : null;
  }

  bool get _showsTopReviewsChip =>
      _pinnedProduct.rating >= 4.5 && _pinnedProduct.rating <= 5;

  bool get _hasEmployeeSupportReply {
    var hasUserMessage = false;
    for (final message in _messages) {
      if (message.isPinProductIndicator) {
        continue;
      }
      if (!message.isFromSupport) {
        hasUserMessage = true;
        continue;
      }
      if (hasUserMessage && !message.isAi) {
        return true;
      }
    }

    return false;
  }

  bool get _showsEmployeeRatingButton =>
      _employeeRating > 0 || _hasEmployeeSupportReply;

  List<ChatSupportStoredMessage> _buildSeedConversation() {
    return <ChatSupportStoredMessage>[
      ChatSupportStoredMessage(
        id: _resolveChatMessageId(
          rawId: '',
          text:
              'Hello! We are here to help you with ${_displayProductName.toLowerCase()}.',
          isFromSupport: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 4)),
        ),
        text:
            'Hello! We are here to help you with ${_displayProductName.toLowerCase()}.',
        isFromSupport: true,
        timestamp: DateTime.now().subtract(const Duration(minutes: 4)),
      ),
      ChatSupportStoredMessage(
        id: _resolveChatMessageId(
          rawId: '',
          text:
              'You can ask about stock, delivery, payment, or product details anytime.',
          isFromSupport: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 3)),
        ),
        text:
            'You can ask about stock, delivery, payment, or product details anytime.',
        isFromSupport: true,
        timestamp: DateTime.now().subtract(const Duration(minutes: 3)),
      ),
    ];
  }

  Future<void> _loadSavedConversation() async {
    await ChatSupportStore.instance.ensureLoaded();
    final savedThread = ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);

    if (!mounted) {
      return;
    }

    if (savedThread != null && savedThread.messages.isNotEmpty) {
      final savedMessages = List<ChatSupportStoredMessage>.from(savedThread.messages);
      final nextMessages = _hasLocalPinnedProductOverride
          ? _mergeChatMessages(savedMessages, _messages)
          : savedMessages;
      final nextPinnedProduct = _productFromThreadForCurrentView(savedThread);
      final needsRefresh =
          nextMessages.length != _messages.length ||
          nextMessages.asMap().entries.any((entry) {
            final index = entry.key;
            final message = entry.value;
            if (index >= _messages.length) {
              return true;
            }
            return _didChatMessageChange(_messages[index], message);
          }) ||
          _supportReadAt != savedThread.supportReadAt ||
          _didChatTypingEntryChange(_employeeTyping, savedThread.employeeTyping);
      final employeeRatingChanged = _didEmployeeRatingChange(savedThread);
      final pinnedProductChanged = nextPinnedProduct != null &&
          _didPinnedProductChange(nextPinnedProduct);

      if (needsRefresh || employeeRatingChanged || pinnedProductChanged) {
        setState(() {
          _messages = nextMessages;
          _supportReadAt = savedThread.supportReadAt;
          _employeeTyping = savedThread.employeeTyping;
          _employeeRating = savedThread.employeeRating;
          _employeeRatingComment = savedThread.employeeRatingComment;
          _employeeRatingUpdatedAt = savedThread.employeeRatingUpdatedAt;
          if (nextPinnedProduct != null) {
            _pinnedProduct = nextPinnedProduct;
          }
        });
      }
      await ChatSupportStore.instance.markThreadRead(
        _pinnedProductId,
        adminId: _pinnedProduct.adminId,
        readAt: DateTime.now(),
      );
    }

    if (_isConversationViewportReady) {
      _scrollToBottom(jumpOnly: true);
    } else {
      _prepareInitialConversationViewport();
    }
  }

  Future<void> _persistConversation() async {
    await ChatSupportStore.instance.saveThread(
      product: _pinnedProduct,
      messages: _messages,
      showsTopBrand: _pinnedProductShowsTopBrand,
    );
  }

  void _showComposerSnackBar(String text, {bool isSuccess = false}) {
    if (isSuccess) {
      AppSnackBar.showSuccess(
        context,
        message: text,
        duration: appMotionFrames(108),
      );
      return;
    }

    AppSnackBar.showError(
      context,
      message: text,
      duration: appMotionFrames(108),
    );
  }

  String _describeMediaSendError(Object error) {
    if (error is ChatSupportSyncException) {
      final message = error.message.trim();
      if (message.isNotEmpty) {
        return message;
      }
    }

    final rawMessage = error.toString().trim();
    if (rawMessage.isNotEmpty) {
      return rawMessage.replaceFirst('ChatSupportSyncException: ', '');
    }

    return 'Unable to send media right now.';
  }

  String _formatCurrency(double amount) {
    return formatPhpCurrency(amount);
  }

  String _formatTime(DateTime time) {
    final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  String _formatTimeAndDate(DateTime time) {
    const monthNames = <String>[
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    final monthName = monthNames[time.month - 1];
    return '${_formatTime(time)}  $monthName ${time.day}, ${time.year}';
  }

  bool _didEmployeeRatingChange(ChatSupportThreadData thread) {
    return _employeeRating != thread.employeeRating ||
        _employeeRatingComment != thread.employeeRatingComment ||
        _employeeRatingUpdatedAt != thread.employeeRatingUpdatedAt;
  }

  String _employeeRatingCommentHint(int rating) {
    switch (rating) {
      case 1:
        return 'Tell us what went wrong (optional)';
      case 2:
        return 'Tell us what could be better (optional)';
      case 3:
        return 'Tell us what was okay and what can improve (optional)';
      case 4:
        return 'Tell us what was helpful (optional)';
      case 5:
        return 'Tell us what made the support excellent (optional)';
      default:
        return 'Add a comment (optional)';
    }
  }

  String _describeEmployeeRating(int rating) {
    switch (rating) {
      case 1:
        return 'Needs improvement';
      case 2:
        return 'Fair support';
      case 3:
        return 'Good support';
      case 4:
        return 'Very helpful';
      case 5:
        return 'Excellent support';
      default:
        return 'Tap a star to rate this employee.';
    }
  }

  bool _hasCenteredTimestampGapBetweenMessages(
    ChatSupportStoredMessage olderMessage,
    ChatSupportStoredMessage newerMessage,
  ) {
    return newerMessage.timestamp.difference(olderMessage.timestamp).inMinutes >=
        60;
  }

  bool _shouldShowCenteredTimestamp(int chronologicalMessageIndex) {
    if (
        chronologicalMessageIndex < 0 ||
        chronologicalMessageIndex >= _messages.length
    ) {
      return false;
    }

    final currentMessage = _messages[chronologicalMessageIndex];
    if (currentMessage.isAi) {
      return false;
    }
    if (chronologicalMessageIndex == _oldestVisibleMessageIndex) {
      return true;
    }

    ChatSupportStoredMessage? previousComparableMessage;
    for (var index = chronologicalMessageIndex - 1; index >= 0; index--) {
      final candidate = _messages[index];
      if (candidate.isAi) {
        continue;
      }
      previousComparableMessage = candidate;
      break;
    }

    if (previousComparableMessage == null) {
      return true;
    }

    if (currentMessage.isFromSupport && previousComparableMessage.isFromSupport) {
      return false;
    }

    return _hasCenteredTimestampGapBetweenMessages(
      previousComparableMessage,
      currentMessage,
    );
  }

  double _conversationMessageGapForDisplayIndex(int displayIndex) {
    const defaultGap = 10.0;
    const compactSupportGap = 4.0;
    const repliedMessageTopGap = 16.0;
    const editedMessageTopGap = 16.0;
    const pinIndicatorTopGap = 16.0;

    if (_hasHiddenOlderMessages && displayIndex >= _effectiveVisibleMessageCount - 1) {
      return defaultGap;
    }

    final newerChronologicalIndex = _messages.length - 1 - displayIndex;
    final olderChronologicalIndex = newerChronologicalIndex - 1;
    if (newerChronologicalIndex < 0 || olderChronologicalIndex < 0) {
      return defaultGap;
    }

    final newerMessage = _messages[newerChronologicalIndex];
    final olderMessage = _messages[olderChronologicalIndex];
    final replyAwareGap = newerMessage.replyTo == null
        ? 0.0
        : repliedMessageTopGap;
    final editAwareGap = newerMessage.isEdited && newerMessage.replyTo == null
        ? editedMessageTopGap
        : 0.0;
    final pinAwareGap =
        newerMessage.isPinProductIndicator && !olderMessage.isPinProductIndicator
            ? pinIndicatorTopGap
            : 0.0;
    final stateAwareGap = replyAwareGap + editAwareGap + pinAwareGap;
    if (!newerMessage.isFromSupport || !olderMessage.isFromSupport) {
      return defaultGap + stateAwareGap;
    }

    if (newerMessage.isEdited || olderMessage.isEdited) {
      return defaultGap + stateAwareGap;
    }

    if (_hasCenteredTimestampGapBetweenMessages(olderMessage, newerMessage)) {
      return defaultGap + stateAwareGap;
    }

    return compactSupportGap + stateAwareGap;
  }

  Widget _buildOlderMessagesLoader(Color secondaryColor) {
    final hiddenMessageCount = _messages.length - _effectiveVisibleMessageCount;
    final loadLabel = hiddenMessageCount > _visibleMessageBatchIncrement
        ? 'Load earlier messages'
        : 'Show full chat history';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Center(
        child: TextButton(
          onPressed: _hasHiddenOlderMessages ? _loadOlderMessages : null,
          style: TextButton.styleFrom(
            foregroundColor: secondaryColor,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          child: Text(loadLabel),
        ),
      ),
    );
  }

  void _toggleMessageDetails(String messageId) {
    _hideReactionPicker();
    setState(() {
      _revealedMessageId = _revealedMessageId == messageId ? null : messageId;
    });
  }

  void _hideReactionPicker() {
    _reactionPickerEntry?.remove();
    _reactionPickerEntry = null;
  }

  Future<void> _applyReactionToMessage(
    ChatSupportStoredMessage message,
    String selectedEmoji,
  ) async {
    if (!mounted) {
      return;
    }

    final currentReaction = message.reactionEmoji.trim();
    final nextReaction = currentReaction == selectedEmoji ? '' : selectedEmoji;
    final messageIndex = _messages.indexWhere((item) => item.id == message.id);
    if (messageIndex < 0) {
      return;
    }

    final nextMessages = List<ChatSupportStoredMessage>.from(_messages);
    nextMessages[messageIndex] = nextMessages[messageIndex].copyWith(
      reactionEmoji: nextReaction,
    );

    setState(() {
      _messages = nextMessages;
    });
    await _persistConversation();
  }

  void _handleBubbleLongPress(
    ChatSupportStoredMessage message,
    Offset globalPosition,
  ) {
    if (message.isDeleted) {
      return;
    }

    if (_canEditMessage(message) || _canDeleteMessage(message)) {
      unawaited(_showMessageActionSheet(message, globalPosition));
      return;
    }

    _showReactionPickerOverlay(message, globalPosition);
  }

  void _showReactionPickerOverlay(
    ChatSupportStoredMessage message,
    Offset globalPosition, {
    double reservedBottomSpace = 0,
  }) {

    final overlay = Overlay.of(context, rootOverlay: true);

    _hideReactionPicker();

    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final mediaQuery = MediaQuery.of(context);
    const pickerWidth = 248.0;
    const pickerHeight = 58.0;
    const screenPadding = 10.0;
    final safeTop = mediaQuery.padding.top + screenPadding;
    final safeBottom = mediaQuery.padding.bottom + screenPadding;

    double left =
        message.isFromSupport
            ? globalPosition.dx - 8
            : globalPosition.dx - pickerWidth + 8;
    final maxLeft = mediaQuery.size.width - pickerWidth - screenPadding;
    if (left < screenPadding) {
      left = screenPadding;
    } else if (left > maxLeft) {
      left = maxLeft;
    }

    double top = globalPosition.dy - pickerHeight - 18;
    final maxTop =
        mediaQuery.size.height -
        pickerHeight -
        safeBottom -
        reservedBottomSpace -
        10;
    if (top < safeTop) {
      top = globalPosition.dy + 18;
    }
    if (top < safeTop) {
      top = safeTop;
    } else if (top > maxTop) {
      top = maxTop < safeTop ? safeTop : maxTop;
    }

    final currentReaction = message.reactionEmoji.trim();

    _reactionPickerEntry = OverlayEntry(
      builder: (overlayContext) {
        return Stack(
          children: [
            Positioned(
              left: left,
              top: top,
              child: TapRegion(
                onTapOutside: (_) => _hideReactionPicker(),
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    width: pickerWidth,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: BorderRadius.circular(
                        _chatSupportBorderRadius,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.12),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        for (
                          var index = 0;
                          index < _reactionPickerOptions.length;
                          index++
                        )
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 2),
                              child: TweenAnimationBuilder<double>(
                                duration: appMotionFrames(34 + (index * 8)),
                                curve: Curves.easeOutBack,
                                tween: Tween<double>(begin: 0, end: 1),
                                builder: (context, value, child) {
                                  return Opacity(
                                    opacity: value.clamp(0, 1),
                                    child: Transform.translate(
                                      offset: Offset(0, 10 * (1 - value)),
                                      child: Transform.scale(
                                        scale: 0.72 + (0.28 * value),
                                        child: child,
                                      ),
                                    ),
                                  );
                                },
                                child: InkWell(
                                  onTap: () {
                                    final emoji =
                                        _reactionPickerOptions[index].emoji;
                                    _hideReactionPicker();
                                    unawaited(
                                      _applyReactionToMessage(message, emoji),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(
                                    _chatSupportBorderRadius,
                                  ),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color:
                                          currentReaction ==
                                                  _reactionPickerOptions[index]
                                                      .emoji
                                              ? primaryColor.withOpacity(0.12)
                                              : Colors.transparent,
                                      borderRadius: BorderRadius.circular(
                                        _chatSupportBorderRadius,
                                      ),
                                    ),
                                    alignment: Alignment.center,
                                    child: SizedBox(
                                      width: 34,
                                      height: 34,
                                      child: Lottie.asset(
                                        _reactionPickerOptions[index].assetPath,
                                        frameRate: appLottieFrameRate,
                                        repeat: true,
                                        fit: BoxFit.contain,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );

    overlay.insert(_reactionPickerEntry!);
  }

  List<ChatSupportStoredMessage> _buildLocallyEditedMessages(
    ChatSupportStoredMessage targetMessage,
    String nextText,
  ) {
    final nextEditedAt = DateTime.now();
    return _messages.map((message) {
      if (message.id == targetMessage.id) {
        return message.copyWith(
          text: nextText,
          editedAt: nextEditedAt,
        );
      }

      final replyTo = message.replyTo;
      if (replyTo?.messageId == targetMessage.id) {
        return message.copyWith(
          replyTo: ChatSupportReplyReference(
            messageId: replyTo!.messageId,
            senderLabel: replyTo.senderLabel,
            previewText: nextText,
          ),
        );
      }

      return message;
    }).toList(growable: false);
  }

  List<ChatSupportStoredMessage> _buildLocallyDeletedMessages(String messageId) {
    final nextMessages = <ChatSupportStoredMessage>[];
    for (final message in _messages) {
      if (message.id == messageId) {
        continue;
      }

      final replyTo = message.replyTo;
      if (replyTo?.messageId == messageId) {
        nextMessages.add(
          message.copyWith(replyTo: null),
        );
        continue;
      }

      nextMessages.add(message);
    }

    return List<ChatSupportStoredMessage>.unmodifiable(nextMessages);
  }

  Future<void> _saveEditedMessage() async {
    final editingMessage = _editingMessage;
    if (editingMessage == null) {
      return;
    }

    final nextText = _messageController.text.replaceAll(_chatWhitespacePattern, ' ').trim();
    if (nextText.isEmpty) {
      _showComposerSnackBar('Message cannot be empty.');
      return;
    }

    if (!_canEditMessage(editingMessage)) {
      _showComposerSnackBar('This message can no longer be edited.');
      _clearEditingMessage();
      unawaited(_sendUserTypingState(false, force: true));
      return;
    }

    if (nextText == editingMessage.text.trim()) {
      _clearEditingMessage();
      unawaited(_sendUserTypingState(false, force: true));
      return;
    }

    unawaited(_sendUserTypingState(false, force: true));

    if (!editingMessage.isSentToServer) {
      await _applyConversationMessages(
        _buildLocallyEditedMessages(editingMessage, nextText),
        clearEditing: true,
        clearComposer: true,
      );
      return;
    }

    try {
      final updatedThread = await _chatSupportSyncService.editMessage(
        threadId: _activeThreadId,
        adminId: _pinnedProduct.adminId,
        messageId: editingMessage.id,
        text: nextText,
      );
      await _applyServerConversationThread(
        updatedThread,
        clearEditing: true,
        clearComposer: true,
      );
    } catch (error) {
      _showComposerSnackBar(
        _describeMessageActionError(
          error,
          fallback: 'Unable to edit message right now.',
        ),
      );
    }
  }

  Future<void> _deleteMessage(ChatSupportStoredMessage message) async {
    if (!_canDeleteMessage(message)) {
      return;
    }

    final clearsCurrentEdit = _editingMessage?.id == message.id;
    if (!message.isSentToServer) {
      await _applyConversationMessages(
        _buildLocallyDeletedMessages(message.id),
        clearEditing: clearsCurrentEdit,
        clearComposer: clearsCurrentEdit,
      );
      return;
    }

    try {
      final updatedThread = await _chatSupportSyncService.deleteMessage(
        threadId: _activeThreadId,
        adminId: _pinnedProduct.adminId,
        messageId: message.id,
        customerId: ChatSupportStore.instance.customerId,
      );
      await _applyServerConversationThread(
        updatedThread,
        clearEditing: clearsCurrentEdit,
        clearComposer: clearsCurrentEdit,
      );
    } catch (error) {
      _showComposerSnackBar(
        _describeMessageActionError(
          error,
          fallback: 'Unable to delete message right now.',
        ),
      );
    }
  }

  Future<void> _showMessageActionSheet(
    ChatSupportStoredMessage message,
    Offset globalPosition,
  ) async {
    final canEdit = _canEditMessage(message);
    final canDelete = _canDeleteMessage(message);
    if (!canEdit && !canDelete) {
      return;
    }

    _hideReactionPicker();
    final theme = Theme.of(context);
    final actionCount = (canEdit ? 1 : 0) + (canDelete ? 1 : 0);
    final reservedBottomSpace =
        MediaQuery.of(context).padding.bottom + 28 + (actionCount * 56.0);

    final selectedActionFuture = showModalBottomSheet<String>(
      context: context,
      backgroundColor: theme.cardColor,
      barrierColor: Colors.transparent,
      elevation: 0,
      showDragHandle: false,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(8),
        ),
      ),
      builder: (sheetContext) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (canEdit)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.edit_outlined),
                    title: const Text('Edit message'),
                    onTap: () => Navigator.of(sheetContext).pop('edit'),
                  ),
                if (canDelete)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      Icons.delete_outline_rounded,
                      color: theme.colorScheme.error,
                    ),
                    title: Text(
                      'Delete message',
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                    onTap: () => Navigator.of(sheetContext).pop('delete'),
                  ),
              ],
            ),
          ),
        );
      },
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      _showReactionPickerOverlay(
        message,
        globalPosition,
        reservedBottomSpace: reservedBottomSpace,
      );
    });

    final selectedAction = await selectedActionFuture;
    _hideReactionPicker();

    if (!mounted || selectedAction == null) {
      return;
    }

    switch (selectedAction) {
      case 'edit':
        _startEditingMessage(message);
        break;
      case 'delete':
        await _deleteMessage(message);
        break;
    }
  }

  Future<void> _handleComposerPrimaryAction() async {
    if (_editingMessage != null) {
      await _saveEditedMessage();
      return;
    }

    await _sendMessage();
  }

  void _revealLatestMessageFrom(List<ChatSupportStoredMessage> messages) {
    _revealedMessageId = null;
    _replyJumpTargetMessageId = null;
  }

  String? get _latestUserMessageId {
    for (final message in _messages.reversed) {
      if (
          message.isFromSupport ||
          message.isDeleted ||
          message.isPinProductIndicator ||
          (message.text.trim().isEmpty && !message.hasMedia)
      ) {
        continue;
      }
      return message.id;
    }

    return null;
  }

  String? get _latestSeenUserMessageId {
    final supportReadAt = _supportReadAt;
    if (supportReadAt == null) {
      return null;
    }

    for (final message in _messages.reversed) {
      if (
          message.isFromSupport ||
          message.isDeleted ||
          message.isPinProductIndicator ||
          !message.isSentToServer ||
          (message.text.trim().isEmpty && !message.hasMedia)
      ) {
        continue;
      }
      if (message.timestamp.isAfter(supportReadAt)) {
        continue;
      }
      return message.id;
    }

    return null;
  }

  void _scrollToBottom({bool jumpOnly = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }

      const offset = 0.0;
      if (jumpOnly) {
        _scrollController.jumpTo(offset);
        return;
      }

      _scrollController.animateTo(
        offset,
        duration: appMotionFrames(16),
        curve: Curves.easeOutCubic,
      );
    });
  }

  Widget _buildScrollToLatestButton({
    required Color primaryColor,
    required Color foregroundColor,
  }) {
    return IgnorePointer(
      ignoring: !_showScrollToLatestButton,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(
          begin: 0,
          end: _showScrollToLatestButton ? 1 : 0,
        ),
        duration: appMotionFrames(_showScrollToLatestButton ? 24 : 14),
        curve: _showScrollToLatestButton
            ? Curves.easeOutCubic
            : Curves.easeInCubic,
        builder: (context, value, child) {
          final opacity = value.clamp(0.0, 1.0);
          final verticalOffset =
              _showScrollToLatestButton ? 18 * (1 - opacity) : 0.0;
          return Opacity(
            opacity: opacity,
            child: Transform.translate(
              offset: Offset(0, verticalOffset),
              child: child,
            ),
          );
        },
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 28),
            child: DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.28),
                    blurRadius: 18,
                    spreadRadius: 0,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Material(
                color: primaryColor,
                elevation: 0,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: _scrollToBottom,
                  child: SizedBox(
                    width: 34,
                    height: 34,
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: foregroundColor,
                      size: 22,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _prepareInitialConversationViewport() {
    if (_isConversationViewportReady) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      if (!_scrollController.hasClients) {
        _prepareInitialConversationViewport();
        return;
      }

      _scrollController.jumpTo(0);
      _lastConversationScrollOffset = 0;

      if (!_isConversationViewportReady) {
        setState(() {
          _isConversationViewportReady = true;
          _showScrollToLatestButton = false;
        });
      }
    });
  }

  Future<ChatSupportStoredMessage?> _sendUserMessage([String? presetText]) async {
    final nextText = (presetText ?? _messageController.text).trim();
    if (nextText.isEmpty) {
      return null;
    }

    final pendingReply = _pendingReply?.reference;
    final shouldActivateProductPin = _shouldActivateProductPinOnFirstUserChat;
    final shouldAppendProductPin = _shouldAppendProductPinOnFirstUserChat;
    final messageTimestamp = DateTime.now();
    final pinTimestamp = shouldAppendProductPin
        ? messageTimestamp.subtract(const Duration(milliseconds: 1))
        : null;
    final nextMessage = ChatSupportStoredMessage(
      id: _generateChatMessageId(false),
      text: nextText,
      isFromSupport: false,
      timestamp: messageTimestamp,
      isSentToServer: false,
      replyTo: pendingReply,
    );

    setState(() {
      final nextMessages = List<ChatSupportStoredMessage>.from(_messages);
      if (shouldActivateProductPin) {
        _hasLocalPinnedProductOverride = true;
        _isPinnedProductCardVisible = true;
        _hasPinnedProductInCurrentSession = true;
        if (shouldAppendProductPin) {
          nextMessages.add(
            _buildPinnedProductIndicatorMessage(
              _pinnedProduct,
              timestamp: pinTimestamp,
            ),
          );
        }
      }
      nextMessages.add(nextMessage);
      _messages = nextMessages;
      _revealedMessageId = null;
      _pendingReply = null;
    });

    _messageController.clear();
    unawaited(_sendUserTypingState(false, force: true));
    _scrollToBottom();
    await _persistConversation();
    await _refreshConversationFromServer(jumpOnly: true);
    return nextMessage;
  }

  Future<void> _sendMessage([String? presetText]) async {
    await _sendUserMessage(presetText);
  }

  void _prefillComposerText(String text) {
    final trimmedText = text.trim();
    if (trimmedText.isEmpty) {
      return;
    }

    final currentText = _messageController.text.trim();
    final nextText = currentText.isEmpty
        ? trimmedText
        : '$currentText\n$trimmedText';

    _messageController.value = TextEditingValue(
      text: nextText,
      selection: TextSelection.collapsed(offset: nextText.length),
    );
  }

  String _resolveChatUploadContentType(String fileName) {
    final normalized = fileName.trim().toLowerCase();
    if (normalized.endsWith('.png')) {
      return 'image/png';
    }
    if (normalized.endsWith('.webp')) {
      return 'image/webp';
    }
    if (normalized.endsWith('.gif')) {
      return 'image/gif';
    }
    if (normalized.endsWith('.mp4')) {
      return 'video/mp4';
    }
    if (normalized.endsWith('.mov')) {
      return 'video/quicktime';
    }
    if (normalized.endsWith('.m4v')) {
      return 'video/x-m4v';
    }
    if (normalized.endsWith('.webm')) {
      return 'video/webm';
    }
    if (normalized.endsWith('.avi')) {
      return 'video/x-msvideo';
    }
    if (normalized.endsWith('.mkv')) {
      return 'video/x-matroska';
    }
    if (normalized.endsWith('.3gp')) {
      return 'video/3gpp';
    }
    return 'image/jpeg';
  }

  Future<void> _sendMediaMessage({
    required String mediaUrl,
    required String mediaName,
  }) async {
    final pendingReply = _pendingReply?.reference;
    final shouldActivateProductPin = _shouldActivateProductPinOnFirstUserChat;
    final shouldAppendProductPin = _shouldAppendProductPinOnFirstUserChat;
    final messageTimestamp = DateTime.now();
    final pinTimestamp = shouldAppendProductPin
        ? messageTimestamp.subtract(const Duration(milliseconds: 1))
        : null;
    final nextMessage = ChatSupportStoredMessage(
      id: _generateChatMessageId(false),
      text: '',
      isFromSupport: false,
      timestamp: messageTimestamp,
      imageUrl: mediaUrl,
      imageName: mediaName,
      isSentToServer: false,
      replyTo: pendingReply,
    );

    setState(() {
      final nextMessages = List<ChatSupportStoredMessage>.from(_messages);
      if (shouldActivateProductPin) {
        _hasLocalPinnedProductOverride = true;
        _isPinnedProductCardVisible = true;
        _hasPinnedProductInCurrentSession = true;
        if (shouldAppendProductPin) {
          nextMessages.add(
            _buildPinnedProductIndicatorMessage(
              _pinnedProduct,
              timestamp: pinTimestamp,
            ),
          );
        }
      }
      nextMessages.add(nextMessage);
      _messages = nextMessages;
      _revealedMessageId = null;
      _pendingReply = null;
    });

    _scrollToBottom();
    await _persistConversation();
    await _refreshConversationFromServer(jumpOnly: true);
  }

  Future<void> _pickAndSendMedia(String selectedMediaType) async {
    if (_isUploadingPhoto) {
      return;
    }

    try {
      final pickedFile = selectedMediaType == 'video'
          ? await _imagePicker.pickVideo(source: ImageSource.gallery)
          : await _imagePicker.pickImage(
              source: ImageSource.gallery,
              maxWidth: _chatSupportImageUploadMaxWidth,
              maxHeight: _chatSupportImageUploadMaxHeight,
              imageQuality: 92,
            );

      if (pickedFile == null) {
        return;
      }

      final bytes = await pickedFile.readAsBytes();
      if (bytes.isEmpty) {
        _showComposerSnackBar('Selected file is empty.');
        return;
      }

      if (mounted) {
        setState(() {
          _isUploadingPhoto = true;
        });
      }

      final imageUrl = await _chatSupportSyncService.uploadChatMedia(
        bytes: bytes,
        fileName: pickedFile.name.trim().isEmpty
            ? (selectedMediaType == 'video'
                  ? 'chat-video.mp4'
                  : 'chat-photo.jpg')
            : pickedFile.name,
        contentType: _resolveChatUploadContentType(pickedFile.name),
      );

      await _sendMediaMessage(
        mediaUrl: imageUrl,
        mediaName: pickedFile.name.trim().isEmpty
            ? (selectedMediaType == 'video' ? 'Video' : 'Photo')
            : pickedFile.name,
      );
    } catch (error) {
      _showComposerSnackBar(_describeMediaSendError(error));
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingPhoto = false;
        });
      }
    }
  }

  Future<void> _pinProduct(Product product) async {
    if (!_isChatSupportPinnableProduct(product)) {
      _showComposerSnackBar('This product cannot be pinned.');
      return;
    }

    if (!_isProductFromActiveChatAdmin(product)) {
      _showComposerSnackBar(
        'Only products from this seller can be pinned in this chat.',
      );
      return;
    }

    setState(() {
      _hasLocalPinnedProductOverride = true;
      _hasPinnedProductInCurrentSession = true;
      _pinnedProduct = product;
      _appendPinnedProductIndicatorMessage(product);
    });

    await _persistConversation();

    if (!mounted) {
      return;
    }

    _scrollToBottom();
  }

  Future<void> _showProductPinSheet() async {
    final activeChatAdminId = _activeChatAdminId;
    Future<List<Product>> productsFuture = () async {
      final allProducts =
          await _productRepository.fetchProducts(forceRefresh: true);
      return allProducts;
    }();

    final selectedProduct = await showModalBottomSheet<Product>(
      context: context,
      backgroundColor: Theme.of(context).cardColor,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        final theme = Theme.of(sheetContext);
        return SafeArea(
          top: false,
          child: FractionallySizedBox(
            heightFactor: 0.74,
            child: _ChatSupportProductPinSheet(
              productsFuture: productsFuture,
              selectedProductId: _pinnedProductId,
              adminIdFilter: activeChatAdminId,
              primaryColor: theme.colorScheme.primary,
              titleColor: theme.colorScheme.onSurface,
              secondaryColor: theme.colorScheme.onSurfaceVariant,
              surfaceColor: theme.cardColor,
            ),
          ),
        );
      },
    );

    if (!mounted || selectedProduct == null) {
      return;
    }

    await _pinProduct(selectedProduct);
  }

  Future<void> _handleComposerMoreTap() async {
    if (_isUploadingPhoto) {
      return;
    }

    final selectedAction = await showModalBottomSheet<String>(
        context: context,
        backgroundColor: Theme.of(context).cardColor,
        showDragHandle: true,
        builder: (sheetContext) {
          return SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.inventory_2_outlined),
                  title: const Text('Product'),
                  onTap: () => Navigator.of(sheetContext).pop('product'),
                ),
                ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: const Text('Order'),
                  onTap: () => Navigator.of(sheetContext).pop('order'),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_outlined),
                  title: const Text('Photo'),
                  onTap: () => Navigator.of(sheetContext).pop('photo'),
                ),
                ListTile(
                  leading: const Icon(Icons.videocam_outlined),
                  title: const Text('Video'),
                  onTap: () => Navigator.of(sheetContext).pop('video'),
                ),
              ],
            ),
          );
        },
      );

    if (!mounted || selectedAction == null) {
      return;
    }

    switch (selectedAction) {
      case 'product':
        await _showProductPinSheet();
        break;
      case 'order':
        _prefillComposerText('Order concern');
        break;
      case 'photo':
      case 'video':
        await _pickAndSendMedia(selectedAction);
        break;
    }
  }

  Future<void> _handleProductPinTap() async {
    if (_isUploadingPhoto) {
      return;
    }

    await _showProductPinSheet();
  }

  void _insertEmoji(String emoji) {
    final currentValue = _messageController.value;
    final selection = currentValue.selection;
    final text = currentValue.text;

    final safeStart = selection.start < 0 ? text.length : selection.start;
    final safeEnd = selection.end < 0 ? text.length : selection.end;
    final start = safeStart.clamp(0, text.length);
    final end = safeEnd.clamp(0, text.length);
    final left = text.substring(0, start);
    final right = text.substring(end);
    final nextText = '$left$emoji$right';
    final nextOffset = start + emoji.length;

    _messageController.value = TextEditingValue(
      text: nextText,
      selection: TextSelection.collapsed(offset: nextOffset),
    );
  }

  Future<void> _handleEmojiSelected(
    String emoji,
    BuildContext sheetContext,
  ) async {
    final hasTypedMessage = _messageController.text.trim().isNotEmpty;
    Navigator.of(sheetContext).pop();

    if (hasTypedMessage) {
      _insertEmoji(emoji);
      return;
    }

    await _sendMessage(emoji);
  }

  Future<void> _handleEmojiTap() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).cardColor,
      showDragHandle: true,
      builder: (sheetContext) {
        final theme = Theme.of(sheetContext);
        return SafeArea(
          top: false,
            child: SizedBox(
              height: 320,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Choose emoji',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: GridView.builder(
                      itemCount: _chooserEmojiOptions.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 5,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                      itemBuilder: (context, index) {
                        final emojiOption = _chooserEmojiOptions[index];
                        return TextButton(
                          onPressed: () =>
                              _handleEmojiSelected(
                                emojiOption.emoji,
                                sheetContext,
                              ),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: SizedBox(
                            width: 40,
                            height: 40,
                            child: _ChatSupportStaticLottiePreview(
                              assetPath: emojiOption.assetPath,
                              progress: emojiOption.previewProgress,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _saveEmployeeRating(
    double rating, {
    required String comment,
  }) async {
    final normalizedRating = _normalizeChatRating(rating);
    final normalizedComment = _normalizeEmployeeRatingComment(comment);
    final ratingUpdatedAt = DateTime.now();

    setState(() {
      _employeeRating = normalizedRating;
      _employeeRatingComment = normalizedComment;
      _employeeRatingUpdatedAt = ratingUpdatedAt;
    });

    await ChatSupportStore.instance.saveThread(
      product: _pinnedProduct,
      messages: _messages,
      showsTopBrand: _pinnedProductShowsTopBrand,
      employeeRating: normalizedRating,
      employeeRatingComment: normalizedComment,
      employeeRatingUpdatedAt: ratingUpdatedAt,
    );

    if (!mounted) {
      return;
    }

    _showComposerSnackBar('Employee rating saved.', isSuccess: true);
  }

  Future<void> _clearEmployeeRating() async {
    final ratingUpdatedAt = DateTime.now();

    setState(() {
      _employeeRating = 0;
      _employeeRatingComment = '';
      _employeeRatingUpdatedAt = ratingUpdatedAt;
    });

    await ChatSupportStore.instance.saveThread(
      product: _pinnedProduct,
      messages: _messages,
      showsTopBrand: _pinnedProductShowsTopBrand,
      employeeRating: 0,
      employeeRatingComment: '',
      employeeRatingUpdatedAt: ratingUpdatedAt,
    );

    if (!mounted) {
      return;
    }

    _showComposerSnackBar('Employee rating removed.', isSuccess: true);
  }

  Future<void> _showEmployeeRatingSheet() async {
    _hideReactionPicker();
    _messageFocusNode.unfocus();

    var selectedRating = _employeeRating > 0 ? _employeeRating.round() : 0;
    final otherCommentController =
        TextEditingController(text: _employeeRatingComment);
    final theme = Theme.of(context);
    final titleColor = theme.colorScheme.onSurface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    const selectedStarColor = Color(0xFFFFB11A);

    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: theme.colorScheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(_chatSupportBorderRadius),
          ),
        ),
        builder: (sheetContext) {
          return StatefulBuilder(
            builder: (context, setSheetState) {
              return SafeArea(
                top: false,
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    20,
                    20,
                    24 + MediaQuery.viewInsetsOf(sheetContext).bottom,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _employeeRating > 0
                            ? 'Update employee rating'
                            : 'Rate this employee',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: titleColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Share how helpful the support conversation was.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: secondaryColor,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List<Widget>.generate(5, (index) {
                          final starValue = index + 1;
                          final isSelected = starValue <= selectedRating;
                          return IconButton(
                            onPressed: () {
                              setSheetState(() {
                                selectedRating = starValue;
                              });
                            },
                            tooltip:
                                'Rate $starValue star${starValue == 1 ? '' : 's'}',
                            iconSize: 38,
                            color: isSelected ? selectedStarColor : secondaryColor,
                            icon: Icon(
                              isSelected
                                  ? Icons.star_rounded
                                  : Icons.star_outline_rounded,
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _describeEmployeeRating(selectedRating),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: titleColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (selectedRating > 0) ...[
                        const SizedBox(height: 12),
                        TextField(
                          controller: otherCommentController,
                          minLines: 1,
                          maxLines: 3,
                          textInputAction: TextInputAction.done,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: InputDecoration(
                            hintText: _employeeRatingCommentHint(selectedRating),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: selectedRating <= 0
                              ? null
                              : () async {
                                  Navigator.of(sheetContext).pop();
                                  await _saveEmployeeRating(
                                    selectedRating.toDouble(),
                                    comment: otherCommentController.text,
                                  );
                                },
                          child: Text(
                            _employeeRating > 0 ? 'Update rating' : 'Save rating',
                          ),
                        ),
                      ),
                      if (_employeeRating > 0) ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () async {
                              Navigator.of(sheetContext).pop();
                              await _clearEmployeeRating();
                            },
                            child: const Text('Remove rating'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
      );
    } finally {
      otherCommentController.dispose();
    }
  }

  Future<void> _refreshConversationFromServer({bool jumpOnly = false}) async {
    if (_isRefreshingFromServer) {
      return;
    }

    _isRefreshingFromServer = true;
    try {
      final previousMessages = List<ChatSupportStoredMessage>.from(_messages);
      Map<String, dynamic>? directThreadMap;
      try {
        directThreadMap = await _chatSupportSyncService.fetchThread(
          threadId: _activeThreadId,
          adminId: _pinnedProduct.adminId,
        );
      } catch (_) {
        directThreadMap = null;
      }
      final refreshedThread = directThreadMap == null
          ? null
          : ChatSupportThreadData.fromJson(directThreadMap);
      final localThread = ChatSupportStore.instance.threadForProduct(
        _pinnedProductId,
        adminId: _pinnedProduct.adminId,
      );
      final effectiveRefreshedThread =
          refreshedThread == null || localThread == null
              ? refreshedThread
              : ChatSupportStore.instance._mergeThreadData(
                  localThread,
                  refreshedThread,
                );

      if (!mounted ||
          effectiveRefreshedThread == null ||
          effectiveRefreshedThread.messages.isEmpty) {
        await ChatSupportStore.instance.refreshThreadsFromServer();
        final fallbackThread =
            ChatSupportStore.instance.threadForProduct(_pinnedProductId, adminId: _pinnedProduct.adminId);
        if (!mounted || fallbackThread == null || fallbackThread.messages.isEmpty) {
          return;
        }

        final fallbackMessages = List<ChatSupportStoredMessage>.from(
          fallbackThread.messages,
        );
        final fallbackConversationChanged =
            fallbackMessages.length != previousMessages.length ||
            fallbackMessages.asMap().entries.any((entry) {
              final index = entry.key;
              final nextMessage = entry.value;
              if (index >= previousMessages.length) {
                return true;
              }
              return _didChatMessageChange(
                previousMessages[index],
                nextMessage,
              );
            });
        final fallbackEmployeeRatingChanged =
            _didEmployeeRatingChange(fallbackThread);
        final fallbackTypingChanged =
            _didChatTypingEntryChange(_employeeTyping, fallbackThread.employeeTyping);
        final fallbackPinnedProduct =
            _productFromThreadForCurrentView(fallbackThread);
        final fallbackPinnedProductChanged = fallbackPinnedProduct != null &&
            _didPinnedProductChange(fallbackPinnedProduct);

        if (
            fallbackConversationChanged ||
            fallbackEmployeeRatingChanged ||
            fallbackTypingChanged ||
            fallbackPinnedProductChanged
        ) {
          setState(() {
            _messages = fallbackMessages;
            _supportReadAt = fallbackThread.supportReadAt;
            _employeeTyping = fallbackThread.employeeTyping;
            _employeeRating = fallbackThread.employeeRating;
            _employeeRatingComment = fallbackThread.employeeRatingComment;
            _employeeRatingUpdatedAt = fallbackThread.employeeRatingUpdatedAt;
            if (fallbackPinnedProduct != null) {
              _pinnedProduct = fallbackPinnedProduct;
            }
            _revealLatestMessageFrom(fallbackMessages);
          });
          if (fallbackConversationChanged || fallbackTypingChanged) {
            _scrollToBottom(jumpOnly: jumpOnly);
          }
        } else if (_supportReadAt != fallbackThread.supportReadAt) {
          setState(() {
            _supportReadAt = fallbackThread.supportReadAt;
          });
        }

        if (fallbackThread.hasUnreadMessage) {
          await ChatSupportStore.instance.markThreadRead(
            _pinnedProductId,
            adminId: _pinnedProduct.adminId,
            readAt: DateTime.now(),
          );
        }
        return;
      }

      final nextMessages = _mergeChatMessages(
        previousMessages,
        List<ChatSupportStoredMessage>.from(
          effectiveRefreshedThread.messages,
        ),
        authoritativeSecondary: true,
      );
      final hasConversationChanged =
          nextMessages.length != previousMessages.length ||
          nextMessages.asMap().entries.any((entry) {
            final index = entry.key;
            final nextMessage = entry.value;
            if (index >= previousMessages.length) {
              return true;
            }
            return _didChatMessageChange(
              previousMessages[index],
              nextMessage,
            );
          });
      final employeeRatingChanged =
          _didEmployeeRatingChange(effectiveRefreshedThread);
      final typingChanged = _didChatTypingEntryChange(
        _employeeTyping,
        effectiveRefreshedThread.employeeTyping,
      );
      final refreshedPinnedProduct =
          _productFromThreadForCurrentView(effectiveRefreshedThread);
      final refreshedPinnedProductChanged = refreshedPinnedProduct != null &&
          _didPinnedProductChange(refreshedPinnedProduct);

      if (hasConversationChanged ||
          employeeRatingChanged ||
          typingChanged ||
          refreshedPinnedProductChanged) {
        setState(() {
          _messages = nextMessages;
          _supportReadAt = effectiveRefreshedThread.supportReadAt;
          _employeeTyping = effectiveRefreshedThread.employeeTyping;
          _employeeRating = effectiveRefreshedThread.employeeRating;
          _employeeRatingComment =
              effectiveRefreshedThread.employeeRatingComment;
          _employeeRatingUpdatedAt =
              effectiveRefreshedThread.employeeRatingUpdatedAt;
          if (refreshedPinnedProduct != null) {
            _pinnedProduct = refreshedPinnedProduct;
          }
          _revealLatestMessageFrom(nextMessages);
        });
        if (hasConversationChanged || typingChanged) {
          _scrollToBottom(jumpOnly: jumpOnly);
        }
      } else if (_supportReadAt != effectiveRefreshedThread.supportReadAt) {
        setState(() {
          _supportReadAt = effectiveRefreshedThread.supportReadAt;
        });
      }

      if (effectiveRefreshedThread.hasUnreadMessage) {
        await ChatSupportStore.instance.markThreadRead(
          _pinnedProductId,
          adminId: _pinnedProduct.adminId,
          readAt: DateTime.now(),
        );
      }
    } finally {
      _isRefreshingFromServer = false;
    }
  }

  void _handleKeyboardVisibility(bool isKeyboardVisible) {
    if (_wasKeyboardVisible == isKeyboardVisible) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      final currentKeyboardVisible =
          MediaQuery.viewInsetsOf(context).bottom > 0;
      if (_wasKeyboardVisible == currentKeyboardVisible) {
        return;
      }

      setState(() {
        _wasKeyboardVisible = currentKeyboardVisible;
        if (currentKeyboardVisible) {
          _isPinnedProductCardVisible = false;
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final screenWidth = MediaQuery.sizeOf(context).width;
    _handleKeyboardVisibility(MediaQuery.viewInsetsOf(context).bottom > 0);
    final primaryColor = theme.colorScheme.primary;
    final headerForegroundColor = theme.colorScheme.onSurface;
    final titleColor = theme.colorScheme.onSurface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final headerSecondaryColor = secondaryColor;
    final homeBackgroundColor = theme.cardColor;
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final isDarkMode = theme.brightness == Brightness.dark;
    final headerBottomShadowColor =
        Colors.black.withOpacity(isDarkMode ? 0.11 : 0.04);
    const preConversationSpacing = 0.0;
    const conversationBottomPadding = 16.0;
    const composerPadding = EdgeInsets.fromLTRB(16, 8, 8, 8);
    final hasEmployeeRating = _employeeRating > 0;
    final currentCustomerLabel = _currentCustomerDisplayName;
    final currentCustomerId = ChatSupportStore.instance.customerId;
    final showsEmployeeTypingIndicator = _showsEmployeeTypingIndicator;
    final typingIndicatorCount = showsEmployeeTypingIndicator ? 1 : 0;
    const selectedStarColor = Color(0xFFFFB11A);

    return Scaffold(
      backgroundColor: homeBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        backgroundColor: surfaceColor,
        foregroundColor: headerForegroundColor,
        titleSpacing: 0,
        actions: [
          if (_showsEmployeeRatingButton)
            IconButton(
              onPressed: _showEmployeeRatingSheet,
              isSelected: hasEmployeeRating,
              tooltip: hasEmployeeRating
                  ? 'Update employee rating'
                  : 'Rate employee',
              selectedIcon: Icon(
                Icons.star,
                color: selectedStarColor,
              ),
              icon: Icon(
                Icons.star_outline_rounded,
                color: headerForegroundColor,
              ),
            ),
        ],
        title: Align(
          alignment: Alignment.centerLeft,
          child: Row(
            mainAxisSize: MainAxisSize.max,
            children: [
              _buildHeaderCompanyAvatar(headerForegroundColor),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _displayCompanyName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.left,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: headerForegroundColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Chat Support',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.left,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: headerSecondaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const ProductOnlineStatusBadge(
                          compact: true,
                          size: 8,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        bottom: true,
        maintainBottomViewPadding: true,
        child: Column(
          children: [
            SizedBox(height: preConversationSpacing),
            AnimatedSwitcher(
              duration: appMotionFrames(14),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                final curvedAnimation = animation.drive(
                  CurveTween(curve: Curves.easeOutCubic),
                );
                return FadeTransition(
                  opacity: curvedAnimation,
                  child: SizeTransition(
                    sizeFactor: curvedAnimation,
                    axisAlignment: -1,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, -0.14),
                        end: Offset.zero,
                      ).animate(curvedAnimation),
                      child: child,
                    ),
                  ),
                );
              },
              child: _isPinnedProductCardVisible
                  ? _ChatSupportPinnedProductCard(
                      key: ValueKey<String>(
                        'pinned-product-${_pinnedProductId.trim()}',
                      ),
                      product: _pinnedProduct,
                      primaryColor: primaryColor,
                      backgroundColor: surfaceColor,
                    )
                  : const SizedBox.shrink(
                      key: ValueKey<String>('hidden-pinned-product'),
                    ),
            ),
            Expanded(
              child: IgnorePointer(
                ignoring: !_isConversationViewportReady,
                child: Opacity(
                  opacity: _isConversationViewportReady ? 1 : 0,
                  child: Stack(
                    children: [
                      ListView.separated(
                        controller: _scrollController,
                        reverse: true,
                        padding: EdgeInsets.fromLTRB(
                          16,
                          0,
                          16,
                          conversationBottomPadding,
                        ),
                        itemCount:
                            _effectiveVisibleMessageCount +
                            (_hasHiddenOlderMessages ? 1 : 0) +
                            typingIndicatorCount,
                        separatorBuilder: (_, index) {
                          if (showsEmployeeTypingIndicator && index == 0) {
                            return const SizedBox(height: 8);
                          }

                          return SizedBox(
                            height: _conversationMessageGapForDisplayIndex(
                              index - typingIndicatorCount,
                            ),
                          );
                        },
                        itemBuilder: (context, index) {
                          if (showsEmployeeTypingIndicator && index == 0) {
                            return _ChatSupportTypingIndicator(
                              primaryColor: primaryColor,
                              supportBubbleColor: surfaceColor,
                              secondaryColor: secondaryColor,
                            );
                          }

                          final messageDisplayIndex =
                              index - typingIndicatorCount;
                          if (
                              _hasHiddenOlderMessages &&
                              messageDisplayIndex == _effectiveVisibleMessageCount
                          ) {
                            return _buildOlderMessagesLoader(secondaryColor);
                          }

                          final chronologicalMessageIndex =
                              _messages.length - 1 - messageDisplayIndex;
                          final message = _messages[chronologicalMessageIndex];
                          final showCenteredTimestamp = _shouldShowCenteredTimestamp(
                            chronologicalMessageIndex,
                          );
                          final latestUserMessageId = _latestUserMessageId;
                          final latestSeenUserMessageId = _latestSeenUserMessageId;
                          final isSeen =
                              !message.isFromSupport &&
                              !message.isDeleted &&
                              message.id == latestSeenUserMessageId;
                          final isSent =
                              !message.isFromSupport &&
                              !message.isDeleted &&
                              message.id == latestUserMessageId &&
                              message.isSentToServer &&
                              message.id != latestSeenUserMessageId &&
                              !isSeen;
                          final showMetadata = _revealedMessageId == message.id;
                          final nextChronologicalMessage =
                              chronologicalMessageIndex < _messages.length - 1
                                  ? _messages[chronologicalMessageIndex + 1]
                                  : null;
                          final startsNewSupportTimeGroup =
                              message.isFromSupport &&
                              nextChronologicalMessage != null &&
                              nextChronologicalMessage.isFromSupport &&
                              _hasCenteredTimestampGapBetweenMessages(
                                message,
                                nextChronologicalMessage,
                              );
                          final showSupportProfile =
                              message.isFromSupport &&
                              (nextChronologicalMessage == null ||
                                  !nextChronologicalMessage.isFromSupport ||
                                  startsNewSupportTimeGroup ||
                                  message.isEdited ||
                                  showCenteredTimestamp ||
                                  showMetadata);
                          if (message.isPinProductIndicator) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (showCenteredTimestamp) ...[
                                  _ChatSupportCenteredTimestamp(
                                    label: _formatTimeAndDate(message.timestamp),
                                    secondaryColor: secondaryColor,
                                  ),
                                  const SizedBox(height: 16),
                                ],
                                _ChatSupportCenteredPinIndicator(
                                  customerLabel: currentCustomerLabel,
                                  productName: message.text,
                                  primaryColor: primaryColor,
                                ),
                              ],
                            );
                          }
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (showCenteredTimestamp) ...[
                                _ChatSupportCenteredTimestamp(
                                  label: _formatTimeAndDate(message.timestamp),
                                  secondaryColor: secondaryColor,
                                ),
                                const SizedBox(height: 16),
                              ],
                              _ChatSupportBubble(
                                key: _messageKeyFor(message.id),
                                message: message,
                                primaryColor: primaryColor,
                                supportBubbleColor: surfaceColor,
                                titleColor: titleColor,
                                secondaryColor: secondaryColor,
                                currentCustomerLabel: currentCustomerLabel,
                                currentCustomerId: currentCustomerId,
                                timeLabel: _formatTimeAndDate(message.timestamp),
                                statusLabel: isSent ? 'Sent' : null,
                                showSeenAvatar: isSeen,
                                showSupportProfile: showSupportProfile,
                                showMetadata: showMetadata,
                                isReplyJumpTarget:
                                    _replyJumpTargetMessageId == message.id,
                                onTap: () => _toggleMessageDetails(message.id),
                                onLongPressStart:
                                    (details) => _handleBubbleLongPress(
                                      message,
                                      details.globalPosition,
                                    ),
                                onReplyTap: () => _setPendingReply(message),
                                onReplyPreviewTap: message.replyTo == null
                                    ? null
                                    : () => _jumpToRepliedMessage(
                                          message.replyTo!.messageId,
                                        ),
                              ),
                            ],
                          );
                        },
                      ),
                      Positioned(
                        top: 0,
                        right: 8,
                        child: _ChatSupportPinnedProductToggleBadge(
                          isExpanded: _isPinnedProductCardVisible,
                          primaryColor: primaryColor,
                          headerColor: surfaceColor,
                          foregroundColor: titleColor,
                          onTap: () {
                            setState(() {
                              _isPinnedProductCardVisible =
                                  !_isPinnedProductCardVisible;
                            });
                          },
                        ),
                      ),
                      _buildScrollToLatestButton(
                        primaryColor: primaryColor,
                        foregroundColor: theme.colorScheme.onPrimary,
                      ),
                      Positioned(
                        top: 0,
                        left: 0,
                        right: 0,
                        child: IgnorePointer(
                          child: Container(
                            height: 7,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  headerBottomShadowColor,
                                  Colors.transparent,
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Container(
              padding: composerPadding,
              decoration: BoxDecoration(
                color: surfaceColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 14,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_editingMessage != null) ...[
                      _ChatSupportComposerEditBanner(
                        previewText: _editingMessage!.text,
                        primaryColor: primaryColor,
                        titleColor: titleColor,
                        secondaryColor: secondaryColor,
                        onClear: () => _clearEditingMessage(),
                      ),
                      const SizedBox(height: 8),
                    ] else if (_pendingReply != null) ...[
                      _ChatSupportComposerReplyBanner(
                        displaySenderLabel: _pendingReply!.displaySenderLabel,
                        previewText: _pendingReply!.reference.previewText,
                        primaryColor: primaryColor,
                        titleColor: titleColor,
                        secondaryColor: secondaryColor,
                        onClear: _clearPendingReply,
                      ),
                      const SizedBox(height: 8),
                    ],
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _messageController,
                          focusNode: _messageFocusNode,
                          textInputAction: TextInputAction.send,
                          onChanged: _handleComposerTextChanged,
                          onSubmitted: (_) => _handleComposerPrimaryAction(),
                          minLines: 1,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText:
                                _editingMessage != null
                                    ? 'Edit your message...'
                                    : 'Type your message...',
                            isDense: true,
                            filled: true,
                            fillColor: theme.cardColor,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(
                                _chatSupportBorderRadius,
                              ),
                              borderSide: BorderSide.none,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(
                                _chatSupportBorderRadius,
                              ),
                              borderSide: BorderSide.none,
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(
                                _chatSupportBorderRadius,
                              ),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 2),
                      IconButton(
                        onPressed: _handleEmojiTap,
                        tooltip: 'Emoji',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 36,
                          minHeight: 36,
                        ),
                        icon: Icon(
                          Icons.emoji_emotions_outlined,
                          color: secondaryColor,
                          size: 30,
                        ),
                      ),
                      const SizedBox(width: 0),
                      IconButton(
                        onPressed: _handleProductPinTap,
                        tooltip: 'Pin product',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 36,
                          minHeight: 36,
                        ),
                        icon: Icon(
                          Icons.add_circle_outline_rounded,
                          color: primaryColor,
                          size: 30,
                        ),
                      ),
                      const SizedBox(width: 0),
                      ValueListenableBuilder<TextEditingValue>(
                         valueListenable: _messageController,
                         builder: (context, value, _) {
                           final isEditingMessage = _editingMessage != null;
                           final hasTypedMessage = value.text.trim().isNotEmpty;
                           if (!hasTypedMessage &&
                               !isEditingMessage &&
                               !_isUploadingPhoto) {
                             return const SizedBox.shrink();
                           }
                           return IconButton(
                             onPressed: hasTypedMessage
                                 ? _handleComposerPrimaryAction
                                 : (isEditingMessage
                                       ? () => _clearEditingMessage()
                                       : null),
                             tooltip: hasTypedMessage
                                 ? (isEditingMessage
                                       ? 'Save edit'
                                       : 'Send message')
                                 : (isEditingMessage ? 'Cancel edit' : 'Send'),
                             padding: EdgeInsets.zero,
                             constraints: const BoxConstraints(
                               minWidth: 36,
                              minHeight: 36,
                            ),
                            icon: !hasTypedMessage && _isUploadingPhoto
                                ? SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.2,
                                      valueColor:
                                          AlwaysStoppedAnimation<Color>(
                                        primaryColor,
                                      ),
                                    ),
                                  )
                                 : Icon(
                                    hasTypedMessage
                                        ? (isEditingMessage
                                              ? Icons.check_rounded
                                              : Icons.send_rounded)
                                        : (isEditingMessage
                                              ? Icons.close_rounded
                                              : Icons.add_circle_outline_rounded),
                                    color: primaryColor,
                                    size: 30,
                                  ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatSupportProductCard extends StatelessWidget {
  const _ChatSupportProductCard({
    required this.product,
    required this.productName,
    required this.formattedPrice,
    required this.formattedOriginalPrice,
    required this.hasSalesPrice,
    required this.discountPercent,
    required this.showsTopBrand,
    required this.showsTopReviews,
    required this.primaryColor,
    required this.secondaryColor,
    required this.surfaceColor,
  });

  final Product product;
  final String productName;
  final String formattedPrice;
  final String formattedOriginalPrice;
  final bool hasSalesPrice;
  final int? discountPercent;
  final bool showsTopBrand;
  final bool showsTopReviews;
  final Color primaryColor;
  final Color secondaryColor;
  final Color surfaceColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
      ),
      clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            SizedBox(
              width: 94,
              height: 94,
              child: OverflowBox(
                alignment: Alignment.centerRight,
                minWidth: 94,
                maxWidth: 108,
                minHeight: 94,
                maxHeight: 94,
                child: Transform.translate(
                  offset: const Offset(6, 0),
                  child: SizedBox(
                    width: 88,
                    height: 88,
                    child: ClipOval(
                      child: product.imageUrl.trim().isNotEmpty
                          ? Image.network(
                              product.imageUrl,
                              key: ValueKey(product.imageUrl),
                              fit: BoxFit.cover,
                              gaplessPlayback: true,
                              cacheWidth: 176,
                              cacheHeight: 176,
                              errorBuilder: (context, error, stackTrace) {
                                return _ChatSupportImageFallback(
                                  primaryColor: primaryColor,
                                  label: productName,
                                );
                              },
                            )
                          : _ChatSupportImageFallback(
                              primaryColor: primaryColor,
                              label: productName,
                            ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: FittedBox(
                      alignment: Alignment.centerLeft,
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (discountPercent != null) ...[
                            _ChatSupportProductChip(
                              icon: Icons.local_offer_outlined,
                              label: '-$discountPercent%',
                              color: const Color(0xFFC62828),
                              backgroundColor: const Color(0xFFD32F2F),
                              labelColor: Colors.white,
                              iconColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              borderRadius: BorderRadius.circular(8),
                              labelStyle: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 9,
                              ),
                            ),
                          ],
                          if (showsTopBrand) ...[
                            if (discountPercent != null)
                              const SizedBox(width: 6),
                            _ChatSupportProductChip(
                              icon: Icons.workspace_premium_outlined,
                              label: 'Top Selling',
                              color: const Color.fromARGB(255, 15, 194, 176),
                              backgroundColor: const Color.fromARGB(
                                255,
                                15,
                                194,
                                176,
                              ),
                              labelColor: Colors.white,
                              iconColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              borderRadius: BorderRadius.circular(8),
                              labelStyle: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 9,
                              ),
                            ),
                          ],
                          if (showsTopReviews) ...[
                            if (discountPercent != null || showsTopBrand)
                              const SizedBox(width: 6),
                            _ChatSupportProductChip(
                              icon: Icons.star_outline_rounded,
                              label: 'Top Rating',
                              color: const Color(0xFFF9A825),
                              backgroundColor: const Color(0xFFF9A825),
                              labelColor: Colors.white,
                              iconColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              borderRadius: BorderRadius.circular(8),
                              labelStyle: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 9,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    productName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FittedBox(
                      alignment: Alignment.centerLeft,
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            formattedPrice,
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: primaryColor,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (hasSalesPrice) ...[
                            const SizedBox(width: 8),
                            Text(
                              formattedOriginalPrice,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: secondaryColor,
                                decoration: TextDecoration.lineThrough,
                                fontWeight: FontWeight.w700,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.local_fire_department_outlined,
                        size: 14,
                        color: secondaryColor,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${_formatChatSupportSoldCount(product.sold)} sold',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: secondaryColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatSupportStaticLottiePreview extends StatefulWidget {
  const _ChatSupportStaticLottiePreview({
    required this.assetPath,
    this.progress = 0,
  });

  final String assetPath;
  final double progress;

  @override
  State<_ChatSupportStaticLottiePreview> createState() =>
      _ChatSupportStaticLottiePreviewState();
}

class _ChatSupportStaticLottiePreviewState
    extends State<_ChatSupportStaticLottiePreview>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      value: widget.progress.clamp(0.0, 1.0).toDouble(),
    );
  }

  @override
  void didUpdateWidget(covariant _ChatSupportStaticLottiePreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.progress != widget.progress) {
      _controller.value = widget.progress.clamp(0.0, 1.0).toDouble();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Lottie.asset(
      widget.assetPath,
      frameRate: appLottieFrameRate,
      controller: _controller,
      onLoaded: (_) {
        _controller.value = widget.progress.clamp(0.0, 1.0).toDouble();
      },
      repeat: false,
      animate: false,
      fit: BoxFit.contain,
    );
  }
}

class _ChatSupportProductChip extends StatelessWidget {
  const _ChatSupportProductChip({
    required this.label,
    required this.color,
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.iconColor,
    this.padding,
    this.borderRadius,
    this.labelStyle,
  });

  final IconData? icon;
  final String label;
  final Color color;
  final Color? backgroundColor;
  final Color? labelColor;
  final Color? iconColor;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    final resolvedBackgroundColor = backgroundColor ?? color.withOpacity(0.1);
    final resolvedLabelColor = labelColor ?? color;
    final resolvedIconColor = iconColor ?? resolvedLabelColor;
    final resolvedLabelStyle =
        (Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: resolvedLabelColor,
                  fontWeight: FontWeight.w700,
                ) ??
                TextStyle(
                  color: resolvedLabelColor,
                  fontWeight: FontWeight.w700,
                ))
            .merge(labelStyle)
            .copyWith(color: resolvedLabelColor);

    return Container(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: resolvedBackgroundColor,
        borderRadius: borderRadius ?? BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: resolvedIconColor),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: resolvedLabelStyle,
          ),
        ],
      ),
    );
  }
}

class _ChatSupportComposerReplyBanner extends StatelessWidget {
  const _ChatSupportComposerReplyBanner({
    required this.displaySenderLabel,
    required this.previewText,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onClear,
  });

  final String displaySenderLabel;
  final String previewText;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final replyingLabel = displaySenderLabel == 'You'
        ? 'Replying to yourself'
        : 'Replying to $displaySenderLabel';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: primaryColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
        border: Border.all(color: primaryColor.withOpacity(0.12)),
      ),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 34,
            decoration: BoxDecoration(
              color: primaryColor,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  replyingLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  previewText,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onClear,
            tooltip: 'Cancel reply',
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(
              minWidth: 32,
              minHeight: 32,
            ),
            icon: Icon(
              Icons.close_rounded,
              color: secondaryColor,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatSupportComposerEditBanner extends StatelessWidget {
  const _ChatSupportComposerEditBanner({
    required this.previewText,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onClear,
  });

  final String previewText;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: primaryColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
        border: Border.all(color: primaryColor.withOpacity(0.12)),
      ),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 34,
            decoration: BoxDecoration(
              color: primaryColor,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Editing your message',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  previewText,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onClear,
            tooltip: 'Cancel edit',
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(
              minWidth: 32,
              minHeight: 32,
            ),
            icon: Icon(
              Icons.close_rounded,
              color: secondaryColor,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatSupportSwipeReplyWrapper extends StatefulWidget {
  const _ChatSupportSwipeReplyWrapper({
    required this.child,
    required this.isSupport,
    required this.hintColor,
    this.onReplyTap,
  });

  final Widget child;
  final bool isSupport;
  final Color hintColor;
  final VoidCallback? onReplyTap;

  @override
  State<_ChatSupportSwipeReplyWrapper> createState() =>
      _ChatSupportSwipeReplyWrapperState();
}

class _ChatSupportSwipeReplyWrapperState
    extends State<_ChatSupportSwipeReplyWrapper> {
  static const double _maxSwipeOffset = 82;
  static const double _replyTriggerDistance = 62;

  double _dragOffset = 0;

  void _handleHorizontalDragUpdate(DragUpdateDetails details) {
    if (widget.onReplyTap == null) {
      return;
    }

    final delta = details.primaryDelta ?? 0;
    if (widget.isSupport) {
      final nextOffset =
          (_dragOffset + delta).clamp(0.0, _maxSwipeOffset).toDouble();
      if (nextOffset != _dragOffset) {
        setState(() {
          _dragOffset = nextOffset;
        });
      }
      return;
    }

    final nextOffset =
        (_dragOffset + delta).clamp(-_maxSwipeOffset, 0.0).toDouble();
    if (nextOffset != _dragOffset) {
      setState(() {
        _dragOffset = nextOffset;
      });
    }
  }

  void _handleHorizontalDragEnd([DragEndDetails? details]) {
    if (widget.onReplyTap == null) {
      return;
    }

    final shouldReply =
        widget.isSupport
            ? _dragOffset >= _replyTriggerDistance
            : _dragOffset <= -_replyTriggerDistance;
    if (shouldReply) {
      widget.onReplyTap?.call();
    }

    if (_dragOffset == 0) {
      return;
    }

    setState(() {
      _dragOffset = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_dragOffset.abs() / _maxSwipeOffset).clamp(0.0, 1.0);
    final hintAlignment =
        widget.isSupport ? Alignment.centerLeft : Alignment.centerRight;
    final hintPadding =
        widget.isSupport
            ? const EdgeInsets.only(left: 8)
            : const EdgeInsets.only(right: 8);

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragUpdate: _handleHorizontalDragUpdate,
      onHorizontalDragEnd: _handleHorizontalDragEnd,
      onHorizontalDragCancel: () => _handleHorizontalDragEnd(),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: hintAlignment,
              child: Padding(
                padding: hintPadding,
                child: Opacity(
                  opacity: progress,
                  child: Icon(
                    Icons.reply_rounded,
                    size: 18,
                    color: widget.hintColor,
                  ),
                ),
              ),
            ),
          ),
          Transform.translate(
            offset: Offset(_dragOffset, 0),
            child: widget.child,
          ),
        ],
      ),
    );
  }
}

class _ChatSupportTypingIndicator extends StatelessWidget {
  const _ChatSupportTypingIndicator({
    required this.primaryColor,
    required this.supportBubbleColor,
    required this.secondaryColor,
  });

  final Color primaryColor;
  final Color supportBubbleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 7),
            child: Transform.translate(
              offset: const Offset(-8, 0),
              child: _ChatSupportEmployeeAvatar(
                size: 28,
                primaryColor: primaryColor,
              ),
            ),
          ),
          Semantics(
            label: 'Employee is typing',
            liveRegion: true,
            child: Container(
              height: 36,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: supportBubbleColor,
                borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: _ChatSupportTypingDots(
                dotColor: secondaryColor,
                activeDotColor: primaryColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatSupportTypingDots extends StatefulWidget {
  const _ChatSupportTypingDots({
    required this.dotColor,
    required this.activeDotColor,
  });

  final Color dotColor;
  final Color activeDotColor;

  @override
  State<_ChatSupportTypingDots> createState() => _ChatSupportTypingDotsState();
}

class _ChatSupportTypingDotsState extends State<_ChatSupportTypingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1050),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double _dotProgress(int index) {
    final shiftedValue = (_controller.value - (index * 0.16)) % 1.0;
    if (shiftedValue < 0.5) {
      return shiftedValue / 0.5;
    }
    return (1 - shiftedValue) / 0.5;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: List<Widget>.generate(3, (index) {
            final progress = _dotProgress(index).clamp(0.0, 1.0);
            final color = Color.lerp(
              widget.dotColor.withOpacity(0.56),
              widget.activeDotColor,
              progress,
            )!;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.5),
              child: Transform.translate(
                offset: Offset(0, -3 * progress),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _ChatSupportPinnedProductToggleBadge extends StatelessWidget {
  const _ChatSupportPinnedProductToggleBadge({
    required this.isExpanded,
    required this.primaryColor,
    required this.headerColor,
    required this.foregroundColor,
    required this.onTap,
  });

  final bool isExpanded;
  final Color primaryColor;
  final Color headerColor;
  final Color foregroundColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backgroundColor = headerColor;
    final iconColor = isExpanded ? primaryColor : foregroundColor;
    const borderRadius = BorderRadius.only(
      bottomLeft: Radius.circular(8),
      bottomRight: Radius.circular(8),
    );
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: borderRadius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.14),
              blurRadius: 8,
              spreadRadius: 0,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: SizedBox(
          width: 36,
          height: 28,
          child: Center(
            child: Icon(
              isExpanded
                  ? Icons.keyboard_arrow_up_rounded
                  : Icons.keyboard_arrow_down_rounded,
              color: iconColor,
              size: 24,
            ),
          ),
        ),
      ),
    );
  }
}

class _ChatSupportPinnedProductCard extends StatelessWidget {
  const _ChatSupportPinnedProductCard({
    super.key,
    required this.product,
    required this.primaryColor,
    required this.backgroundColor,
  });

  final Product product;
  final Color primaryColor;
  final Color backgroundColor;

  String get _productName {
    final trimmedName = product.name.trim();
    return trimmedName.isEmpty ? 'Unnamed Product' : trimmedName;
  }

  String get _categoryLabel {
    final trimmedCategory = product.category.trim();
    return trimmedCategory.isEmpty ? 'No category' : trimmedCategory;
  }

  String get _priceLabel {
    final salesPrice = product.salesPrice;
    final displayPrice = salesPrice != null &&
            salesPrice >= 0 &&
            product.originalPrice > 0 &&
            salesPrice < product.originalPrice
        ? salesPrice
        : product.originalPrice;
    if (displayPrice <= 0) {
      return 'Price unavailable';
    }
    return formatPesoCurrency(displayPrice);
  }

  bool get _hasOriginalPriceLabel {
    final salesPrice = product.salesPrice;
    return salesPrice != null &&
        salesPrice >= 0 &&
        product.originalPrice > 0 &&
        salesPrice < product.originalPrice;
  }

  String get _originalPriceLabel {
    if (product.originalPrice <= 0) {
      return '';
    }
    return formatPesoCurrency(product.originalPrice);
  }

  String get _ratingLabel {
    if (product.rating <= 0) {
      return 'No rating yet';
    }
    final rating = product.rating.toStringAsFixed(
      product.rating.truncateToDouble() == product.rating ? 0 : 1,
    );
    return '$rating rating';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final imageUrl = product.imageUrl.trim();
    final foregroundColor = theme.colorScheme.onSurface;
    final mutedForegroundColor = theme.colorScheme.onSurfaceVariant;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
            children: [
              SizedBox(
                width: 58,
                height: 58,
                child: ClipRRect(
                  borderRadius: const BorderRadius.all(Radius.circular(4)),
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          key: ValueKey(imageUrl),
                          fit: BoxFit.cover,
                          gaplessPlayback: true,
                          cacheWidth: 116,
                          cacheHeight: 116,
                          errorBuilder: (context, error, stackTrace) {
                            return _ChatSupportImageFallback(
                              primaryColor: primaryColor,
                              label: _productName,
                            );
                          },
                        )
                      : _ChatSupportImageFallback(
                          primaryColor: primaryColor,
                          label: _productName,
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _categoryLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: mutedForegroundColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(
                          Icons.push_pin_rounded,
                          color: primaryColor,
                          size: 15,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _productName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleSmall?.copyWith(
                              color: foregroundColor,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 8,
                      runSpacing: 3,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          _priceLabel,
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: primaryColor,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (_hasOriginalPriceLabel)
                          Text(
                            _originalPriceLabel,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: mutedForegroundColor,
                              decoration: TextDecoration.lineThrough,
                              decorationColor: mutedForegroundColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.star_rounded,
                              color: const Color(0xFFFFB11A),
                              size: 14,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              _ratingLabel,
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: mutedForegroundColor,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        if (!_hasOriginalPriceLabel &&
                            _originalPriceLabel.isNotEmpty &&
                            _originalPriceLabel != _priceLabel)
                          Text(
                            _originalPriceLabel,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: mutedForegroundColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
      ),
    );
  }
}

class _ChatSupportProductPinSheet extends StatelessWidget {
  const _ChatSupportProductPinSheet({
    required this.productsFuture,
    required this.selectedProductId,
    required this.adminIdFilter,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
  });

  final Future<List<Product>> productsFuture;
  final String selectedProductId;
  final String adminIdFilter;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final normalizedSelectedId = selectedProductId.trim().toLowerCase();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Row(
            children: [
              Icon(
                Icons.push_pin_rounded,
                color: primaryColor,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Pin product',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<Product>>(
            future: productsFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                  ),
                );
              }

              if (snapshot.hasError) {
                return _ChatSupportProductPinEmptyState(
                  icon: Icons.cloud_off_outlined,
                  title: 'Unable to load products',
                  message: 'Please try again in a moment.',
                  primaryColor: primaryColor,
                  secondaryColor: secondaryColor,
                );
              }

              final products = (snapshot.data ?? const <Product>[])
                  .where(_isChatSupportPinnableProduct)
                  .toList(growable: false);

              final normalizedAdminId = adminIdFilter.trim().toLowerCase();
              final filteredByAdmin = normalizedAdminId.isNotEmpty
                  ? products
                      .where(
                        (product) =>
                            product.adminId.trim().toLowerCase() ==
                            normalizedAdminId,
                      )
                      .toList(growable: false)
                  : products;

              final sortedProducts = List<Product>.from(filteredByAdmin)
                ..sort((first, second) {
                  return _chatSupportProductDisplayName(first)
                      .toLowerCase()
                      .compareTo(
                        _chatSupportProductDisplayName(second).toLowerCase(),
                      );
                });

              if (sortedProducts.isEmpty) {
                return _ChatSupportProductPinEmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: normalizedAdminId.isNotEmpty
                      ? 'No products from this seller'
                      : 'No products available',
                  message: normalizedAdminId.isNotEmpty
                      ? 'No products available for this chat seller.'
                      : 'No products are available to pin right now.',
                  primaryColor: primaryColor,
                  secondaryColor: secondaryColor,
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                itemCount: sortedProducts.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final product = sortedProducts[index];
                  final isSelected =
                      product.id.trim().toLowerCase() == normalizedSelectedId;
                  return _ChatSupportProductPinTile(
                    product: product,
                    isSelected: isSelected,
                    primaryColor: primaryColor,
                    titleColor: titleColor,
                    secondaryColor: secondaryColor,
                    surfaceColor: surfaceColor,
                    onTap: () => Navigator.of(context).pop(product),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ChatSupportProductPinTile extends StatelessWidget {
  const _ChatSupportProductPinTile({
    required this.product,
    required this.isSelected,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
    required this.onTap,
  });

  final Product product;
  final bool isSelected;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final productName = _chatSupportProductDisplayName(product);
    final imageUrl = product.imageUrl.trim();
    final categoryLabel = product.categoryLabel.trim().isEmpty
        ? 'Uncategorized'
        : product.categoryLabel.trim();

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isSelected ? primaryColor.withOpacity(0.08) : surfaceColor,
        borderRadius: const BorderRadius.all(Radius.circular(8)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: ClipRRect(
              borderRadius: const BorderRadius.all(Radius.circular(4)),
              child: imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      key: ValueKey(imageUrl),
                      fit: BoxFit.cover,
                      gaplessPlayback: true,
                      cacheWidth: 112,
                      cacheHeight: 112,
                      errorBuilder: (context, error, stackTrace) {
                        return _ChatSupportImageFallback(
                          primaryColor: primaryColor,
                          label: productName,
                        );
                      },
                    )
                  : _ChatSupportImageFallback(
                      primaryColor: primaryColor,
                      label: productName,
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  productName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  categoryLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _chatSupportProductPriceLabel(product),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: primaryColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: OutlinedButton(
                    onPressed: onTap,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 30),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      side: BorderSide(color: primaryColor.withOpacity(0.55)),
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.all(Radius.circular(4)),
                      ),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                    child: Text(
                      'Pin',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: primaryColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatSupportProductPinEmptyState extends StatelessWidget {
  const _ChatSupportProductPinEmptyState({
    required this.icon,
    required this.title,
    required this.message,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: primaryColor,
              size: 34,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: secondaryColor,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatSupportBubble extends StatelessWidget {
  const _ChatSupportBubble({
    super.key,
    required this.message,
    required this.primaryColor,
    required this.supportBubbleColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.currentCustomerLabel,
    required this.currentCustomerId,
    required this.timeLabel,
    required this.showMetadata,
    required this.onTap,
    required this.onLongPressStart,
    this.statusLabel,
    this.showSeenAvatar = false,
    this.showSupportProfile = true,
    this.onReplyTap,
    this.onReplyPreviewTap,
    this.isReplyJumpTarget = false,
  });

  final ChatSupportStoredMessage message;
  final Color primaryColor;
  final Color supportBubbleColor;
  final Color titleColor;
  final Color secondaryColor;
  final String currentCustomerLabel;
  final String currentCustomerId;
  final String timeLabel;
  final bool showMetadata;
  final VoidCallback onTap;
  final GestureLongPressStartCallback onLongPressStart;
  final String? statusLabel;
  final bool showSeenAvatar;
  final bool showSupportProfile;
  final VoidCallback? onReplyTap;
  final VoidCallback? onReplyPreviewTap;
  final bool isReplyJumpTarget;

  void _openMediaPreview(BuildContext context) {
    if (!message.hasMedia) {
      return;
    }

    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withOpacity(0.94),
      builder: (dialogContext) {
        return _ChatSupportMediaPreviewDialog(
          message: message,
          primaryColor: primaryColor,
          secondaryColor: secondaryColor,
          qualityLabel: _shouldRenderAgedUserMedia(message) ? '720p' : null,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSupport = message.isFromSupport;
    final isAi = message.isAi;
    final isDeleted = message.isDeleted;
    final isAgedUserMedia = _shouldRenderAgedUserMedia(message);
    final isQuickTapHeart = _isQuickTapHeartMessage(message);
    final isEmojiOnlyMessage = _isEmojiOnlyMessage(message);
    final animatedEmojiOption = isEmojiOnlyMessage
        ? _findChatSupportEmojiOption(
            message.text,
            _ChatSupportPageState._chooserEmojiOptions,
          )
        : null;
    final hasMediaContent = !isDeleted && (message.hasImage || message.hasVideo);
    final hasStatusLabel = (statusLabel ?? '').trim().isNotEmpty;
    final hasStatusIndicator = !isDeleted && (hasStatusLabel || showSeenAvatar);
    final hasReplyPreview = !isDeleted && message.replyTo != null;
    final isDarkMode = theme.brightness == Brightness.dark;
    final deletedBubbleColor = theme.colorScheme.surfaceContainerHighest;
    final deletedForegroundColor = theme.colorScheme.onSurfaceVariant;
    final supportMessageBubbleColor =
        isDarkMode ? supportBubbleColor : _chatSupportLightBubbleBackgroundColor;
    final userBubbleColor =
        isDarkMode ? primaryColor : _chatSupportLightBubbleBackgroundColor;
    final bubbleColor = isDeleted
        ? deletedBubbleColor
        : (isSupport ? supportMessageBubbleColor : userBubbleColor);
    final foregroundColor = isDeleted
        ? deletedForegroundColor
        : (isSupport
            ? titleColor
            : (isDarkMode ? theme.cardColor : titleColor));
    final deletedPlaceholderText = isSupport
        ? 'Message deleted'
        : 'You deleted a message';
    final replyLineLabel = _buildReplyLineLabel(
      message,
      currentCustomerLabel: currentCustomerLabel,
      currentCustomerId: currentCustomerId,
    );
    final screenWidth = MediaQuery.sizeOf(context).width;
    final supportBubbleBaseWidth = screenWidth > 64 ? screenWidth - 64 : 0.0;
    final supportBubbleMaxWidth = supportBubbleBaseWidth * 0.68;
    final userBubbleMaxWidth = screenWidth * 0.75;
    final bubbleMaxWidth = isSupport ? supportBubbleMaxWidth : userBubbleMaxWidth;
    final messageRowMaxWidth = screenWidth > 32 ? screenWidth - 32 : 0.0;
    final replyPreviewColor = theme.colorScheme.surfaceContainerHighest
        .withOpacity(isDarkMode ? 0.82 : 0.92);
    final replyPreviewTextColor = titleColor;
    final replyLabelColor = secondaryColor;
    final editedIndicatorColor = primaryColor;
    final replyPreviewMaxWidth = bubbleMaxWidth;
    final replyPreviewThreadedTopInset = 34.0;
    const replyPreviewBottomGap = 8.0;
    final shouldShowEditedIndicatorInReplyLine =
        !isDeleted && message.isEdited && hasReplyPreview && replyLineLabel.isNotEmpty;
    final shouldShowEditedIndicatorInBubble =
        !isDeleted && message.isEdited && !shouldShowEditedIndicatorInReplyLine;
    final replyLineTextMaxWidth =
        shouldShowEditedIndicatorInReplyLine
            ? bubbleMaxWidth * 0.58
            : bubbleMaxWidth * 0.72;
    final shouldThreadReplyPreview =
        hasReplyPreview &&
        replyLineLabel.isNotEmpty &&
        !isAi &&
        !message.hasMedia &&
        !isQuickTapHeart &&
        !isEmojiOnlyMessage &&
        message.text.trim().isNotEmpty;

    Widget buildReplyPreviewBubble() {
      final previewChild = ConstrainedBox(
        constraints: BoxConstraints(maxWidth: replyPreviewMaxWidth),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: replyPreviewColor,
            borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
          ),
          child: Transform.translate(
            offset: const Offset(0, -0),
            child: Text(
              message.replyTo!.previewText,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: replyPreviewTextColor,
                height: 1.45,
              ),
            ),
          ),
        ),
      );

      if (onReplyPreviewTap == null) {
        return previewChild;
      }

      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onReplyPreviewTap,
          borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
          child: previewChild,
        ),
      );
    }

    Widget buildEditedBubbleIndicator() {
      return Text(
        'Edited',
        style: theme.textTheme.labelSmall?.copyWith(
          color: editedIndicatorColor,
          fontWeight: FontWeight.w800,
        ),
      );
    }

    Widget buildSeenAvatarIndicator() {
      if (!showSeenAvatar) {
        return const SizedBox.shrink(key: ValueKey<String>('seen-avatar-empty'));
      }

      return TweenAnimationBuilder<double>(
        key: ValueKey<String>('seen-avatar-${message.id}'),
        tween: Tween<double>(begin: 0, end: 1),
        duration: appMotionFrames(28),
        curve: Curves.easeOutCubic,
        builder: (context, value, child) {
          final clampedValue = value.clamp(0.0, 1.0);
          final verticalOffset = -16 * (1 - clampedValue);
          return Opacity(
            opacity: clampedValue,
            child: Transform.translate(
              offset: Offset(0, verticalOffset),
              child: child,
            ),
          );
        },
        child: _ChatSupportEmployeeAvatar(
          size: 14,
          primaryColor: primaryColor,
        ),
      );
    }

    Widget buildMainBubbleStack() {
      return Stack(
        clipBehavior: Clip.none,
        children: [
          if (isDeleted)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.circular(
                  _chatSupportBorderRadius,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.delete_outline_rounded,
                    size: 18,
                    color: foregroundColor,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      deletedPlaceholderText,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: foregroundColor,
                        height: 1.35,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else if (animatedEmojiOption != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
              child: SizedBox(
                width: 42,
                height: 42,
                child: Lottie.asset(
                  animatedEmojiOption.assetPath,
                  frameRate: appLottieFrameRate,
                  repeat: true,
                  fit: BoxFit.contain,
                ),
              ),
            )
          else if (isQuickTapHeart)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Icon(
                Icons.favorite_rounded,
                color: primaryColor,
                size: 30,
              ),
            )
          else if (isEmojiOnlyMessage)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Text(
                message.text.trim(),
                style: theme.textTheme.displaySmall?.copyWith(
                  fontSize: 30,
                  height: 1,
                ),
              ),
            )
          else if (hasMediaContent)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (message.hasImage) ...[
                  GestureDetector(
                    onTap: () => _openMediaPreview(context),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(
                            _chatSupportBorderRadius,
                          ),
                          child: Image.network(
                            message.imageUrl,
                            width: 210,
                            height: 210,
                            fit: BoxFit.cover,
                            cacheWidth: _chatSupportImageCacheWidth,
                            cacheHeight: _chatSupportImageCacheHeight,
                            filterQuality: isAgedUserMedia
                                ? FilterQuality.low
                                : FilterQuality.medium,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 210,
                                height: 210,
                                color:
                                    theme.colorScheme.surfaceContainerHighest,
                                alignment: Alignment.center,
                                child: Icon(
                                  Icons.broken_image_outlined,
                                  color: secondaryColor,
                                  size: 30,
                                ),
                              );
                            },
                          ),
                        ),
                        if (isAgedUserMedia)
                          const Positioned(
                            right: 8,
                            bottom: 8,
                            child: _ChatSupportMediaQualityBadge(
                              label: '720p',
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (message.text.trim().isNotEmpty || isAi)
                    const SizedBox(height: 8),
                ] else if (message.hasVideo) ...[
                  GestureDetector(
                    onTap: () => _openMediaPreview(context),
                    child: Stack(
                      children: [
                        Container(
                          width: 210,
                          height: 140,
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.72),
                            borderRadius: BorderRadius.circular(
                              _chatSupportBorderRadius,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.play_circle_fill_rounded,
                                color: Colors.white.withOpacity(0.92),
                                size: 42,
                              ),
                            ],
                          ),
                        ),
                        if (isAgedUserMedia)
                          const Positioned(
                            right: 8,
                            bottom: 8,
                            child: _ChatSupportMediaQualityBadge(
                              label: '720p',
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (message.text.trim().isNotEmpty || isAi)
                    const SizedBox(height: 8),
                ],
                if (message.text.trim().isNotEmpty || isAi)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: bubbleColor,
                      borderRadius: BorderRadius.circular(
                        _chatSupportBorderRadius,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isAi) ...[
                          Text(
                            'AI Assistant',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: primaryColor,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.2,
                            ),
                          ),
                          if (message.text.trim().isNotEmpty)
                            const SizedBox(height: 6),
                        ],
                        if (message.text.trim().isNotEmpty)
                          Text(
                            message.text,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: foregroundColor,
                              height: 1.45,
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.circular(
                  _chatSupportBorderRadius,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isAi) ...[
                    Text(
                      'AI Assistant',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: primaryColor,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                  ],
                  if (message.text.trim().isNotEmpty)
                    Text(
                      message.text,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: foregroundColor,
                        height: 1.45,
                      ),
                    ),
                ],
              ),
            ),
          if (message.reactionEmoji.trim().isNotEmpty)
            Positioned(
              right: -2,
              bottom: -12,
              child: _ChatSupportReactionChip(
                emoji: message.reactionEmoji,
                alignRight: true,
              ),
            ),
        ],
      );
    }

    Widget buildMainBubbleWithEditedIndicator() {
      final bubbleStack = buildMainBubbleStack();
      if (!shouldShowEditedIndicatorInBubble) {
        return bubbleStack;
      }

      final alignEditedIndicatorLeft = isSupport && !hasReplyPreview;

      return Stack(
        clipBehavior: Clip.none,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: bubbleStack,
          ),
          Positioned(
            top: 0,
            left: alignEditedIndicatorLeft ? 0 : null,
            right: alignEditedIndicatorLeft ? null : 0,
            child: buildEditedBubbleIndicator(),
          ),
        ],
      );
    }

    final bubbleContent = ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: bubbleMaxWidth,
      ),
      child: GestureDetector(
        onTap: onTap,
        onLongPressStart: onLongPressStart,
        behavior: HitTestBehavior.opaque,
        child: Column(
          crossAxisAlignment:
              isSupport ? CrossAxisAlignment.start : CrossAxisAlignment.end,
          children: [
            if (hasReplyPreview && replyLineLabel.isNotEmpty) ...[
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: bubbleMaxWidth),
                child: Row(
                  mainAxisSize: MainAxisSize.max,
                  mainAxisAlignment:
                      isSupport
                          ? MainAxisAlignment.start
                          : MainAxisAlignment.end,
                  children: [
                    Icon(
                      Icons.reply_rounded,
                      size: 14,
                      color: replyLabelColor,
                    ),
                    const SizedBox(width: 4),
                    ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: replyLineTextMaxWidth),
                      child: Text(
                        replyLineLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: isSupport ? TextAlign.start : TextAlign.end,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: replyLabelColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (shouldShowEditedIndicatorInReplyLine) ...[
                      const SizedBox(width: 6),
                      Text(
                        '•',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: primaryColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Edited',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: editedIndicatorColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 4),
            ],
            if (shouldThreadReplyPreview)
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    top: 0,
                    left: isSupport ? 0 : null,
                    right: isSupport ? null : 0,
                    child: buildReplyPreviewBubble(),
                  ),
                  Padding(
                    padding: EdgeInsets.only(top: replyPreviewThreadedTopInset),
                    child: buildMainBubbleStack(),
                  ),
                ],
              )
            else ...[
              if (hasReplyPreview && replyLineLabel.isNotEmpty) ...[
                Align(
                  alignment:
                      isSupport ? Alignment.centerLeft : Alignment.centerRight,
                  child: buildReplyPreviewBubble(),
                ),
                SizedBox(height: replyPreviewBottomGap),
              ],
              buildMainBubbleWithEditedIndicator(),
            ],
            if (message.reactionEmoji.trim().isNotEmpty)
              const SizedBox(height: 16),
            if (!isSupport && showSeenAvatar) ...[
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (showMetadata)
                      Padding(
                        padding: const EdgeInsets.only(right: 9, bottom: 3),
                        child: Text(
                          timeLabel,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: secondaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    buildSeenAvatarIndicator(),
                  ],
                ),
              ),
            ] else if (showMetadata || hasStatusIndicator) ...[
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 2,
                alignment:
                    isSupport ? WrapAlignment.start : WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (showMetadata)
                    Text(
                      timeLabel,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: secondaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  if (showSeenAvatar)
                    buildSeenAvatarIndicator()
                  else if (hasStatusLabel)
                    Text(
                      statusLabel!,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: secondaryColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );

    final highlightedBubbleContent = AnimatedContainer(
      duration: appMotionFrames(14),
      curve: Curves.easeOutCubic,
      padding: isReplyJumpTarget ? const EdgeInsets.all(4) : EdgeInsets.zero,
      decoration: BoxDecoration(
        color: isReplyJumpTarget ? primaryColor.withOpacity(0.08) : null,
        borderRadius: BorderRadius.circular(14),
        border: isReplyJumpTarget
            ? Border.all(color: primaryColor.withOpacity(0.28))
            : null,
      ),
      child: bubbleContent,
    );

    final messageContent =
        isSupport
            ? Transform.translate(
                offset: const Offset(-8, 0),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: messageRowMaxWidth),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (showSupportProfile) ...[
                        Padding(
                          padding: EdgeInsets.only(
                            right: 7,
                            bottom: showMetadata ? 14 : 0,
                          ),
                          child: _ChatSupportEmployeeAvatar(
                              size: 28,
                              primaryColor: primaryColor,
                          ),
                        ),
                      ] else
                        const SizedBox(width: 35),
                      highlightedBubbleContent,
                    ],
                  ),
                ),
              )
            : Transform.translate(
                offset: const Offset(8, 0),
                child: highlightedBubbleContent,
              );

    final swipeReplyContent =
        onReplyTap == null
            ? messageContent
            : _ChatSupportSwipeReplyWrapper(
                isSupport: isSupport,
                hintColor: replyLabelColor,
                onReplyTap: onReplyTap,
                child: messageContent,
              );
    return Align(
      alignment: isSupport ? Alignment.centerLeft : Alignment.centerRight,
      child: swipeReplyContent,
    );
  }
}

class _ChatSupportMediaPreviewDialog extends StatelessWidget {
  const _ChatSupportMediaPreviewDialog({
    required this.message,
    required this.primaryColor,
    required this.secondaryColor,
    this.qualityLabel,
  });

  final ChatSupportStoredMessage message;
  final Color primaryColor;
  final Color secondaryColor;
  final String? qualityLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasQualityLabel = (qualityLabel ?? '').trim().isNotEmpty;

    return Dialog.fullscreen(
      backgroundColor: Colors.black.withOpacity(0.94),
      child: Stack(
        children: [
          Positioned.fill(
            child: Center(
              child: message.hasImage
                  ? InteractiveViewer(
                      minScale: 1,
                      maxScale: 4,
                      child: Stack(
                        children: [
                          Image.network(
                            message.imageUrl,
                            fit: BoxFit.contain,
                            cacheWidth: hasQualityLabel
                                ? _chatSupportImageCacheWidth
                                : null,
                            cacheHeight: hasQualityLabel
                                ? _chatSupportImageCacheHeight
                                : null,
                            filterQuality: hasQualityLabel
                                ? FilterQuality.low
                                : FilterQuality.medium,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 240,
                                height: 240,
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.surfaceContainerHighest,
                                  borderRadius: BorderRadius.circular(
                                    _chatSupportBorderRadius,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Icon(
                                  Icons.broken_image_outlined,
                                  color: secondaryColor,
                                  size: 38,
                                ),
                              );
                            },
                          ),
                          if (hasQualityLabel)
                            Positioned(
                              right: 12,
                              bottom: 12,
                              child: _ChatSupportMediaQualityBadge(
                                label: qualityLabel!,
                              ),
                            ),
                        ],
                      ),
                    )
                  : _ChatSupportFullscreenVideoPlayer(
                      videoUrl: message.imageUrl,
                      videoName: message.imageName,
                      secondaryColor: secondaryColor,
                      qualityLabel: qualityLabel,
                    ),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_ios_new_rounded),
                      color: Colors.white,
                      tooltip: 'Close preview',
                    ),
                    Expanded(
                      child: Text(
                        message.hasVideo
                            ? (message.imageName.trim().isEmpty
                                ? 'Video Preview'
                                : message.imageName)
                            : 'Image Preview',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatSupportFullscreenVideoPlayer extends StatefulWidget {
  const _ChatSupportFullscreenVideoPlayer({
    required this.videoUrl,
    required this.videoName,
    required this.secondaryColor,
    this.qualityLabel,
  });

  final String videoUrl;
  final String videoName;
  final Color secondaryColor;
  final String? qualityLabel;

  @override
  State<_ChatSupportFullscreenVideoPlayer> createState() =>
      _ChatSupportFullscreenVideoPlayerState();
}

class _ChatSupportFullscreenVideoPlayerState
    extends State<_ChatSupportFullscreenVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitializing = true;
  String? _errorText;

  void _handleControllerUpdated() {
    if (!mounted) {
      return;
    }
    setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.videoUrl),
      );
      _controller = controller;
      controller.addListener(_handleControllerUpdated);
      await controller.initialize();
      await controller.setLooping(false);
      await controller.play();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _isInitializing = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isInitializing = false;
        _errorText = 'Unable to play this video.';
      });
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_handleControllerUpdated);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final controller = _controller;
    final hasQualityLabel = (widget.qualityLabel ?? '').trim().isNotEmpty;

    if (_isInitializing) {
      return SizedBox(
        width: MediaQuery.of(context).size.width * 0.82,
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (controller == null || !controller.value.isInitialized) {
      return Container(
        width: MediaQuery.of(context).size.width * 0.82,
        constraints: const BoxConstraints(maxWidth: 360),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.78),
          borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
          border: Border.all(
            color: Colors.white.withOpacity(0.08),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.videocam_off_rounded,
              color: Colors.white.withOpacity(0.92),
              size: 52,
            ),
            const SizedBox(height: 12),
            Text(
              _errorText ?? 'Unable to play this video.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
    }

    final aspectRatio = controller.value.aspectRatio > 0
        ? controller.value.aspectRatio
        : 16 / 9;

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(_chatSupportBorderRadius),
            child: Container(
              color: Colors.black,
              child: AspectRatio(
                aspectRatio: aspectRatio,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    RepaintBoundary(
                      child: VideoPlayer(controller),
                    ),
                    GestureDetector(
                      onTap: () {
                        if (!mounted) {
                          return;
                        }
                        setState(() {
                          if (controller.value.isPlaying) {
                            controller.pause();
                          } else {
                            controller.play();
                          }
                        });
                      },
                      child: Container(
                        color: Colors.transparent,
                        alignment: Alignment.center,
                        child: AnimatedOpacity(
                          opacity: controller.value.isPlaying ? 0.0 : 1.0,
                          duration: appMotionFrames(11),
                          child: Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.45),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 42,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withOpacity(0.76),
                            ],
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (widget.videoName.trim().isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(
                                  widget.videoName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            VideoProgressIndicator(
                              controller,
                              allowScrubbing: true,
                              padding: EdgeInsets.zero,
                              colors: VideoProgressColors(
                                playedColor: Colors.white,
                                bufferedColor: Colors.white.withOpacity(0.28),
                                backgroundColor: Colors.white.withOpacity(0.12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (hasQualityLabel)
            Positioned(
              right: 12,
              bottom: 12,
              child: _ChatSupportMediaQualityBadge(
                label: widget.qualityLabel!,
              ),
            ),
        ],
      ),
    );
  }
}

class _ChatSupportReactionChip extends StatelessWidget {
  const _ChatSupportReactionChip({
    required this.emoji,
    required this.alignRight,
  });

  final String emoji;
  final bool alignRight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: alignRight ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          emoji,
          style: const TextStyle(fontSize: 16, height: 1),
        ),
      ),
    );
  }
}

class _ChatSupportMediaQualityBadge extends StatelessWidget {
  const _ChatSupportMediaQualityBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.72),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ) ??
            const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _ChatSupportCenteredTimestamp extends StatelessWidget {
  const _ChatSupportCenteredTimestamp({
    required this.label,
    required this.secondaryColor,
  });

  final String label;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Center(
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: theme.textTheme.labelSmall?.copyWith(
            color: secondaryColor,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ChatSupportCenteredPinIndicator extends StatelessWidget {
  const _ChatSupportCenteredPinIndicator({
    required this.customerLabel,
    required this.productName,
    required this.primaryColor,
  });

  final String customerLabel;
  final String productName;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final normalizedCustomerLabel =
        customerLabel.trim().isEmpty ? 'Client' : customerLabel.trim();
    final normalizedProductName =
        productName.trim().isEmpty ? 'product' : productName.trim();
    final maxWidth = MediaQuery.sizeOf(context).width - 64;

    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth > 0 ? maxWidth : 240),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.push_pin_rounded,
              size: 13,
              color: primaryColor,
            ),
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                '$normalizedCustomerLabel pinned $normalizedProductName',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.78),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatSupportCompanyAvatar extends StatelessWidget {
  const _ChatSupportCompanyAvatar({
    required this.size,
    required this.primaryColor,
    required this.imageUrl,
    required this.label,
  });

  final double size;
  final Color primaryColor;
  final String imageUrl;
  final String label;

  @override
  Widget build(BuildContext context) {
    final normalizedImageUrl = imageUrl.trim();

    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: _buildImage(normalizedImageUrl),
      ),
    );
  }

  Widget _buildImage(String normalizedImageUrl) {
    if (normalizedImageUrl.isEmpty) {
      return _ChatSupportImageFallback(
        primaryColor: primaryColor,
        label: label,
      );
    }

    // Handle data: URLs (base64)
    if (normalizedImageUrl.startsWith('data:')) {
      try {
        final base64Index = normalizedImageUrl.indexOf('base64,');
        if (base64Index >= 0) {
          final base64String = normalizedImageUrl.substring(base64Index + 7);
          final bytes = base64Decode(base64String);
          final cacheDim = (size * 2).round();
          return Image.memory(
            Uint8List.fromList(bytes),
            key: ValueKey(normalizedImageUrl),
            width: size,
            height: size,
            fit: BoxFit.cover,
            gaplessPlayback: true,
            cacheWidth: cacheDim,
            cacheHeight: cacheDim,
            errorBuilder: (context, error, stackTrace) {
              return _ChatSupportImageFallback(
                primaryColor: primaryColor,
                label: label,
              );
            },
          );
        }
      } catch (_) {}
      return _ChatSupportImageFallback(
        primaryColor: primaryColor,
        label: label,
      );
    }

    // Regular HTTP/HTTPS URLs
    final cacheDim = (size * 2).round();
    return Image.network(
      normalizedImageUrl,
      key: ValueKey(normalizedImageUrl),
      width: size,
      height: size,
      fit: BoxFit.cover,
      gaplessPlayback: true,
      cacheWidth: cacheDim,
      cacheHeight: cacheDim,
      errorBuilder: (context, error, stackTrace) {
        return _ChatSupportImageFallback(
          primaryColor: primaryColor,
          label: label,
        );
      },
    );
  }
}

class _ChatSupportEmployeeAvatar extends StatelessWidget {
  const _ChatSupportEmployeeAvatar({
    required this.size,
    required this.primaryColor,
  });

  final double size;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: Image.asset(
          _chatSupportEmployeeAvatarAsset,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return _buildFallback();
          },
        ),
      ),
    );
  }

  Widget _buildFallback() {
    return Center(
      child: Icon(
        Icons.support_agent_rounded,
        color: primaryColor,
        size: size,
      ),
    );
  }
}

class _ChatSupportImageFallback extends StatelessWidget {
  const _ChatSupportImageFallback({
    required this.primaryColor,
    required this.label,
  });

  final Color primaryColor;
  final String label;

  @override
  Widget build(BuildContext context) {
    final initial = label.trim().isEmpty ? '?' : label.trim()[0].toUpperCase();

    return Container(
      color: primaryColor.withOpacity(0.12),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: primaryColor,
              fontWeight: FontWeight.w800,  
            ),
      ),
    );
  }
}
