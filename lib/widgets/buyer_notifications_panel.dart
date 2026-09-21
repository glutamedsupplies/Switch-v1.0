import 'dart:async';

import 'package:flutter/material.dart';
import 'package:switch_app/utils/buyer_notification_time_sections.dart';
import 'package:switch_app/widgets/buyer_right_panel_host.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BuyerNotificationItem {
  const BuyerNotificationItem({
    required this.id,
    required this.body,
    this.createdAt,
    this.isSwitch = true,
    this.actorName = '',
    this.avatarUrl = '',
  });

  final String id;
  final String body;
  final DateTime? createdAt;
  final bool isSwitch;
  final String actorName;
  final String avatarUrl;
}

class BuyerNotificationsPanel extends StatefulWidget {
  const BuyerNotificationsPanel({
    super.key,
    required this.primaryColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    this.firstName = '',
    this.sectionFor = BuyerNotificationTimeSections.sectionFor,
    this.sectionLabel = BuyerNotificationTimeSections.label,
  });

  final Color primaryColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final String firstName;

  /// Tied from `main.dart` — same rules as web `notifSectionFor` (main_dart.html).
  final BuyerNotificationTimeSection Function(
    DateTime? createdAt, {
    DateTime? now,
  })
  sectionFor;
  final String Function(BuyerNotificationTimeSection section) sectionLabel;

  static const String welcomeId = 'buyer-welcome';
  static const String _readIdsKey = 'gms-buyer-notif-read';

  /// Parity with web `welcomeNotifiedAt` — stable timestamp for section buckets.
  static const String _welcomeNotifiedAtKey = 'gms-buyer-welcome-notified-at';

  static Future<void> show(
    BuildContext context, {
    required Color primaryColor,
    required Color surfaceColor,
    required Color titleColor,
    required Color secondaryColor,
    String firstName = '',
    BuyerNotificationTimeSection Function(DateTime? createdAt, {DateTime? now})?
    sectionFor,
    String Function(BuyerNotificationTimeSection section)? sectionLabel,
  }) {
    return BuyerRightPanelHost.show(
      context: context,
      barrierLabel: 'Close notifications',
      panel: BuyerNotificationsPanel(
        primaryColor: primaryColor,
        surfaceColor: surfaceColor,
        titleColor: titleColor,
        secondaryColor: secondaryColor,
        firstName: firstName,
        sectionFor: sectionFor ?? BuyerNotificationTimeSections.sectionFor,
        sectionLabel: sectionLabel ?? BuyerNotificationTimeSections.label,
      ),
    );
  }

  @override
  State<BuyerNotificationsPanel> createState() =>
      _BuyerNotificationsPanelState();
}

class _BuyerNotificationsPanelState extends State<BuyerNotificationsPanel> {
  final Set<String> _readIds = <String>{};
  List<BuyerNotificationItem> _notifications = const <BuyerNotificationItem>[];
  bool _loaded = false;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    unawaited(_bootstrap());
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final storedRead =
        prefs.getStringList(BuyerNotificationsPanel._readIdsKey) ?? <String>[];
    final welcomeAt = await _resolveWelcomeNotifiedAt(prefs);

