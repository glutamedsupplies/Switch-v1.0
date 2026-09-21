import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/select_address_page.dart';
import 'package:switch_app/services/buyer_delivery_address_store.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';

const String _lucideMapPinIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>''';

const String _lucidePencilIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>''';

const String _lucideTrashIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>''';

const String _lucideSaveIconSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>''';

enum FoodDeliveryLocationPickerAction { addAddress, editAddress }

class FoodDeliveryLocationPickerResult {
  const FoodDeliveryLocationPickerResult({
    required this.action,
    this.addressId,
  });

  final FoodDeliveryLocationPickerAction action;
  final String? addressId;
}

Future<FoodDeliveryLocationPickerResult?> showFoodDeliveryLocationPicker(
  BuildContext context, {
  required Color primaryColor,
  String title = 'Where to deliver?',
  String emptySubtitle = 'Set your delivery address',
  String filledSubtitle = 'Choose where you want your order delivered.',
}) {
  Widget buildSheet() {
    return _FoodDeliveryLocationSheet(
      primaryColor: primaryColor,
      title: title,
      emptySubtitle: emptySubtitle,
      filledSubtitle: filledSubtitle,
    );
  }

  // Web: center the modal in the viewport (dialog). Mobile: bottom sheet.
  if (kIsWeb) {
    return showDialog<FoodDeliveryLocationPickerResult>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.34),
      builder: (context) {
        final maxHeight = MediaQuery.sizeOf(context).height * 0.88;
        return Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 24,
            vertical: 24,
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: 440, maxHeight: maxHeight),
            child: buildSheet(),
          ),
        );
      },
    );
  }

  return showModalBottomSheet<FoodDeliveryLocationPickerResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.34),
    builder: (context) => buildSheet(),
  );
}

class _FoodDeliveryLocationSheet extends StatefulWidget {
  const _FoodDeliveryLocationSheet({
    required this.primaryColor,
    required this.title,
    required this.emptySubtitle,
    required this.filledSubtitle,
  });

  final Color primaryColor;
  final String title;
  final String emptySubtitle;
  final String filledSubtitle;

  @override
  State<_FoodDeliveryLocationSheet> createState() =>
      _FoodDeliveryLocationSheetState();
}

