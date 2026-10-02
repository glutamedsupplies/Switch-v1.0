import 'dart:async';

import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';
import '../maps/rider_route_screen.dart';

/// A delivery offer with a live countdown. Only area-level locations are shown
/// until the rider accepts.
class OfferCard extends StatefulWidget {
  const OfferCard({super.key, required this.offer, required this.onAccepted});

  final RiderOffer offer;
  final ValueChanged<RiderJob> onAccepted;

  @override
  State<OfferCard> createState() => _OfferCardState();
}

class _OfferCardState extends State<OfferCard> {
  late final DateTime _deadline;
  late final int _total;
  Timer? _timer;
  int _remaining = 0;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _total = widget.offer.secondsRemaining.clamp(1, 600);
    _deadline = DateTime.now().add(
      Duration(seconds: widget.offer.secondsRemaining),
    );
    _remaining = widget.offer.secondsRemaining;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final left = _deadline.difference(DateTime.now()).inSeconds;
    if (left <= 0) {
      _timer?.cancel();
      context.runtime.expireOffer(widget.offer);
      return;
    }
    setState(() => _remaining = left);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _accept() async {
    setState(() => _busy = true);
    try {
      final job = await context.runtime.acceptOffer(widget.offer);
      if (job != null) widget.onAccepted(job);
    } catch (error) {
      if (mounted) context.showMessage(errorText(error), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _decline() async {
    setState(() => _busy = true);
    await context.runtime.declineOffer(widget.offer);
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: SwitchBrand.teal, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.notifications_active, color: SwitchBrand.teal),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'New delivery offer',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                  ),
                ),
                Text(
                  '${_remaining}s',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: SwitchBrand.danger,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: (_remaining / _total).clamp(0, 1).toDouble(),
            ),
            const SizedBox(height: 14),
            Text(
              formatPeso(offer.riderEarning),
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w900,
                color: SwitchBrand.tealDark,
              ),
            ),
            const Text(
              'Your earning for this delivery',
              style: TextStyle(color: SwitchBrand.muted),
            ),
            const SizedBox(height: 12),
            _Leg(
              icon: Icons.storefront,
              label: 'Pickup',
              value: offer.pickupArea.isEmpty
                  ? 'Nearby seller'
                  : offer.pickupArea,
            ),
            _Leg(
              icon: Icons.place,
              label: 'Drop-off',
              value: offer.dropoffArea.isEmpty
                  ? 'Customer area'
                  : offer.dropoffArea,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatusChip('${formatKm(offer.distanceToPickupKm)} to pickup'),
                StatusChip('${formatKm(offer.distanceKm)} trip'),
                if (offer.estimatedMinutes > 0)
                  StatusChip('~${offer.estimatedMinutes} min'),
                StatusChip(
                  '${offer.packageCount} parcel${offer.packageCount == 1 ? '' : 's'}',
                ),
                StatusChip(vehicleLabel(offer.vehicleTypeRequired)),
                offer.isCod
                    ? StatusChip(
                        'COD ${formatPeso(offer.codAmount)}',
                        color: SwitchBrand.warning,
                      )
                    : const StatusChip('Prepaid', color: SwitchBrand.success),
              ],
            ),
            if (offer.packageNotes.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Note: ${offer.packageNotes}',
                style: const TextStyle(color: SwitchBrand.muted),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: _busy
                    ? null
                    : () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => RiderRouteScreen.forOffer(
                            offerId: offer.offerId,
                            deliveryCode: offer.deliveryCode,
                          ),
                        ),
                      ),
                icon: const Icon(Icons.route),
                label: const Text('View route'),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton(
                      onPressed: _busy ? null : _decline,
                      child: const Text('Decline'),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: BusyButton(
                    label: 'Accept',
                    onPressed: _busy ? null : _accept,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Leg extends StatelessWidget {
  const _Leg({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: SwitchBrand.muted),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(color: SwitchBrand.muted)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
