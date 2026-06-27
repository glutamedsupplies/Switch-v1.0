import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:gms_shopping/chat_support.dart';
import 'package:gms_shopping/search_bar.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:gms_shopping/widgets/product_online_status_badge.dart';

Future<void> openChatListPage(BuildContext context) async {
  await ChatSupportStore.instance.ensureLoaded();

  if (!context.mounted) {
    return;
  }

  await Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => const ChatListPage(),
    ),
  );
}

class ChatListPage extends StatefulWidget {
  const ChatListPage({super.key});

  @override
  State<ChatListPage> createState() => _ChatListPageState();
}

String _formatConversationTime(DateTime time) {
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

  final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
  final minute = time.minute.toString().padLeft(2, '0');
  final period = time.hour >= 12 ? 'PM' : 'AM';
  final monthName = monthNames[time.month - 1];
  final date = '$monthName ${time.day}, ${time.year}';
  return '$hour:$minute $period  $date';
}

String _formatConversationDay(DateTime time) {
  const dayNames = <String>[
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  return dayNames[time.weekday - 1];
}

class _ChatListPageState extends State<ChatListPage> {
  static const Duration _chatListRefreshInterval = Duration(
    milliseconds: 900,
  );

  late final TextEditingController _searchController;
  late final FocusNode _searchFocusNode;
  final List<String> _threadDisplayOrder = <String>[];
  Timer? _refreshTimer;
  bool _isSearching = false;
  bool _isRefreshingThreads = false;
  String _query = '';

  String _displayThreadOrderId(ChatSupportThreadData thread) {
    final normalizedThreadId = thread.threadId.trim().toLowerCase();
    if (normalizedThreadId.isNotEmpty) {
      return normalizedThreadId;
    }

    return '${thread.customerId.trim().toLowerCase()}::${thread.productId.trim().toLowerCase()}';
  }

  void _syncThreadDisplayOrder(List<ChatSupportThreadData> threads) {
    final incomingOrderIds = threads
        .map(_displayThreadOrderId)
        .where((id) => id.isNotEmpty)
        .toList(growable: false);
    final incomingOrderIdSet = incomingOrderIds.toSet();

    _threadDisplayOrder.removeWhere((id) => !incomingOrderIdSet.contains(id));

    for (final orderId in incomingOrderIds) {
      if (_threadDisplayOrder.contains(orderId)) {
        continue;
      }
      _threadDisplayOrder.add(orderId);
    }
  }

  List<ChatSupportThreadData> _orderedThreadsForDisplay(
    List<ChatSupportThreadData> threads,
  ) {
    _syncThreadDisplayOrder(threads);

    final threadsByOrderId = <String, ChatSupportThreadData>{
      for (final thread in threads) _displayThreadOrderId(thread): thread,
    };
    final orderedThreads = <ChatSupportThreadData>[];

    for (final orderId in _threadDisplayOrder) {
      final thread = threadsByOrderId.remove(orderId);
      if (thread != null) {
        orderedThreads.add(thread);
      }
    }

    orderedThreads.addAll(threadsByOrderId.values);
    return orderedThreads;
  }

  Future<void> _refreshChats({
    bool includeDelay = true,
  }) async {
    if (_isRefreshingThreads) {
      return;
    }

    _isRefreshingThreads = true;
    try {
      await ChatSupportStore.instance.refreshThreadsFromServer();
      if (includeDelay) {
        await Future<void>.delayed(const Duration(milliseconds: 650));
      }
    } finally {
      _isRefreshingThreads = false;
    }
  }

  ScrollPhysics get _refreshScrollPhysics =>
      const AlwaysScrollableScrollPhysics(
        parent: ClampingScrollPhysics(),
      );

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _searchFocusNode = FocusNode();
    unawaited(ChatSupportStore.instance.ensureLoaded());
    unawaited(_refreshChats(includeDelay: false));
    _refreshTimer = Timer.periodic(_chatListRefreshInterval, (_) {
      unawaited(_refreshChats(includeDelay: false));
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _handleSearchChanged(String value) {
    final nextQuery = value.trim();
    if (_query == nextQuery) {
      return;
    }

    setState(() {
      _query = nextQuery;
    });
  }

  void _clearSearch() {
    if (_searchController.text.isEmpty && _query.isEmpty) {
      return;
    }

    setState(() {
      _searchController.clear();
      _query = '';
    });
  }

  void _toggleSearch() {
    if (_isSearching) {
      _cancelSearch();
      return;
    }

    setState(() {
      _isSearching = true;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _searchFocusNode.requestFocus();
      }
    });
  }

  void _cancelSearch() {
    _searchFocusNode.unfocus();
    if (_searchController.text.isEmpty && _query.isEmpty && !_isSearching) {
      return;
    }

    setState(() {
      _searchController.clear();
      _query = '';
      _isSearching = false;
    });
  }

  List<ChatSupportThreadData> _filterThreads(
    List<ChatSupportThreadData> threads,
  ) {
    final normalizedQuery = _query.trim().toLowerCase();
    if (normalizedQuery.isEmpty) {
      return threads;
    }

    return threads.where((thread) {
      final productName = thread.productName.toLowerCase();
      final companyName = thread.companyName.toLowerCase();
      final category = thread.productCategory.toLowerCase();
      final latestMessage = thread.latestMessage.toLowerCase();

      return companyName.contains(normalizedQuery) ||
          productName.contains(normalizedQuery) ||
          category.contains(normalizedQuery) ||
          latestMessage.contains(normalizedQuery);
    }).toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final fieldBackgroundColor =
        theme.inputDecorationTheme.fillColor ??
        theme.colorScheme.surfaceContainerHighest.withOpacity(0.65);

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleSpacing: _isSearching ? 0 : NavigationToolbar.kMiddleSpacing,
        backgroundColor: surfaceColor,
        foregroundColor: theme.colorScheme.onSurface,
        title: AnimatedSwitcher(
          duration: appMotionFrames(13),
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: SizeTransition(
                sizeFactor: animation,
                axis: Axis.horizontal,
                axisAlignment: -1,
                child: child,
              ),
            );
          },
          child: _isSearching
              ? Padding(
                  key: const ValueKey('conversation-search-bar'),
                  padding: const EdgeInsets.only(right: 4),
                  child: ProductSearchBar(
                    controller: _searchController,
                    focusNode: _searchFocusNode,
                    onChanged: _handleSearchChanged,
                    onSubmitted: _handleSearchChanged,
                    onClear: _cancelSearch,
                    onTapOutside: (_) => _cancelSearch(),
                    iconColor: primaryColor,
                    textColor: theme.colorScheme.onSurface,
                    backgroundColor: fieldBackgroundColor,
                    hintText: 'Search for conversation',
                    autofocus: false,
                    showClearButton: true,
                  ),
                )
              : Text(
                  key: const ValueKey('conversation-header-title'),
                  'Chats',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
        ),
        actions: _isSearching
            ? const <Widget>[]
            : [
                IconButton(
                  onPressed: _toggleSearch,
                  tooltip: 'Search conversations',
                  icon: const Icon(Icons.search_rounded),
                ),
              ],
      ),
      body: ValueListenableBuilder<List<ChatSupportThreadData>>(
        valueListenable: ChatSupportStore.instance.threadListNotifier,
        builder: (context, threads, child) {
          final orderedThreads = _orderedThreadsForDisplay(threads);
          final visibleThreads = _filterThreads(orderedThreads);

          if (threads.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refreshChats,
              color: primaryColor,
              backgroundColor: surfaceColor,
              child: CustomScrollView(
                physics: _refreshScrollPhysics,
                slivers: [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: _ChatListEmptyState(
                      primaryColor: primaryColor,
                      secondaryColor: secondaryColor,
                      surfaceColor: theme.cardColor,
                    ),
                  ),
                ],
              ),
            );
          }

          return SafeArea(
            top: false,
            child: Column(
              children: [
                if (visibleThreads.isEmpty)
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _refreshChats,
                      color: primaryColor,
                      backgroundColor: surfaceColor,
                      child: ListView(
                        physics: _refreshScrollPhysics,
                        padding: const EdgeInsets.fromLTRB(0, 72, 0, 24),
                        children: [
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 28),
                              child: Text(
                                'No conversations match your search.',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: secondaryColor,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _refreshChats,
                      color: primaryColor,
                      backgroundColor: surfaceColor,
                      child: ListView.separated(
                        physics: _refreshScrollPhysics,
                        padding: const EdgeInsets.fromLTRB(0, 12, 0, 18),
                        itemCount: visibleThreads.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final thread = visibleThreads[index];
                          return _SwipeRevealChatThreadCard(
                            key: ValueKey(
                              'chat-thread-${_displayThreadOrderId(thread)}',
                            ),
                            thread: thread,
                            primaryColor: primaryColor,
                            secondaryColor: secondaryColor,
                            timeLabel: _formatConversationTime(
                              thread.chatListPreviewTimestamp,
                            ),
                            dayLabel: _formatConversationDay(
                              thread.chatListPreviewTimestamp,
                            ),
                            onTap: () => openChatSupportPage(
                              context,
                              product: thread.toProduct(),
                              showsTopBrand: thread.productShowsTopBrand,
                              slideFromChats: true,
                            ),
                            onDeleteTap: () {
                              unawaited(
                                ChatSupportStore.instance.removeThread(
                                  thread.productId,
                                  adminId: thread.adminId,
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ChatListEmptyState extends StatelessWidget {
  const _ChatListEmptyState({
    required this.primaryColor,
    required this.secondaryColor,
    required this.surfaceColor,
  });

  final Color primaryColor;
  final Color secondaryColor;
  final Color surfaceColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 26),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.mark_chat_read_outlined,
                size: 56,
                color: primaryColor.withOpacity(0.82),
              ),
              const SizedBox(height: 14),
              Text(
                'No chats yet',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Once you chat about a product, your conversation will be saved here.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: secondaryColor,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SwipeRevealChatThreadCard extends StatefulWidget {
  const _SwipeRevealChatThreadCard({
    super.key,
    required this.thread,
    required this.primaryColor,
    required this.secondaryColor,
    required this.timeLabel,
    required this.dayLabel,
    required this.onTap,
    required this.onDeleteTap,
  });

  final ChatSupportThreadData thread;
  final Color primaryColor;
  final Color secondaryColor;
  final String timeLabel;
  final String dayLabel;
  final VoidCallback onTap;
  final VoidCallback onDeleteTap;

  @override
  State<_SwipeRevealChatThreadCard> createState() =>
      _SwipeRevealChatThreadCardState();
}

class _SwipeRevealChatThreadCardState extends State<_SwipeRevealChatThreadCard> {
  static const double _actionRevealWidth = 92;
  static const double _deleteTriggerOffset = 84;
  static final Duration _settleDuration = appMotionFrames(11);
  double _dragOffset = 0;
  bool _isDragging = false;
  bool _isDeleting = false;

  Future<void> _showDeleteConfirmation() async {
    if (_isDeleting) {
      return;
    }

    final theme = Theme.of(context);
    final dialogBackgroundColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    setState(() {
      _isDragging = false;
      _isDeleting = true;
      _dragOffset = _actionRevealWidth;
    });

    await Future<void>.delayed(_settleDuration);
    if (!mounted) {
      return;
    }

    setState(() {
      _dragOffset = 0;
    });

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: dialogBackgroundColor,
          title: const Text('Delete chat?'),
          content: const Text(
            'Do you want to delete this conversation?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('No'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD32F2F),
                foregroundColor: Colors.white,
              ),
              child: const Text('Yes'),
            ),
          ],
        );
      },
    );

    if (!mounted) {
      return;
    }

    if (confirmed == true) {
      widget.onDeleteTap();
      return;
    }

    setState(() {
      _isDeleting = false;
      _dragOffset = 0;
    });
  }

  double get _maxSwipeDistance {
    return _actionRevealWidth;
  }

  void _handleHorizontalDragStart(DragStartDetails details) {
    if (_isDragging || _isDeleting) {
      return;
    }

    setState(() {
      _isDragging = true;
    });
  }

  void _handleHorizontalDragUpdate(DragUpdateDetails details) {
    final delta = details.primaryDelta ?? 0;
    final nextOffset = (_dragOffset - delta).clamp(0.0, _maxSwipeDistance);
    if (nextOffset == _dragOffset) {
      return;
    }

    setState(() {
      _dragOffset = nextOffset;
    });
  }

  void _handleHorizontalDragEnd(DragEndDetails details) {
    if (_isDeleting) {
      return;
    }

    final velocity = details.primaryVelocity ?? 0;
    final shouldDelete =
        velocity < -220 ||
        (velocity <= 0 && _dragOffset >= _deleteTriggerOffset);

    setState(() {
      _isDragging = false;
      _dragOffset = shouldDelete ? _actionRevealWidth : 0;
    });

    if (shouldDelete) {
      unawaited(_showDeleteConfirmation());
    }
  }

  void _handleHorizontalDragCancel() {
    if (_isDeleting) {
      return;
    }

    setState(() {
      _isDragging = false;
      _dragOffset = 0;
    });
  }

  void _handleTap() {
    if (_isDeleting) {
      return;
    }

    if (_dragOffset > 0) {
      setState(() {
        _dragOffset = 0;
      });
      return;
    }

    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    final revealProgress =
        (_dragOffset / _actionRevealWidth).clamp(0.0, 1.0);
    final contentOpacity = 1 - (revealProgress * 0.28);
    final iconSlideOffset = 10 * (1 - revealProgress);

    return Stack(
      alignment: Alignment.centerRight,
      children: [
        if (_dragOffset > 0 || _isDeleting)
          Positioned(
            top: 0,
            right: 0,
            bottom: 0,
            width: _dragOffset,
            child: ColoredBox(
              color: const Color(0xFFD32F2F),
              child: Align(
                alignment: Alignment.center,
                child: Transform.translate(
                  offset: Offset(iconSlideOffset, 0),
                  child: Opacity(
                    opacity: revealProgress,
                    child: GestureDetector(
                      onTap: () {
                        unawaited(_showDeleteConfirmation());
                      },
                      child: const Icon(
                        Icons.delete_outline_rounded,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        AnimatedContainer(
          duration: _isDragging ? Duration.zero : _settleDuration,
          curve: Curves.easeOutCubic,
          transform: Matrix4.translationValues(-_dragOffset, 0, 0),
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onHorizontalDragStart: _handleHorizontalDragStart,
            onHorizontalDragUpdate: _handleHorizontalDragUpdate,
            onHorizontalDragEnd: _handleHorizontalDragEnd,
            onHorizontalDragCancel: _handleHorizontalDragCancel,
            child: _ChatListThreadCard(
              thread: widget.thread,
              primaryColor: widget.primaryColor,
              secondaryColor: widget.secondaryColor,
              timeLabel: widget.timeLabel,
              dayLabel: widget.dayLabel,
              contentOpacity: contentOpacity.clamp(0.0, 1.0),
              onTap: _handleTap,
            ),
          ),
        ),
      ],
    );
  }
}

class _ChatListThreadCard extends StatelessWidget {
  const _ChatListThreadCard({
    required this.thread,
    required this.primaryColor,
    required this.secondaryColor,
    required this.timeLabel,
    required this.dayLabel,
    required this.contentOpacity,
    required this.onTap,
  });

  final ChatSupportThreadData thread;
  final Color primaryColor;
  final Color secondaryColor;
  final String timeLabel;
  final String dayLabel;
  final double contentOpacity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUnread = thread.hasUnreadMessage;
    final unreadCount = thread.unreadMessageCount;
    final unreadLabel = unreadCount == 1
        ? '1 unread message'
        : '$unreadCount unread messages';
    final centerLabel = isUnread
        ? unreadLabel
        : thread.chatListPreviewMessage;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        color: theme.cardColor,
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 6),
        child: Opacity(
          opacity: contentOpacity,
          child: Row(
            children: [
              SizedBox(
                width: 58,
                height: 58,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      child: ClipOval(
                        child: _buildCompanyAvatar(
                          thread.companyPictureUrl,
                          thread.companyName,
                          primaryColor,
                        ),
                      ),
                    ),
                    const Positioned(
                      right: -2,
                      bottom: -1,
                      child: ProductOnlineStatusBadge(compact: true),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      thread.companyName.isNotEmpty 
                          ? thread.companyName 
                          : thread.productName,  
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontSize: 16,
                        fontWeight:
                            isUnread ? FontWeight.w800 : FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      centerLabel,
                      maxLines: isUnread ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isUnread ? primaryColor : secondaryColor,
                        fontSize: isUnread ? 14 : 12,
                        height: 1.4,
                        fontWeight: isUnread ? FontWeight.w800 : null,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            timeLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: secondaryColor,
                              fontSize: 11,
                              fontWeight:
                                  isUnread ? FontWeight.w900 : FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                dayLabel,
                textAlign: TextAlign.right,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: secondaryColor,
                  fontSize: 11,
                  fontWeight: isUnread ? FontWeight.w900 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildCompanyAvatar(
    String imageUrl,
    String companyName,
    Color primaryColor,
  ) {
    final trimmed = imageUrl.trim();
    if (trimmed.isEmpty) {
      return _ChatListImageFallback(
        primaryColor: primaryColor,
        companyName: companyName,
      );
    }

    // Handle data: URLs (base64)
    if (trimmed.startsWith('data:')) {
      try {
        final base64Index = trimmed.indexOf('base64,');
        if (base64Index >= 0) {
          final base64String = trimmed.substring(base64Index + 7);
          final bytes = base64Decode(base64String);
          return Image.memory(
            Uint8List.fromList(bytes),
            key: ValueKey(trimmed),
            fit: BoxFit.cover,
            gaplessPlayback: true,
            cacheWidth: 116,
            cacheHeight: 116,
            errorBuilder: (context, error, stackTrace) {
              return _ChatListImageFallback(
                primaryColor: primaryColor,
                companyName: companyName,
              );
            },
          );
        }
      } catch (_) {}
      return _ChatListImageFallback(
        primaryColor: primaryColor,
        companyName: companyName,
      );
    }

    // Regular HTTP/HTTPS URLs
    return Image.network(
      trimmed,
      key: ValueKey(trimmed),
      fit: BoxFit.cover,
      gaplessPlayback: true,
      cacheWidth: 116,
      cacheHeight: 116,
      errorBuilder: (context, error, stackTrace) {
        return _ChatListImageFallback(
          primaryColor: primaryColor,
          companyName: companyName,
        );
      },
    );
  }
}

class _ChatListImageFallback extends StatelessWidget {
  const _ChatListImageFallback({
    required this.primaryColor,
    required this.companyName,
  });

  final Color primaryColor;
  final String companyName;

  @override
  Widget build(BuildContext context) {
    final initial =
        companyName.trim().isEmpty ? '?' : companyName.trim()[0].toUpperCase();

    return Container(
      color: primaryColor.withOpacity(0.12),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: primaryColor,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}