class _FoodDeliveryLocationSheetState
    extends State<_FoodDeliveryLocationSheet> {
  static const Color _titleColor = Color(0xFF151B27);
  static const Color _secondaryColor = Color(0xFF687386);
  final BuyerDeliveryAddressStore _store = BuyerDeliveryAddressStore.instance;
  String? _pendingId;
  bool _pendingReady = false;
  bool _settingLocation = false;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
    if (_store.isLoaded) {
      _syncPendingFromStore();
    }
    unawaited(_store.ensureLoaded());
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (!_pendingReady && _store.isLoaded) {
      _syncPendingFromStore();
    }
    if (mounted) setState(() {});
  }

  void _syncPendingFromStore() {
    _pendingReady = true;
    if (_store.useCurrentLocation ||
        _store.selectedId == kBuyerCurrentLocationAddressId) {
      _pendingId = kBuyerCurrentLocationAddressId;
      return;
    }
    _pendingId = _store.selectedId;
  }

  Future<void> _previewCurrent({bool forceRefresh = false}) async {
    BuyerDeliveryAddress? current;
    for (final entry in _store.entries) {
      if (entry.id == kBuyerCurrentLocationAddressId) {
        current = entry;
        break;
      }
    }
    final hasPinned =
        current != null &&
        current.fullAddressLine.trim().isNotEmpty &&
        current.fullAddressLine.trim() != 'Use your device location' &&
        current.fullAddressLine.trim() != 'Saved address';
    if (hasPinned && !forceRefresh) {
      await _applyAndClose(current!);
      return;
    }
    if (_store.locating) return;
    final error = await _store.pinCurrentLocation(select: true);
    if (!mounted) return;
    if (error != null) {
      AppSnackBar.showError(context, message: error);
      return;
    }
    setState(() => _pendingId = kBuyerCurrentLocationAddressId);
  }

  BuyerDeliveryAddress? _pinnedCurrent() {
    for (final entry in _store.entries) {
      if (entry.id != kBuyerCurrentLocationAddressId) continue;
      final full = entry.fullAddressLine.trim();
      if (full.isEmpty ||
          full == 'Use your device location' ||
          full == 'Saved address') {
        return null;
      }
      return entry;
    }
    return null;
  }

  Widget _locationProgressLine() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 6, 0, 4),
      child: SizedBox(
        width: double.infinity,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            minHeight: 2,
            backgroundColor: widget.primaryColor.withValues(alpha: 0.12),
            color: widget.primaryColor,
          ),
        ),
      ),
    );
  }

  Future<void> _openAddAddress() async {
    // Keep this sheet open — open the editor on top, then return here.
    await openSelectAddressPage(
      context,
      primaryColor: widget.primaryColor,
      openEditor: true,
    );
    if (!mounted) return;
    setState(() {
      _pendingId = _store.selectedId;
      _pendingReady = true;
    });
  }

  Future<void> _openEditAddress(BuyerDeliveryAddress entry) async {
    await openSelectAddressPage(
      context,
      primaryColor: widget.primaryColor,
      initialEditAddressId: entry.id,
      openEditor: true,
    );
    if (!mounted) return;
    setState(() {
      _pendingId = _store.selectedId;
      _pendingReady = true;
    });
  }

  Future<void> _deleteAddress(BuyerDeliveryAddress entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete address?'),
          content: Text(
            'Remove ${entry.label} from your saved delivery addresses?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFFDC2626),
              ),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !mounted) return;
    await _store.deleteSaved(entry.id);
    if (!mounted) return;
    AppSnackBar.showSuccess(context, message: 'Address deleted.');
  }

  Future<void> _showLocationAlreadySavedDialog() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Location is already saved'),
          content: const Text(
            'This current location is already in your saved delivery addresses.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _saveCurrentLocation() async {
    BuyerDeliveryAddress? current;
    for (final entry in _store.entries) {
      if (entry.id == kBuyerCurrentLocationAddressId) {
        current = entry;
        break;
      }
    }
    if (current == null) {
      final error = await _store.pinCurrentLocation(select: false);
      if (!mounted) return;
      if (error != null) {
        AppSnackBar.showError(context, message: error);
        return;
      }
      for (final entry in _store.entries) {
        if (entry.id == kBuyerCurrentLocationAddressId) {
          current = entry;
          break;
        }
      }
    }
    if (current != null && _store.isCurrentAlreadySaved(current)) {
      await _showLocationAlreadySavedDialog();
      return;
    }
    final saveError = await _store.saveCurrentAsSaved();
    if (!mounted) return;
    if (saveError != null) {
      if (saveError.toLowerCase().contains('already saved')) {
        await _showLocationAlreadySavedDialog();
        return;
      }
      AppSnackBar.showError(context, message: saveError);
      return;
    }
    setState(() {
      _pendingId = _store.selectedId;
      _pendingReady = true;
    });
    AppSnackBar.showSuccess(context, message: 'Location saved.');
  }

  Color _labelColor(String label) {
    switch (BuyerDeliveryAddress.normalizeLabel(label)) {
      case 'Current':
        return widget.primaryColor;
      default:
        return const Color(0xFF0F9F88);
    }
  }

  Widget _labelIcon(String label, Color color) {
    final normalized = BuyerDeliveryAddress.normalizeLabel(label);
    if (normalized == 'Current') {
      return Icon(Icons.my_location_rounded, size: 24, color: color);
    }
    return SvgPicture.string(
      kMaterialDistanceIconSvg,
      width: 24,
      height: 24,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }

  String _addressFirstLine(BuyerDeliveryAddress entry) {
    final parts = <String>[
      if (entry.unit.trim().isNotEmpty) entry.unit.trim(),
      if (entry.street.trim().isNotEmpty) entry.street.trim(),
    ];
    if (parts.isNotEmpty) return parts.join(', ');
    if (entry.search.trim().isNotEmpty) return entry.search.trim();
    return 'Saved address';
  }

  String _addressSecondLine(BuyerDeliveryAddress entry) {
    return <String>[
      if (entry.city.trim().isNotEmpty) entry.city.trim(),
      if (entry.province.trim().isNotEmpty) entry.province.trim(),
      if (entry.postal.trim().isNotEmpty) entry.postal.trim(),
    ].join(', ');
  }

  String _headerSubtitle({
    required BuyerDeliveryAddress? current,
    required bool hasSaved,
  }) {
    final selected = _store.selectedAddress;
    if (selected != null) {
      final full = selected.fullAddressLine.trim();
      if (full.isNotEmpty && full != 'Saved address') return full;
    }
    if (current != null) {
      final full = current.fullAddressLine.trim();
      if (full.isNotEmpty &&
          full != 'Saved address' &&
          full != 'Use your device location') {
        return full;
      }
    }
    if (_store.locating) return 'Finding your location...';
    if (!hasSaved) return widget.emptySubtitle;
    return widget.filledSubtitle;
  }

  Widget _iconAction({
    required String tooltip,
    required String svg,
    required VoidCallback? onPressed,
    Color? color,
  }) {
    final iconColor = color ?? _secondaryColor;
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      visualDensity: const VisualDensity(horizontal: -4, vertical: -4),
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 22, minHeight: 24),
      style: IconButton.styleFrom(
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: SvgPicture.string(
        svg,
        width: 16,
        height: 16,
        colorFilter: ColorFilter.mode(
          onPressed == null ? iconColor.withValues(alpha: 0.45) : iconColor,
          BlendMode.srcIn,
        ),
      ),
    );
  }

  Widget _savedAddressActions(BuyerDeliveryAddress entry) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _iconAction(
          tooltip: 'Edit',
          svg: _lucidePencilIconSvg,
          onPressed: () => unawaited(_openEditAddress(entry)),
        ),
        const SizedBox(width: 8),
        _iconAction(
          tooltip: 'Delete',
          svg: _lucideTrashIconSvg,
          color: const Color(0xFFDC2626),
          onPressed: () => unawaited(_deleteAddress(entry)),
        ),
      ],
    );
  }

  Widget _currentBadge() {
    return Text(
      'Current',
      style: TextStyle(
        color: widget.primaryColor,
        fontSize: 11.5,
        height: 1.25,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  bool _isApplied(BuyerDeliveryAddress entry) {
    if (entry.isCurrentLocation || entry.id == kBuyerCurrentLocationAddressId) {
      return _store.useCurrentLocation ||
          _store.selectedId == kBuyerCurrentLocationAddressId;
    }
    return !_store.useCurrentLocation && _store.selectedId == entry.id;
  }

  Future<void> _applyAndClose(BuyerDeliveryAddress entry) async {
    if (_settingLocation || _store.locating) return;
    if (_isApplied(entry)) {
      if (mounted) Navigator.of(context).pop();
      return;
    }

    setState(() => _settingLocation = true);
    try {
      if (entry.id == kBuyerCurrentLocationAddressId) {
        final pinned = _pinnedCurrent();
        if (pinned == null) {
          final error = await _store.pinCurrentLocation(select: true);
          if (!mounted) return;
          if (error != null) {
            AppSnackBar.showError(context, message: error);
            return;
          }
        } else {
          await _store.selectSaved(pinned);
        }
      } else {
        await _store.selectSaved(entry);
      }
      if (!mounted) return;
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _settingLocation = false);
    }
  }

  Widget _addressCard({
    required BuyerDeliveryAddress entry,
    required VoidCallback? onTap,
    List<Widget> actions = const <Widget>[],
  }) {
    final iconColor = _labelColor(entry.label);
    final applied = _isApplied(entry);
    final primaryLine = entry.fullAddressLine;

    Widget addressLine(String text, {required bool showCurrent}) {
      const addressStyle = TextStyle(
        color: _secondaryColor,
        fontSize: 11.5,
        height: 1.25,
      );
      return Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(child: Text(text, style: addressStyle)),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(bottom: 0.5),
            child: Opacity(
              opacity: showCurrent ? 1 : 0,
              child: _currentBadge(),
            ),
          ),
        ],
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C0F172A),
            blurRadius: 13,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(13, 13, 10, 13),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 34,
                  height: 42,
                  child: Center(child: _labelIcon(entry.label, iconColor)),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: EdgeInsets.only(
                              right: actions.isEmpty ? 0 : 44,
                            ),
                            child: Text(
                              BuyerDeliveryAddress.displayTitle(entry.label),
                              style: TextStyle(
                                color: _titleColor,
                                fontSize: 14,
                                height: 1.1,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 2),
                          addressLine(primaryLine, showCurrent: applied),
                        ],
                      ),
                      if (actions.isNotEmpty)
                        Positioned(
                          top: -6,
                          right: -4,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: actions,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _currentLocationCard(BuyerDeliveryAddress? current) {
    final currentEntry =
        current ??
        const BuyerDeliveryAddress(
          id: kBuyerCurrentLocationAddressId,
          label: 'Current',
          search: 'Use your device location',
        );

    return _addressCard(
      entry: currentEntry,
      onTap: _store.locating
          ? null
          : () => unawaited(_applyAndClose(currentEntry)),
      actions: [
        _iconAction(
          tooltip: 'Save location',
          svg: _lucideSaveIconSvg,
          onPressed: _store.locating
              ? null
              : () => unawaited(_saveCurrentLocation()),
        ),
      ],
    );
  }

  Widget _mapArtwork({required double width, required double height}) {
    return Image.asset(
      'assets/images/delivery-address-empty-art.png',
      width: width,
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) => SizedBox(
        width: width,
        height: height,
        child: Icon(
          Icons.map_rounded,
          size: height * 0.52,
          color: widget.primaryColor.withValues(alpha: 0.28),
        ),
      ),
    );
  }

  Widget _useCurrentLocationControl() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextButton.icon(
          onPressed: _store.locating
              ? null
              : () => unawaited(_previewCurrent(forceRefresh: true)),
          style: TextButton.styleFrom(foregroundColor: widget.primaryColor),
          icon: const Icon(Icons.my_location_rounded, size: 18),
          label: const Text(
            'Use current location',
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
          ),
        ),
        if (_store.locating || _settingLocation) ...[
          Text(
            'Finding your location...',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: _secondaryColor,
              fontSize: 11.5,
              height: 1.25,
              fontWeight: FontWeight.w600,
            ),
          ),
          _locationProgressLine(),
        ],
      ],
    );
  }

  Widget _emptyState() {
    final pinnedCurrent = _pinnedCurrent();
    final showCurrentPicker = pinnedCurrent != null && !_store.locating;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(child: _mapArtwork(width: 210, height: 178)),
        const SizedBox(height: 2),
        _useCurrentLocationControl(),
        const SizedBox(height: 10),
        Text(
          'No saved address yet',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: _titleColor,
            fontSize: 18,
            height: 1.15,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 7),
        Text(
          'Add a delivery address so you can quickly choose where your order should arrive.',
          textAlign: TextAlign.center,
          style: TextStyle(color: _secondaryColor, fontSize: 12, height: 1.4),
        ),
        if (showCurrentPicker) ...[
          const SizedBox(height: 14),
          _currentLocationCard(pinnedCurrent),
        ],
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: () => unawaited(_openAddAddress()),
            style: FilledButton.styleFrom(
              backgroundColor: widget.primaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(13),
              ),
            ),
            icon: const Icon(Icons.add_location_alt_rounded, size: 20),
            label: const Text(
              'Add Address',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    BuyerDeliveryAddress? current;
    for (final entry in _store.entries) {
      if (entry.id == kBuyerCurrentLocationAddressId) {
        current = entry;
        break;
      }
    }
    final regular = _store.entries
        .where((entry) => entry.id != kBuyerCurrentLocationAddressId)
        .toList(growable: false);
    final bottomInset = kIsWeb ? 0.0 : MediaQuery.paddingOf(context).bottom;
    final screenHeight = MediaQuery.sizeOf(context).height;
    final hasSaved = regular.isNotEmpty;
    final borderRadius = kIsWeb
        ? BorderRadius.circular(22)
        : const BorderRadius.vertical(top: Radius.circular(26));

    return Container(
      constraints: BoxConstraints(
        maxHeight: kIsWeb ? screenHeight * 0.88 : screenHeight * 0.92,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: borderRadius,
      ),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            kIsWeb ? 18 : 10,
            16,
            10 + bottomInset,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!kIsWeb) ...[
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD2DA),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 15),
              ],
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SvgPicture.string(
                    _lucideMapPinIconSvg,
                    width: 22,
                    height: 22,
                    colorFilter: const ColorFilter.mode(
                      _titleColor,
                      BlendMode.srcIn,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: TextStyle(
                        color: _titleColor,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                _headerSubtitle(current: current, hasSaved: hasSaved),
                style: TextStyle(
                  color: _secondaryColor,
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 14),
              if (!_store.isLoaded)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 64),
                  child: const SkeletonListRows(count: 6),
                )
              else if (!hasSaved)
                _emptyState()
              else ...[
                Center(child: _mapArtwork(width: 210, height: 178)),
                const SizedBox(height: 2),
                _useCurrentLocationControl(),
                const SizedBox(height: 6),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    padding: const EdgeInsets.only(top: 8),
                    children: [
                      for (final entry in regular)
                        _addressCard(
                          entry: entry,
                          onTap: () => unawaited(_applyAndClose(entry)),
                          actions: [_savedAddressActions(entry)],
                        ),
                      _currentLocationCard(current),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: () => unawaited(_openAddAddress()),
                    style: FilledButton.styleFrom(
                      backgroundColor: widget.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(13),
                      ),
                    ),
                    icon: const Icon(Icons.add_location_alt_rounded, size: 20),
                    label: const Text(
                      'Add another address',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
