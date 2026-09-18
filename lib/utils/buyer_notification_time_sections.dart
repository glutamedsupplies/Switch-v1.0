/// Shared buyer notification time buckets for Flutter `main.dart` and
/// web `main_dart.html` (`switch_buyer_auth.js` → `notifSectionFor`).
///
/// Rules (exclusive):
/// - Earlier  → age ≤ 1 hour
/// - Today    → age ≤ 24 hours, and NOT Earlier
/// - Yesterday → calendar yesterday (and not Earlier/Today)
/// - Older    → everything else
library;

enum BuyerNotificationTimeSection {
  earlier,
  today,
  yesterday,
  older,
}

abstract final class BuyerNotificationTimeSections {
  static const Duration earlierMaxAge = Duration(hours: 1);
  static const Duration todayMaxAge = Duration(hours: 24);

  static BuyerNotificationTimeSection sectionFor(
    DateTime? createdAt, {
    DateTime? now,
  }) {
    final stamp = now ?? DateTime.now();
    if (createdAt == null) return BuyerNotificationTimeSection.older;

    final local = createdAt.toLocal();
    final age = stamp.difference(local);

    if (!age.isNegative && age <= earlierMaxAge) {
      return BuyerNotificationTimeSection.earlier;
    }
    // Tip: never put Earlier items in Today — exclusive buckets.
    if (!age.isNegative && age <= todayMaxAge) {
      return BuyerNotificationTimeSection.today;
    }

    final todayStart = DateTime(stamp.year, stamp.month, stamp.day);
    final yesterdayStart = todayStart.subtract(const Duration(days: 1));
    if (!local.isBefore(yesterdayStart) && local.isBefore(todayStart)) {
      return BuyerNotificationTimeSection.yesterday;
    }
    return BuyerNotificationTimeSection.older;
  }

  static String label(BuyerNotificationTimeSection section) {
    switch (section) {
      case BuyerNotificationTimeSection.earlier:
        return 'Earlier';
      case BuyerNotificationTimeSection.today:
        return 'Today';
      case BuyerNotificationTimeSection.yesterday:
        return 'Yesterday';
      case BuyerNotificationTimeSection.older:
        return 'Older';
    }
  }

  /// Groups [items] into section rows: section header then its notifications.
  /// [createdAtOf] extracts the timestamp used for bucketing.
  static List<Object> buildGroupedRows<T extends Object>({
    required List<T> items,
    required DateTime? Function(T item) createdAtOf,
    DateTime? now,
  }) {
    final stamp = now ?? DateTime.now();
    final buckets = <BuyerNotificationTimeSection, List<T>>{
      for (final section in BuyerNotificationTimeSection.values)
        section: <T>[],
    };

    for (final item in items) {
      final section = sectionFor(createdAtOf(item), now: stamp);
      buckets[section]!.add(item);
    }

    final rows = <Object>[];
    for (final section in BuyerNotificationTimeSection.values) {
      final group = buckets[section]!;
      if (group.isEmpty) continue;
      rows.add(section);
      rows.addAll(group);
    }
    return rows;
  }
}
