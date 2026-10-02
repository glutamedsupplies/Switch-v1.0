import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';
import '../jobs/job_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  int _version = 0;

  Future<void> _markAllRead() async {
    try {
      await context.api.markNotificationsRead();
      if (!mounted) return;
      setState(() => _version++);
      context.runtime.refresh();
    } catch (error) {
      if (mounted) context.showMessage(errorText(error), error: true);
    }
  }

  Future<void> _open(RiderNotification notification) async {
    if (!notification.read) {
      try {
        await context.api.markNotificationsRead([notification.id]);
      } catch (_) {
        // Opening the item still works if marking fails.
      }
    }
    if (!mounted) return;
    if (notification.deliveryId.isNotEmpty) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => JobScreen(jobId: notification.deliveryId)),
      );
    }
    if (mounted) setState(() => _version++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [TextButton(onPressed: _markAllRead, child: const Text('Mark all read'))],
      ),
      body: AsyncList<(int, List<RiderNotification>)>(
        key: ValueKey(_version),
        load: context.api.notifications,
        builder: (context, data, reload) {
          final items = data.$2;
          if (items.isEmpty) {
            return ListView(
              children: const [EmptyState(icon: Icons.notifications_none, message: 'No notifications yet.')],
            );
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                leading: Icon(
                  item.read ? Icons.notifications_none : Icons.notifications_active,
                  color: item.read ? SwitchBrand.muted : SwitchBrand.teal,
                ),
                title: Text(item.title, style: TextStyle(fontWeight: item.read ? FontWeight.w500 : FontWeight.w800)),
                subtitle: Text('${item.body}\n${formatDateTime(item.createdAt)}'),
                isThreeLine: true,
                onTap: () => _open(item),
              );
            },
          );
        },
      ),
    );
  }
}
