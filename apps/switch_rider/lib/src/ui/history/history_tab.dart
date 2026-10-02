import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';

class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  static const _pageSize = 30;

  final List<HistoryItem> _items = [];
  bool _loading = true;
  bool _hasMore = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await context.api.history(limit: _pageSize);
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page);
        _hasMore = page.length == _pageSize;
      });
    } catch (error) {
      if (mounted) setState(() => _error = errorText(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    try {
      final page = await context.api.history(limit: _pageSize, offset: _items.length);
      if (!mounted) return;
      setState(() {
        _items.addAll(page);
        _hasMore = page.length == _pageSize;
      });
    } catch (error) {
      if (mounted) context.showMessage(errorText(error), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Delivery history')),
      body: _loading && _items.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null && _items.isEmpty) ...[
                    EmptyState(icon: Icons.cloud_off_outlined, message: _error!),
                    Center(child: FilledButton.tonal(onPressed: _refresh, child: const Text('Try again'))),
                  ] else if (_items.isEmpty)
                    const EmptyState(icon: Icons.history, message: 'Completed deliveries will appear here.'),
                  for (final item in _items) _HistoryTile(item: item),
                  if (_items.isNotEmpty && _hasMore)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: BusyButton(label: 'Load more', onPressed: _loadMore, tonal: true),
                    ),
                ],
              ),
            ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.item});

  final HistoryItem item;

  @override
  Widget build(BuildContext context) {
    final color = switch (item.status) {
      'DELIVERED' => SwitchBrand.success,
      'RETURNED_TO_SELLER' => SwitchBrand.warning,
      _ => SwitchBrand.muted,
    };
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(item.deliveryCode, style: const TextStyle(fontWeight: FontWeight.w800))),
                StatusChip(item.statusLabel, color: color),
              ],
            ),
            const SizedBox(height: 6),
            Text(item.route),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${formatDateTime(item.finishedAt)} · ${formatKm(item.distanceKm)}'
                    '${item.codAmount > 0 ? ' · COD ${formatPeso(item.codAmount)}' : ''}',
                    style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
                  ),
                ),
                if (item.rating != null) ...[
                  const Icon(Icons.star, size: 16, color: Colors.amber),
                  Text(' ${item.rating}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(width: 10),
                ],
                if (item.earning > 0)
                  Text(formatPeso(item.earning), style: const TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