    if (!mounted) return;
    setState(() {
      _readIds
        ..clear()
        ..addAll(storedRead);
      _notifications = [
        BuyerNotificationItem(
          id: BuyerNotificationsPanel.welcomeId,
          body:
              "Welcome to Switch! We're so glad you're here. Enjoy exploring.",
          createdAt: welcomeAt,
          isSwitch: true,
        ),
      ];
      _loaded = true;
    });
  }

  /// Match web `ensureWelcomeNotification` / `welcomeNotifiedAt`:
  /// first issue time is persisted; reopen must not reset to `DateTime.now()`.
  Future<DateTime> _resolveWelcomeNotifiedAt(SharedPreferences prefs) async {
    final raw =
        (prefs.getString(BuyerNotificationsPanel._welcomeNotifiedAtKey) ?? '')
            .trim();
    if (raw.isNotEmpty) {
      final parsed = DateTime.tryParse(raw);
      if (parsed != null) return parsed.toLocal();
    }
    final now = DateTime.now();
    await prefs.setString(
      BuyerNotificationsPanel._welcomeNotifiedAtKey,
      now.toUtc().toIso8601String(),
    );
    return now;
  }

  @override
  void dispose() {
    unawaited(_persistAllRead());
    super.dispose();
  }

  List<BuyerNotificationItem> get _visibleNotifications {
    if (_filter == 'unread') {
      return _notifications
          .where((item) => !_readIds.contains(item.id))
          .toList(growable: false);
    }
    return _notifications;
  }

  List<Object> _buildGroupedWithWiredSectionFor(
    List<BuyerNotificationItem> visible,
  ) {
    final now = DateTime.now();
    final buckets = <BuyerNotificationTimeSection, List<BuyerNotificationItem>>{
      for (final section in BuyerNotificationTimeSection.values)
        section: <BuyerNotificationItem>[],
    };
    for (final item in visible) {
      buckets[widget.sectionFor(item.createdAt, now: now)]!.add(item);
    }
    final rows = <Object>[];
    for (final section in BuyerNotificationTimeSection.values) {
      final items = buckets[section]!;
      if (items.isEmpty) continue;
      rows.add(section);
      rows.addAll(items);
    }
    return rows;
  }

  Future<void> _persistAllRead() async {
    _readIds.addAll(_notifications.map((item) => item.id));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      BuyerNotificationsPanel._readIdsKey,
      _readIds.toList(growable: false),
    );
  }

  String _formatTime(DateTime? value) {
    if (value == null) return '';
    final local = value.toLocal();
    final month = _monthLabel(local.month);
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final period = local.hour >= 12 ? 'PM' : 'AM';
    return '$month ${local.day}, $hour:$minute $period';
  }

  String _monthLabel(int month) {
    const labels = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return labels[(month - 1).clamp(0, 11)];
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final panelWidth = width < 520 ? width * 0.92 : 360.0;
    final visible = _visibleNotifications;
    final grouped = _buildGroupedWithWiredSectionFor(visible);
    final unreadCount = _notifications
        .where((item) => !_readIds.contains(item.id))
        .length;
    final panelColor = widget.surfaceColor.a == 0
        ? Theme.of(context).colorScheme.surface
        : widget.surfaceColor;

    return Material(
      color: panelColor,
      elevation: 0,
      child: SizedBox(
        width: panelWidth,
        height: double.infinity,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: panelColor,
            border: Border(
              left: BorderSide(
                color: widget.secondaryColor.withValues(alpha: 0.18),
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 28,
                offset: const Offset(-8, 0),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            bottom: false,
            child: ColoredBox(
              color: panelColor,
              child: Column(
                children: [
                  BuyerRightPanelHeader(
                    title: 'Notifications',
                    titleColor: widget.titleColor,
                    onBack: () => Navigator.of(context).maybePop(),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                    child: Row(
                      children: [
                        _FilterChip(
                          label: 'All',
                          selected: _filter == 'all',
                          primaryColor: widget.primaryColor,
                          onTap: () => setState(() => _filter = 'all'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Unread',
                          selected: _filter == 'unread',
                          primaryColor: widget.primaryColor,
                          onTap: () => setState(() => _filter = 'unread'),
                        ),
                        const Spacer(),
                        if (unreadCount > 0)
                          Text(
                            '$unreadCount unread',
                            style: TextStyle(
                              color: widget.secondaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: !_loaded
                        ? const SkeletonListRows(count: 6)
                        : visible.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Text(
                                _filter == 'unread'
                                    ? 'No unread notifications.'
                                    : 'No notifications yet.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: widget.secondaryColor,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(6, 4, 6, 24),
                            itemCount: grouped.length,
                            itemBuilder: (context, index) {
                              final row = grouped[index];
                              if (row is BuyerNotificationTimeSection) {
                                return Padding(
                                  padding: const EdgeInsets.fromLTRB(
                                    12,
                                    14,
                                    12,
                                    6,
                                  ),
                                  child: Text(
                                    widget.sectionLabel(row),
                                    style: TextStyle(
                                      color: widget.secondaryColor.withValues(
                                        alpha: 0.85,
                                      ),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                );
                              }

                              final item = row as BuyerNotificationItem;
                              final unread = !_readIds.contains(item.id);
                              return _NotificationRow(
                                item: item,
                                unread: unread,
                                primaryColor: widget.primaryColor,
                                titleColor: widget.titleColor,
                                secondaryColor: widget.secondaryColor,
                                timeLabel: _formatTime(item.createdAt),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.primaryColor,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color primaryColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? primaryColor : const Color(0x0F0F172A),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          constraints: const BoxConstraints(minHeight: 32),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : const Color(0xFF475569),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({
    required this.item,
    required this.unread,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.timeLabel,
  });

  final BuyerNotificationItem item;
  final bool unread;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final String timeLabel;

  String _initials(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty);
    final list = parts.toList(growable: false);
    if (list.length >= 2) {
      return '${list[0][0]}${list[1][0]}'.toUpperCase();
    }
    if (list.isEmpty) return 'N';
    final text = list.first;
    return text.length >= 2
        ? text.substring(0, 2).toUpperCase()
        : text.substring(0, 1).toUpperCase();
  }

  Widget _buildAvatar() {
    if (item.isSwitch) {
      return CircleAvatar(
        radius: 22,
        backgroundColor: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(7),
          child: Image.asset(
            'assets/images/switch-logo.png',
            fit: BoxFit.contain,
          ),
        ),
      );
    }

    if (item.avatarUrl.isNotEmpty) {
      return CircleAvatar(
        radius: 22,
        backgroundColor: primaryColor.withValues(alpha: 0.12),
        backgroundImage: NetworkImage(item.avatarUrl),
      );
    }

    return CircleAvatar(
      radius: 22,
      backgroundColor: primaryColor.withValues(alpha: 0.12),
      child: Text(
        _initials(item.actorName),
        style: TextStyle(
          color: primaryColor,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bodyColor = unread ? titleColor : secondaryColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () {},
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildAvatar(),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(
                      TextSpan(
                        style: TextStyle(
                          color: bodyColor,
                          fontSize: 13,
                          height: 1.35,
                        ),
                        children: [
                          if (!item.isSwitch && item.actorName.isNotEmpty)
                            TextSpan(
                              text: item.actorName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          if (!item.isSwitch && item.actorName.isNotEmpty)
                            const TextSpan(text: ' '),
                          TextSpan(text: item.body),
                        ],
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (timeLabel.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        timeLabel,
                        style: TextStyle(color: primaryColor, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 9,
                height: 9,
                margin: const EdgeInsets.only(top: 8),
                decoration: BoxDecoration(
                  color: unread ? const Color(0xFFDC2626) : Colors.transparent,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
