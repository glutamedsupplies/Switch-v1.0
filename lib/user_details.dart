// ============================================================================
// user_details.dart
//
// User address and contact details management page.
// Allows users to save, edit, delete, and select from multiple saved address
// entries. Includes an embedded Google Maps preview for each address.
// Uses SharedPreferences for per-account persistent storage.
// ============================================================================

// dart:async — Provides Timer for debounced map reload scheduling.
import 'dart:async';

// dart:convert — Provides jsonEncode/jsonDecode for serializing/deserializing
// saved entries to/from SharedPreferences storage.
import 'dart:convert';

// flutter/cupertino — Provides CupertinoSwitch for the "Set as default" toggle.
import 'package:flutter/cupertino.dart';

// flutter/foundation — Provides HtmlEscape for safely embedding the Google Maps
// URL into the HTML iframe source attribute.
import 'package:flutter/foundation.dart';

// flutter/gestures — Provides gesture recognizer factories used by the WebView
// to enable touch/scroll interactions inside the embedded map.
import 'package:flutter/gestures.dart';

// flutter/material — Core Flutter UI framework.
import 'package:flutter/material.dart';

// app_snack_bar — Custom snack bar utility for showing success/error messages.
import 'package:gms_shopping/theme/app_snack_bar.dart';

// auth_session — Provides getAccountId() and getAccountEmail() to build a
// per-user SharedPreferences key so each account's saved entries are isolated.
import 'package:gms_shopping/utils/auth_session.dart';

// shared_preferences — Flutter plugin for persistent key-value storage on disk.
import 'package:shared_preferences/shared_preferences.dart';

// webview_flutter — Flutter plugin for embedding the Google Maps iframe preview.
import 'package:webview_flutter/webview_flutter.dart';

// ============================================================================
// CONSTANTS
// ============================================================================

// _userDetailsFieldBorderRadius — Shared border radius applied to all text
// fields and input decorations in this page for consistent visual styling.
const BorderRadius _userDetailsFieldBorderRadius = BorderRadius.all(
  Radius.circular(8),
);

// ============================================================================
// GOOGLE MAPS EMBED HELPERS
// ============================================================================

// _userDetailsGoogleMapEmbedUrl — Builds a Google Maps embed URL for the given
// address. If the address is empty, defaults to the Philippines at zoom level 6.
// Otherwise appends "Philippines" if not already present and sets zoom to 17.
String _userDetailsGoogleMapEmbedUrl(String address) {
  final trimmedAddress = address.trim();
  final query = trimmedAddress.isEmpty
      ? 'Philippines'
      : trimmedAddress.toLowerCase().contains('philippines')
          ? trimmedAddress
          : '$trimmedAddress, Philippines';
  return Uri.https(
    'www.google.com',
    '/maps',
    <String, String>{
      'q': query,
      'z': trimmedAddress.isEmpty ? '6' : '17',
      'output': 'embed',
    },
  ).toString();
}

// _userDetailsGoogleMapHtml — Generates a self-contained HTML document that
// embeds the Google Maps iframe. The map URL is HTML-escaped before insertion
// to prevent attribute injection. The iframe fills the entire viewport with
// no border, scrolling, or margins for a clean preview appearance.
String _userDetailsGoogleMapHtml(String mapUrl) {
  final escapedMapUrl =
      const HtmlEscape(HtmlEscapeMode.attribute).convert(mapUrl);

  return '''
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #eef2f7;
        font-family: Arial, sans-serif;
      }

      iframe {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: #eef2f7;
      }
    </style>
  </head>
  <body>
    <iframe
      src="$escapedMapUrl"
      title="Google Maps address preview"
      loading="eager"
      allowfullscreen
      referrerpolicy="no-referrer-when-downgrade">
    </iframe>
  </body>
</html>
''';
}

// ============================================================================
// UserDetailsResult
//
// Simple data class holding the selected address details returned to the
// caller after the user picks or saves an entry. Passed back via Navigator.pop.
// ============================================================================
class UserDetailsResult {
  const UserDetailsResult({
    required this.name,
    required this.contactNumber,
    required this.address,
    this.addressDetails = '',
  });

  // name — Recipient's full name.
  final String name;
  // contactNumber — Contact phone number.
  final String contactNumber;
  // address — Full delivery address.
  final String address;
  // addressDetails — Optional landmark or additional address info.
  final String addressDetails;
}

// ============================================================================
// UserDetailsPage
//
// Main page for managing user address/contact details.
// Displays the current entry at the top, a list of saved entries below,
// and an "Add Details" button. Tapping a saved entry selects it and returns
// the result to the previous screen. Long-press or edit button toggles edit mode.
// ============================================================================
class UserDetailsPage extends StatefulWidget {
  const UserDetailsPage({
    super.key,
    required this.initialName,
    required this.initialContactNumber,
    required this.initialAddress,
    this.initialAddressDetails = '',
  });

  // ------------------------------------------------------------------------
  // initialName — Pre-filled recipient name passed from the calling screen
  // (e.g., checkout page). Used to pre-populate the form and detect whether
  // the current entry already exists in the saved list.
  // ------------------------------------------------------------------------
  final String initialName;
  final String initialContactNumber;
  final String initialAddress;
  final String initialAddressDetails;

  @override
  State<UserDetailsPage> createState() => _UserDetailsPageState();
}

// ============================================================================
// _UserDetailsPageState
//
// Manages the saved entries list, loading/persisting to SharedPreferences,
// and handling the add/edit/delete flow via _UserDetailsEditorPage.
// ============================================================================
class _UserDetailsPageState extends State<UserDetailsPage> {
  // ------------------------------------------------------------------------
  // _legacySavedUserDetailsKey — Old SharedPreferences key used by a previous
  // version of this feature. Entries under this key are migrated/removed on
  // load to ensure data consistency.
  // ------------------------------------------------------------------------
  static const String _legacySavedUserDetailsKey = 'saved_user_details_entries';

  // ------------------------------------------------------------------------
  // _savedUserDetailsKeyPrefix — Prefix for per-account storage keys.
  // The full key is: saved_user_details_entries_{accountIdOrEmail (URL-encoded, lowercase)}.
  // This ensures each user sees only their own saved entries.
  // ------------------------------------------------------------------------
  static const String _savedUserDetailsKeyPrefix =
      'saved_user_details_entries_';

  // ------------------------------------------------------------------------
  // Text controllers — manage the four input fields on the page.
  // ------------------------------------------------------------------------
  late final TextEditingController _nameController;
  late final TextEditingController _contactController;
  late final TextEditingController _addressController;
  late final TextEditingController _addressDetailsController;

  // ------------------------------------------------------------------------
  // _savedEntries — In-memory list of all saved address entries loaded from
  // SharedPreferences. Updated whenever the user adds, edits, or deletes.
  // ------------------------------------------------------------------------
  final List<_SavedUserDetailsEntry> _savedEntries = <_SavedUserDetailsEntry>[];

  // ------------------------------------------------------------------------
  // _isLoading — True while entries are being loaded from SharedPreferences.
  // Shows a loading indicator until the list is ready.
  // ------------------------------------------------------------------------
  bool _isLoading = true;

  // ------------------------------------------------------------------------
  // _isEditSelectionMode — When true, tapping a saved entry opens the editor
  // instead of selecting it. Toggle via the edit/select button in the app bar.
  // ------------------------------------------------------------------------
  bool _isEditSelectionMode = false;

  @override
  void initState() {
    super.initState();
    // Initialize text controllers with values passed from the calling screen.
    _nameController = TextEditingController(text: widget.initialName);
    _contactController = TextEditingController(text: widget.initialContactNumber);
    _addressController = TextEditingController(text: widget.initialAddress);
    _addressDetailsController =
        TextEditingController(text: widget.initialAddressDetails);
    // Load saved entries from SharedPreferences on page open.
    _loadSavedEntries();
  }

  @override
  void dispose() {
    // Clean up text controllers to prevent memory leaks.
    _nameController.dispose();
    _contactController.dispose();
    _addressController.dispose();
    _addressDetailsController.dispose();
    super.dispose();
  }

  // ------------------------------------------------------------------------
  // _hasInitialDetails — True when all three required fields (name, contact,
  // address) have non-empty values. Used to determine whether to auto-save
  // the current entry as a new saved entry on first load.
  // ------------------------------------------------------------------------
  bool get _hasInitialDetails =>
      widget.initialName.trim().isNotEmpty &&
      widget.initialContactNumber.trim().isNotEmpty &&
      widget.initialAddress.trim().isNotEmpty;

  // ------------------------------------------------------------------------
  // _resolveSavedUserDetailsKey — Builds the per-account SharedPreferences key.
  // Prefers accountId; falls back to accountEmail if id is unavailable.
  // The key is URL-encoded and lowercased for safety and consistency.
  // Returns null if neither id nor email is available (guest session).
  // ------------------------------------------------------------------------
  Future<String?> _resolveSavedUserDetailsKey() async {
    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
    final rawAccountKey = accountId.isNotEmpty ? accountId : accountEmail;
    if (rawAccountKey.isEmpty) {
      return null;
    }

    return '$_savedUserDetailsKeyPrefix${Uri.encodeComponent(rawAccountKey.toLowerCase())}';
  }

  // ------------------------------------------------------------------------
  // _removeLegacySavedUserDetailsKey — Deletes the old shared key on load so
  // that legacy data does not conflict with the new per-account keys.
  // ------------------------------------------------------------------------
  Future<void> _removeLegacySavedUserDetailsKey(
    SharedPreferences preferences,
  ) async {
    await preferences.remove(_legacySavedUserDetailsKey);
  }

  // ------------------------------------------------------------------------
  // _loadSavedEntries — Loads saved entries from SharedPreferences.
  // Also migrates the current form values as a new entry if they are complete
  // and not already in the list. Removes the legacy key after loading.
  // ------------------------------------------------------------------------
  Future<void> _loadSavedEntries() async {
    final preferences = await SharedPreferences.getInstance();
    await _removeLegacySavedUserDetailsKey(preferences);
    final savedUserDetailsKey = await _resolveSavedUserDetailsKey();
    final rawSavedEntries = savedUserDetailsKey == null
        ? null
        : preferences.getString(savedUserDetailsKey);

    final loadedEntries = <_SavedUserDetailsEntry>[];
    if (rawSavedEntries != null && rawSavedEntries.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawSavedEntries) as List<dynamic>;
        loadedEntries.addAll(
          decoded
              .whereType<Map<String, dynamic>>()
              .map(_SavedUserDetailsEntry.fromJson)
              .where((entry) => entry.isComplete),
        );
      } catch (_) {}
    }

    // If the current form has complete details, add it as a new saved entry
    // if it does not already exist in the loaded list.
    if (_hasInitialDetails) {
      final initialEntry = _SavedUserDetailsEntry(
        id: _createEntryId(),
        name: widget.initialName.trim(),
        contactNumber: widget.initialContactNumber.trim(),
        address: widget.initialAddress.trim(),
        addressDetails: widget.initialAddressDetails.trim(),
      );
      final alreadyExists = loadedEntries.any(
        (entry) => entry.matches(
          name: initialEntry.name,
          contactNumber: initialEntry.contactNumber,
          address: initialEntry.address,
          addressDetails: initialEntry.addressDetails,
        ),
      );
      if (!alreadyExists) {
        loadedEntries.insert(0, initialEntry);
        await _persistSavedEntries(loadedEntries);
      }
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _savedEntries
        ..clear()
        ..addAll(loadedEntries);
      _isLoading = false;
      _isEditSelectionMode = false;
    });
  }

  // ------------------------------------------------------------------------
  // _persistSavedEntries — Serializes the entries list to JSON and saves it
  // to SharedPreferences under the current user's key.
  // ------------------------------------------------------------------------
  Future<void> _persistSavedEntries(
    List<_SavedUserDetailsEntry> entries,
  ) async {
    final preferences = await SharedPreferences.getInstance();
    await _removeLegacySavedUserDetailsKey(preferences);
    final savedUserDetailsKey = await _resolveSavedUserDetailsKey();
    if (savedUserDetailsKey == null) {
      return;
    }

    await preferences.setString(
      savedUserDetailsKey,
      jsonEncode([
        for (final entry in entries) entry.toJson(),
      ]),
    );
  }

  // ------------------------------------------------------------------------
  // _openAddDetailsForm — Opens the _UserDetailsEditorPage as a new route
  // for adding a fresh address entry. After the editor closes, processes
  // the result via _handleEditorResult.
  // ------------------------------------------------------------------------
  Future<void> _openAddDetailsForm() async {
    final result = await Navigator.of(context).push<_UserDetailsEditorResult>(
      MaterialPageRoute<_UserDetailsEditorResult>(
        builder: (_) => const _UserDetailsEditorPage(),
      ),
    );

    if (!mounted || result == null) {
      return;
    }

    await _handleEditorResult(result);
  }

  // ------------------------------------------------------------------------
  // _selectSavedEntry — Called when the user taps a saved entry in normal
  // (non-edit) mode. Packages the entry data into a UserDetailsResult and
  // pops it back to the previous screen.
  // ------------------------------------------------------------------------
  void _selectSavedEntry(_SavedUserDetailsEntry entry) {
    Navigator.of(context).pop(
      UserDetailsResult(
        name: entry.name,
        contactNumber: entry.contactNumber,
        address: entry.address,
        addressDetails: entry.addressDetails,
      ),
    );
  }

  // ------------------------------------------------------------------------
  // _handleSavedEntryTap — Routes a tap on a saved entry. In edit mode, opens
  // the editor. In normal mode, selects the entry.
  // ------------------------------------------------------------------------
  void _handleSavedEntryTap(_SavedUserDetailsEntry entry) {
    if (_isEditSelectionMode) {
      Future<void>.microtask(() => _openEditEntry(entry));
      return;
    }

    _selectSavedEntry(entry);
  }

  // ------------------------------------------------------------------------
  // _openEditEntry — Opens the _UserDetailsEditorPage pre-filled with an
  // existing entry's data for editing. After the editor closes, processes
  // the result via _handleEditorResult.
  // ------------------------------------------------------------------------
  Future<void> _openEditEntry(_SavedUserDetailsEntry entry) async {
    final result = await Navigator.of(context).push<_UserDetailsEditorResult>(
      MaterialPageRoute<_UserDetailsEditorResult>(
        builder: (_) => _UserDetailsEditorPage(
          initialEntry: entry,
        ),
      ),
    );

    if (!mounted || result == null) {
      return;
    }

    await _handleEditorResult(result);
  }

  // ------------------------------------------------------------------------
  // _toggleEditSelectionMode — Toggles between normal mode (tap to select)
  // and edit mode (tap to edit). Does nothing if there are no saved entries.
  // ------------------------------------------------------------------------
  void _toggleEditSelectionMode() {
    if (_savedEntries.isEmpty) {
      return;
    }

    setState(() {
      _isEditSelectionMode = !_isEditSelectionMode;
    });
  }

  // ------------------------------------------------------------------------
  // _handleEditorResult — Processes the result returned by _UserDetailsEditorPage.
  // - For 'saved': updates or inserts the entry, ensures only one default entry
  //   exists, persists to SharedPreferences, and returns the result to caller.
  // - For 'deleted': removes the entry from the list, persists, and shows a
  //   success message.
  // ------------------------------------------------------------------------
  Future<void> _handleEditorResult(_UserDetailsEditorResult result) async {
    switch (result.action) {
      case _UserDetailsEditorAction.saved:
        final nextEntry = result.entry;
        if (nextEntry == null) {
          return;
        }

        // Remove the original entry if it was being edited (by id match).
        _SavedUserDetailsEntry? originalEditingEntry;
        final editingIndex = _savedEntries.indexWhere(
          (entry) => entry.id == nextEntry.id,
        );
        if (editingIndex >= 0) {
          originalEditingEntry = _savedEntries.removeAt(editingIndex);
        }

        // Check if an entry with the same fields (but different id) already
        // exists — in that case, remove it to avoid duplicates.
        final existingIndex = _savedEntries.indexWhere(
          (entry) => entry.matches(
            name: nextEntry.name,
            contactNumber: nextEntry.contactNumber,
            address: nextEntry.address,
            addressDetails: nextEntry.addressDetails,
          ),
        );

        final matchedExisting =
            existingIndex >= 0 ? _savedEntries.removeAt(existingIndex) : null;
        var entryToInsert = nextEntry;

        // Preserve the default flag: if the original entry or a matched entry
        // was the default, keep the new entry as default too.
        if (!entryToInsert.isDefault &&
            (matchedExisting?.isDefault == true ||
                originalEditingEntry?.isDefault == true)) {
          entryToInsert = nextEntry.copyWith(isDefault: true);
        }

        // If the saved entry is marked as default, clear the default flag
        // from all other entries to ensure only one default exists.
        if (entryToInsert.isDefault) {
          for (var index = 0; index < _savedEntries.length; index++) {
            if (_savedEntries[index].isDefault) {
              _savedEntries[index] = _savedEntries[index].copyWith(
                isDefault: false,
              );
            }
          }
        }

        // Insert the new/updated entry at the top of the list.
        _savedEntries.insert(0, entryToInsert);
        await _persistSavedEntries(_savedEntries);

        if (!mounted) {
          return;
        }

        // Return the saved entry's data to the previous screen.
        Navigator.of(context).pop(
          UserDetailsResult(
            name: entryToInsert.name,
            contactNumber: entryToInsert.contactNumber,
            address: entryToInsert.address,
            addressDetails: entryToInsert.addressDetails,
          ),
        );

      case _UserDetailsEditorAction.deleted:
        final deletedEntryId = result.deletedEntryId;
        if (deletedEntryId == null || deletedEntryId.isEmpty) {
          return;
        }

        setState(() {
          _savedEntries.removeWhere((entry) => entry.id == deletedEntryId);
        });
        await _persistSavedEntries(_savedEntries);

        if (!mounted) {
          return;
        }

        _showMessage('Details deleted.');
    }
  }

  // ------------------------------------------------------------------------
  // _showMessage — Displays a success snack bar at the bottom of the screen.
  // ------------------------------------------------------------------------
  void _showMessage(String message) {
    AppSnackBar.showSuccess(
      context,
      message: message,
    );
  }

  // ------------------------------------------------------------------------
  // _createEntryId — Generates a unique string ID for a new saved entry using
  // the current timestamp in microseconds. Guaranteed to be unique under
  // normal operating conditions.
  // ------------------------------------------------------------------------
  String _createEntryId() => DateTime.now().microsecondsSinceEpoch.toString();

  // ------------------------------------------------------------------------
  // _isCurrentEntry — Returns true if the given saved entry exactly matches
  // the initial values passed to this page (the entry currently displayed
  // on the form). Used to show a "Current" badge on the matching saved entry.
  // ------------------------------------------------------------------------
  bool _isCurrentEntry(_SavedUserDetailsEntry entry) {
    return entry.matches(
      name: widget.initialName.trim(),
      contactNumber: widget.initialContactNumber.trim(),
      address: widget.initialAddress.trim(),
      addressDetails: widget.initialAddressDetails.trim(),
    );
  }

  // ------------------------------------------------------------------------
  // _handleBack — Handles the back navigation button. If in edit selection
  // mode, exits the mode instead of popping. Otherwise pops without a result.
  // ------------------------------------------------------------------------
  void _handleBack() {
    if (_isEditSelectionMode) {
      setState(() {
        _isEditSelectionMode = false;
      });
      return;
    }

    Navigator.of(context).maybePop();
  }

  // ========================================================================
  // build — Composes the full page UI:
  //   - AppBar with back button and edit-mode toggle
  //   - List of saved entries (or empty state / loading indicator)
  //   - Bottom "Add Details" bar when not in edit mode and entries exist
  // ========================================================================
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: IconButton(
          onPressed: _handleBack,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        backgroundColor: surfaceColor,
        foregroundColor: theme.colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        title: Text(
          'User Details',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          if (_savedEntries.isNotEmpty)
            IconButton(
              onPressed: _toggleEditSelectionMode,
              icon: Icon(
                _isEditSelectionMode
                    ? Icons.close_rounded
                    : Icons.edit_outlined,
              ),
              tooltip: _isEditSelectionMode ? 'Cancel edit' : 'Edit',
            ),
        ],
      ),
      bottomNavigationBar: _savedEntries.isNotEmpty && !_isEditSelectionMode
          ? _UserDetailsFooterBar(
              surfaceColor: surfaceColor,
              primaryColor: primaryColor,
              label: 'Add Details',
              onPressed: _openAddDetailsForm,
            )
          : null,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _savedEntries.isEmpty
              ? _UserDetailsEmptyState(
                  primaryColor: primaryColor,
                  secondaryColor: secondaryColor,
                  onAddDetails: _openAddDetailsForm,
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(0, 16, 0, 120),
                  children: [
                    _SavedUserDetailsGroup(
                      entries: _savedEntries,
                      isCurrentEntry: _isCurrentEntry,
                      onTapEntry: _handleSavedEntryTap,
                    ),
                  ],
                ),
    );
  }
}

// ========================================================================
// _UserDetailsEditorAction
//
// Enum representing the two possible outcomes when the user finishes
// interacting with the _UserDetailsEditorPage: saved or deleted.
// ========================================================================
enum _UserDetailsEditorAction { saved, deleted }

// ========================================================================
// _UserDetailsEditorResult
//
// Result object returned by _UserDetailsEditorPage when it closes.
// Uses a factory constructor pattern to enforce that exactly one of
// entry or deletedEntryId is set based on the action.
// ========================================================================
class _UserDetailsEditorResult {
  const _UserDetailsEditorResult.saved(this.entry)
      : action = _UserDetailsEditorAction.saved,
        deletedEntryId = null;

  const _UserDetailsEditorResult.deleted(this.deletedEntryId)
      : action = _UserDetailsEditorAction.deleted,
        entry = null;

  final _UserDetailsEditorAction action;
  final _SavedUserDetailsEntry? entry;
  final String? deletedEntryId;
}

// ========================================================================
// _SavedUserDetailsEntry
//
// Immutable data model for a single saved address/contact entry.
// Stored as a JSON list in SharedPreferences under the user's account key.
// ========================================================================
class _SavedUserDetailsEntry {
  const _SavedUserDetailsEntry({
    required this.id,
    required this.name,
    required this.contactNumber,
    required this.address,
    this.addressDetails = '',
    this.isDefault = false,
  });

  // ------------------------------------------------------------------------
  // fromJson — Factory constructor that deserializes a JSON map into an
  // _SavedUserDetailsEntry instance. All fields default to empty strings if
  // missing or null, ensuring the entry is always in a valid state.
  // ------------------------------------------------------------------------
  factory _SavedUserDetailsEntry.fromJson(Map<String, dynamic> json) {
    return _SavedUserDetailsEntry(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      contactNumber: json['contactNumber']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      addressDetails: json['addressDetails']?.toString() ?? '',
      isDefault: json['isDefault'] == true,
    );
  }

  // ------------------------------------------------------------------------
  // Field declarations — each field stores a piece of the user's address data.
  // id: Unique identifier for this entry (generated from microsecondsSinceEpoch).
  // name: Recipient's full name.
  // contactNumber: Phone number for delivery contact.
  // address: Full street address.
  // addressDetails: Optional landmark or additional address info.
  // isDefault: Whether this entry is the user's preferred default.
  // ------------------------------------------------------------------------
  final String id;
  final String name;
  final String contactNumber;
  final String address;
  final String addressDetails;
  final bool isDefault;

  // ------------------------------------------------------------------------
  // isComplete — Returns true only when name, contactNumber, and address all
  // have non-empty trimmed values. Used to validate entries before saving.
  // ------------------------------------------------------------------------
  bool get isComplete =>
      name.trim().isNotEmpty &&
      contactNumber.trim().isNotEmpty &&
      address.trim().isNotEmpty;

  // ------------------------------------------------------------------------
  // matches — Compares all fields of this entry against the given values
  // (ignoring leading/trailing whitespace). Used to detect whether the user's
  // current form input matches an existing saved entry.
  // ------------------------------------------------------------------------
  bool matches({
    required String name,
    required String contactNumber,
    required String address,
    required String addressDetails,
  }) {
    return this.name.trim() == name.trim() &&
        this.contactNumber.trim() == contactNumber.trim() &&
        this.address.trim() == address.trim() &&
        this.addressDetails.trim() == addressDetails.trim();
  }

  // ------------------------------------------------------------------------
  // toJson — Serializes this entry to a JSON-compatible map for storage
  // in SharedPreferences.
  // ------------------------------------------------------------------------
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'contactNumber': contactNumber,
      'address': address,
      'addressDetails': addressDetails,
      'isDefault': isDefault,
    };
  }

  // ------------------------------------------------------------------------
  // copyWith — Creates a new instance with the same values as this entry,
  // optionally overriding specific fields. Used when editing an entry to
  // produce a modified copy.
  // ------------------------------------------------------------------------
  _SavedUserDetailsEntry copyWith({
    String? id,
    String? name,
    String? contactNumber,
    String? address,
    String? addressDetails,
    bool? isDefault,
  }) {
    return _SavedUserDetailsEntry(
      id: id ?? this.id,
      name: name ?? this.name,
      contactNumber: contactNumber ?? this.contactNumber,
      address: address ?? this.address,
      addressDetails: addressDetails ?? this.addressDetails,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}

// ========================================================================
// _UserDetailsEditorPage
//
// Editor page for adding or editing a single saved address entry.
// Displays a form with four input fields (name, contact, address, address
// details), a live Google Maps preview, and a "Set as default" toggle.
// Validates inputs before returning a _UserDetailsEditorResult to the caller.
// ========================================================================
class _UserDetailsEditorPage extends StatefulWidget {
  const _UserDetailsEditorPage({
    this.initialEntry,
  });

  // initialEntry — If provided, the page opens in edit mode pre-filled with
  // the existing entry's data. If null, opens in add mode with empty fields.
  final _SavedUserDetailsEntry? initialEntry;

  @override
  State<_UserDetailsEditorPage> createState() => _UserDetailsEditorPageState();
}

// ========================================================================
// _UserDetailsEditorPageState
//
// Manages the editor form state: text controllers, validation, save, and delete.
// Validates that name, contact (with phone number regex), and address are
// non-empty before allowing a save. Contact validation allows 7-15 digits
// with optional leading "+" and optional spaces/dashes as separators.
// ========================================================================
class _UserDetailsEditorPageState extends State<_UserDetailsEditorPage> {
  // ------------------------------------------------------------------------
  // Text controllers — one per form field.
  // ------------------------------------------------------------------------
  late final TextEditingController _nameController;
  late final TextEditingController _contactController;
  late final TextEditingController _addressController;
  late final TextEditingController _addressDetailsController;

  // ------------------------------------------------------------------------
  // _setsAsDefault — Controls the "Set as default" CupertinoSwitch.
  // ------------------------------------------------------------------------
  late bool _setsAsDefault;

  // ------------------------------------------------------------------------
  // Validation getters — return true when each field has a non-empty value.
  // ------------------------------------------------------------------------
  bool get _hasName => _nameController.text.trim().isNotEmpty;
  bool get _hasAddress => _addressController.text.trim().isNotEmpty;
  bool get _hasContact => _contactController.text.trim().isNotEmpty;

  // ------------------------------------------------------------------------
  // _hasValidContact — Validates the contact number using a regex that allows
  // 7-15 digits, optional leading "+", and optional spaces/dashes as separators.
  // ------------------------------------------------------------------------
  bool get _hasValidContact {
    final normalizedContact = _contactController.text
        .replaceAll(' ', '')
        .replaceAll('-', '')
        .trim();
    final contactPattern = RegExp(r'^\+?[0-9]{7,15}$');
    return contactPattern.hasMatch(normalizedContact);
  }

  // ------------------------------------------------------------------------
  // _isEditing — True when an existing entry was passed in; false for add mode.
  // ------------------------------------------------------------------------
  bool get _isEditing => widget.initialEntry != null;

  @override
  void initState() {
    super.initState();
    // Pre-fill controllers from the existing entry if editing.
    final initialEntry = widget.initialEntry;
    _nameController = TextEditingController(text: initialEntry?.name ?? '');
    _contactController = TextEditingController(
      text: initialEntry?.contactNumber ?? '',
    );
    _addressController = TextEditingController(text: initialEntry?.address ?? '');
    _addressDetailsController = TextEditingController(
      text: initialEntry?.addressDetails ?? '',
    );
    _setsAsDefault = initialEntry?.isDefault ?? false;
  }

  @override
  void dispose() {
    // Clean up controllers to prevent memory leaks.
    _nameController.dispose();
    _contactController.dispose();
    _addressController.dispose();
    _addressDetailsController.dispose();
    super.dispose();
  }

  // ------------------------------------------------------------------------
  // _showMessage — Shows an error snack bar for validation failures.
  // ------------------------------------------------------------------------
  void _showMessage(String message) {
    AppSnackBar.showError(
      context,
      message: message,
    );
  }

  // ------------------------------------------------------------------------
  // _handleSave — Validates all fields and, if valid, creates a new or updated
  // _SavedUserDetailsEntry and pops the result back to _UserDetailsPageState.
  // Reuses the existing entry id if editing; generates a new id if adding.
  // ------------------------------------------------------------------------
  void _handleSave() {
    if (!_hasName) {
      _showMessage('Please enter the client name.');
      return;
    }

    if (!_hasContact) {
      _showMessage('Please enter the contact number.');
      return;
    }

    if (!_hasValidContact) {
      _showMessage('Please enter a valid contact number.');
      return;
    }

    if (!_hasAddress) {
      _showMessage('Please enter the delivery address.');
      return;
    }

    final entry = _SavedUserDetailsEntry(
      id: widget.initialEntry?.id ??
          DateTime.now().microsecondsSinceEpoch.toString(),
      name: _nameController.text.trim(),
      contactNumber: _contactController.text.trim(),
      address: _addressController.text.trim(),
      addressDetails: _addressDetailsController.text.trim(),
      isDefault: _setsAsDefault,
    );

    Navigator.of(context).pop(
      _UserDetailsEditorResult.saved(entry),
    );
  }

  // ------------------------------------------------------------------------
  // _handleDelete — Returns a deleted result to _UserDetailsPageState using
  // the original entry's id. Only callable in edit mode.
  // ------------------------------------------------------------------------
  void _handleDelete() {
    final initialEntry = widget.initialEntry;
    if (initialEntry == null) {
      return;
    }

    Navigator.of(context).pop(
      _UserDetailsEditorResult.deleted(initialEntry.id),
    );
  }

  // ========================================================================
  // build — Composes the editor form:
  //   - AppBar with title ("Add Details" or "Edit Details") and delete button
  //   - Four text fields: name, contact, address, address details
  //   - Live Google Maps preview that updates as the address changes
  //   - "Set as default" toggle switch
  //   - Bottom "Save Info" button bar
  // ========================================================================
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: AppBar(
        backgroundColor: surfaceColor,
        foregroundColor: theme.colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        title: Text(
          _isEditing ? 'Edit Details' : 'Add Details',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          if (_isEditing)
            IconButton(
              onPressed: _handleDelete,
              icon: const Icon(Icons.delete_outline_rounded),
              tooltip: 'Delete',
            ),
        ],
      ),
      bottomNavigationBar: _UserDetailsFooterBar(
        surfaceColor: surfaceColor,
        primaryColor: primaryColor,
        label: 'Save Info',
        onPressed: _handleSave,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        children: [
          TextField(
            controller: _nameController,
            textInputAction: TextInputAction.next,
            decoration: _withUserDetailsFieldRadius(
              context,
              const InputDecoration(
                labelText: 'Client Name',
                hintText: 'Enter full name',
                prefixIcon: Icon(Icons.person_outline_rounded),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _contactController,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
            decoration: _withUserDetailsFieldRadius(
              context,
              const InputDecoration(
                labelText: 'Contact Number',
                hintText: 'e.g. 09171234567',
                prefixIcon: Icon(Icons.call_outlined),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _addressController,
            maxLines: 1,
            minLines: 1,
            textInputAction: TextInputAction.next,
            onChanged: (_) {
              setState(() {});
            },
            decoration: _withUserDetailsFieldRadius(
              context,
              const InputDecoration(
                labelText: 'Address',
                hintText: 'Enter delivery address',
                alignLabelWithHint: true,
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
            ),
          ),
          const SizedBox(height: 14),
          _UserDetailsMapPreview(
            addressPreview: _addressController.text.trim(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _addressDetailsController,
            textInputAction: TextInputAction.done,
            decoration: _withUserDetailsFieldRadius(
              context,
              const InputDecoration(
                labelText: 'Address Code',
                hintText: 'Landmark (optional)',
                prefixIcon: Icon(Icons.home_outlined),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Set as default',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              CupertinoSwitch(
                value: _setsAsDefault,
                activeTrackColor: primaryColor,
                inactiveTrackColor: Colors.grey.shade400,
                thumbColor: Colors.white,
                onChanged: (value) {
                  setState(() {
                    _setsAsDefault = value;
                  });
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ========================================================================
// _UserDetailsEmptyState
//
// Displayed when the user has no saved address entries yet.
// Shows an icon, a title, a descriptive message, and an "Add Details" button.
// ========================================================================
class _UserDetailsEmptyState extends StatelessWidget {
  const _UserDetailsEmptyState({
    required this.primaryColor,
    required this.secondaryColor,
    required this.onAddDetails,
  });

  // primaryColor — App's primary color for the icon.
  final Color primaryColor;
  // secondaryColor — Muted text color for the description.
  final Color secondaryColor;
  // onAddDetails — Callback invoked when the "Add Details" button is tapped.
  final VoidCallback onAddDetails;

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
              Icons.badge_outlined,
              size: 34,
              color: primaryColor,
            ),
            const SizedBox(height: 14),
            Text(
              'No details yet',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Add saved user details so you can quickly choose the right location whenever you are in a different place.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: secondaryColor,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            FractionallySizedBox(
              widthFactor: 0.5,
              child: FilledButton(
                onPressed: onAddDetails,
                child: const Text('Add Details'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ========================================================================
// _withUserDetailsFieldRadius
//
// Utility function that wraps an InputDecoration and applies the app's
// standard field border radius (_userDetailsFieldBorderRadius) to all border
// variants (enabled, focused, disabled, error, focusedError).
// This ensures consistent rounded corners across all TextField decorations
// in the user details editor.
// ========================================================================
InputDecoration _withUserDetailsFieldRadius(
  BuildContext context,
  InputDecoration decoration,
) {
  // resolveBorder — Converts any InputBorder into an OutlineInputBorder with
  // the standard rounded corners. If the border is already OutlineInputBorder,
  // just updates its borderRadius. Otherwise creates a new OutlineInputBorder
  // using the existing side style (UnderlineInputBorder side or a default divider).
  OutlineInputBorder resolveBorder(InputBorder? border) {
    if (border is OutlineInputBorder) {
      return border.copyWith(borderRadius: _userDetailsFieldBorderRadius);
    }

    final borderSide = border is UnderlineInputBorder
        ? border.borderSide
        : BorderSide(
            color: Theme.of(context).dividerColor.withOpacity(0.18),
          );

    return OutlineInputBorder(
      borderRadius: _userDetailsFieldBorderRadius,
      borderSide: borderSide,
    );
  }

  final inputTheme = Theme.of(context).inputDecorationTheme;

  // Apply rounded corners to every border variant, falling back to the base
  // border when a specific variant is not defined in the theme.
  return decoration.copyWith(
    border: resolveBorder(inputTheme.border),
    enabledBorder: resolveBorder(
      inputTheme.enabledBorder ?? inputTheme.border,
    ),
    focusedBorder: resolveBorder(
      inputTheme.focusedBorder ?? inputTheme.enabledBorder ?? inputTheme.border,
    ),
    disabledBorder: resolveBorder(
      inputTheme.disabledBorder ?? inputTheme.enabledBorder ?? inputTheme.border,
    ),
    errorBorder: resolveBorder(
      inputTheme.errorBorder ?? inputTheme.enabledBorder ?? inputTheme.border,
    ),
    focusedErrorBorder: resolveBorder(
      inputTheme.focusedErrorBorder ??
          inputTheme.errorBorder ??
          inputTheme.focusedBorder ??
          inputTheme.enabledBorder ??
          inputTheme.border,
    ),
  );
}

// ========================================================================
// _UserDetailsAirmailBorderStrip
//
// A decorative horizontal strip rendered at the top and bottom of the
// saved address group list. It uses a CustomPainter to draw alternating
// red and blue diagonal stripes, evoking airmail (aerogram) stationery.
// ========================================================================
class _UserDetailsAirmailBorderStrip extends StatelessWidget {
  const _UserDetailsAirmailBorderStrip();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // headerSurfaceColor — Background color for the strip, matching the
    // surface color from the input decoration theme.
    final headerSurfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return SizedBox(
      height: 8,
      child: CustomPaint(
        painter: _UserDetailsAirmailBorderPainter(
          backgroundColor: headerSurfaceColor,
        ),
      ),
    );
  }
}

// ========================================================================
// _UserDetailsAirmailBorderPainter
//
// CustomPainter that draws the airmail-style diagonal stripe pattern:
// alternating red and blue diagonal bands over a solid background.
// The stripes are drawn using Path objects with a fixed slant and spacing.
// ========================================================================
class _UserDetailsAirmailBorderPainter extends CustomPainter {
  const _UserDetailsAirmailBorderPainter({
    required this.backgroundColor,
  });

  // backgroundColor — The solid fill color behind the stripes.
  final Color backgroundColor;

  // _red and _blue — The two alternating stripe colors (French airmail colors).
  static const Color _red = Color(0xFFD84C5A);
  static const Color _blue = Color(0xFF4F7FEA);

  @override
  void paint(Canvas canvas, Size size) {
    // Draw the solid background rectangle first.
    final backgroundPaint = Paint()..color = backgroundColor;
    canvas.drawRect(Offset.zero & size, backgroundPaint);

    // Stripe geometry constants.
    const stripeWidth = 18.0;   // Width of each diagonal stripe.
    const stripeGap = 10.0;      // Gap between consecutive stripes.
    const stripeSlant = 12.0;    // Horizontal offset from top to bottom of each stripe (creates the slant).
    final stripePaint = Paint()..style = PaintingStyle.fill;

    // Iterate across the canvas, drawing alternating red/blue diagonal stripes.
    // Start slightly off-screen (negative x) to ensure full coverage.
    var stripeIndex = 0;
    for (double x = -stripeWidth; x < size.width + stripeWidth; x += stripeWidth + stripeGap) {
      stripePaint.color = stripeIndex.isEven ? _red : _blue;
      final path = Path()
        ..moveTo(x, 1)                                          // Top-left corner of stripe
        ..lineTo(x + stripeWidth, 1)                            // Top-right corner
        ..lineTo(x + stripeWidth - stripeSlant, size.height - 1) // Bottom-right (slanted left)
        ..lineTo(x - stripeSlant, size.height - 1)              // Bottom-left (slanted left)
        ..close();
      canvas.drawPath(path, stripePaint);
      stripeIndex++;
    }
  }

  // Repaint only when the background color changes.
  @override
  bool shouldRepaint(covariant _UserDetailsAirmailBorderPainter oldDelegate) =>
      oldDelegate.backgroundColor != backgroundColor;
}

// ========================================================================
// _UserDetailsMapPreview
//
// A StatefulWidget that wraps a WebView to display a live Google Maps embed
// for the given address string. It shows a loading progress bar while the
// map is loading and an error state with a reload button if the map fails.
// The map automatically reloads when the address changes (debounced by 450ms).
// ========================================================================
class _UserDetailsMapPreview extends StatefulWidget {
  const _UserDetailsMapPreview({
    required this.addressPreview,
  });

  // addressPreview — The full address string used to generate the Google Maps embed URL.
  final String addressPreview;
  // borderRadius — Corner radius for the map container. Defaults to 8 logical pixels.
  final double borderRadius;

  @override
  State<_UserDetailsMapPreview> createState() => _UserDetailsMapPreviewState();
}

// ========================================================================
// _UserDetailsMapPreviewState
//
// Manages the WebViewController for the embedded map, tracks loading progress,
// handles navigation errors, and schedules map reloads when the address changes.
// Uses a 3-second fallback timer to dismiss the progress bar if the map stalls.
// ========================================================================
class _UserDetailsMapPreviewState extends State<_UserDetailsMapPreview> {
  late final WebViewController _mapController;
  Timer? _reloadTimer;           // Debounce timer for address-change reloads.
  Timer? _loadingFallbackTimer;  // Fallback timer to clear progress bar if map stalls.
  String _loadedMapUrl = '';     // Tracks the currently loaded map URL to skip redundant loads.
  int _loadProgress = 0;         // WebView loading progress (0–100).
  bool _hasMapError = false;     // Set to true when the main frame fails to load.

  @override
  void initState() {
    super.initState();
    // Initialize the WebViewController with unrestricted JavaScript (required for Maps embed)
    // and transparent background so the container color shows through.
    _mapController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          // onProgress — Updates _loadProgress as the page loads (0–100).
          onProgress: (progress) {
            if (!mounted) return;
            setState(() => _loadProgress = progress);
          },
          // onPageStarted — Resets progress and error state when a new page load begins.
          onPageStarted: (_) {
            _loadingFallbackTimer?.cancel();
            if (!mounted) return;
            setState(() {
              _loadProgress = 0;
              _hasMapError = false;
            });
          },
          // onPageFinished — Marks loading as complete (100%) when the page finishes.
          onPageFinished: (_) {
            _loadingFallbackTimer?.cancel();
            if (!mounted) return;
            setState(() => _loadProgress = 100);
          },
          // onWebResourceError — Sets _hasMapError only for main-frame errors (ignore sub-resource errors).
          onWebResourceError: (error) {
            if (error.isForMainFrame == false) return;
            if (!mounted) return;
            setState(() => _hasMapError = true);
          },
        ),
      );
    _loadMap(widget.addressPreview);
  }

  // didUpdateWidget — Detects when the address prop changes and schedules a debounced reload.
  @override
  void didUpdateWidget(covariant _UserDetailsMapPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.addressPreview.trim() != widget.addressPreview.trim()) {
      _scheduleMapReload();
    }
  }

  @override
  void dispose() {
    _reloadTimer?.cancel();
    _loadingFallbackTimer?.cancel();
    super.dispose();
  }

  // _scheduleMapReload — Cancels any pending reload and schedules a new one after 450ms.
  // This debounces rapid address changes (e.g., while the user is typing).
  void _scheduleMapReload() {
    _reloadTimer?.cancel();
    _reloadTimer = Timer(const Duration(milliseconds: 450), () {
      if (mounted) _loadMap(widget.addressPreview);
    });
  }

  // _loadMap — Generates the embed URL from the address and loads it into the WebView.
  // Skips the load if the URL hasn't changed. Resets progress/error state and starts
  // a 3-second fallback timer to clear the progress bar if the map stalls.
  void _loadMap(String address) {
    final nextMapUrl = _userDetailsGoogleMapEmbedUrl(address);
    if (_loadedMapUrl == nextMapUrl) return; // Skip if URL unchanged.
    _loadedMapUrl = nextMapUrl;
    if (mounted) {
      setState(() {
        _loadProgress = 0;
        _hasMapError = false;
      });
    }
    _loadingFallbackTimer?.cancel();
    // Fallback: if progress hasn't reached 100% after 3 seconds, force it to 100%
    // to dismiss the progress bar (prevents it from being stuck on slow connections).
    _loadingFallbackTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted || _loadProgress >= 100) return;
      setState(() => _loadProgress = 100);
    });
    unawaited(
      _mapController.loadHtmlString(
        _userDetailsGoogleMapHtml(nextMapUrl),
        baseUrl: 'https://www.google.com',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return SizedBox(
      width: double.infinity,
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              // The WebView widget filling the entire container.
              Positioned.fill(
                child: WebViewWidget(
                  controller: _mapController,
                  gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                    Factory<OneSequenceGestureRecognizer>(
                      () => EagerGestureRecognizer(),
                    ),
                  },
                ),
              ),
              // Linear progress bar shown while the map is loading (before 100% and no error).
              if (_loadProgress < 100 && !_hasMapError)
                Positioned(
                  left: 0,
                  right: 0,
                  top: 0,
                  child: LinearProgressIndicator(
                    minHeight: 3,
                    value: _loadProgress <= 0 ? null : _loadProgress / 100,
                    color: primaryColor,
                    backgroundColor: primaryColor.withOpacity(0.12),
                  ),
                ),
              // Error overlay — shown when the main frame fails to load.
              // Displays a semi-transparent background with a refresh button.
              if (_hasMapError)
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: surfaceColor.withOpacity(0.94),
                    ),
                    child: Center(
                      child: IconButton(
                        onPressed: () => _loadMap(widget.addressPreview),
                        icon: Icon(
                          Icons.refresh_rounded,
                          color: primaryColor,
                        ),
                        tooltip: 'Reload map',
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ========================================================================
// _UserDetailsFooterBar
//
// A bottom action bar that displays a full-width FilledButton.
// It respects safe area insets (notch, home indicator) and dynamically
// sizes the button height based on available space, snapping to standard
// Material button heights (52 or 56 logical pixels) when possible.
// ========================================================================
class _UserDetailsFooterBar extends StatelessWidget {
  const _UserDetailsFooterBar({
    required this.surfaceColor,
    required this.primaryColor,
    required this.label,
    required this.onPressed,
  });

  // surfaceColor — Background color of the footer bar.
  final Color surfaceColor;
  // primaryColor — Background color of the FilledButton.
  final Color primaryColor;
  // label — Text displayed inside the button (e.g., "Save Address").
  final String label;
  // onPressed — Callback invoked when the button is tapped.
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // bottomPadding — Space reserved for the system home indicator / navigation bar.
    final bottomPadding = MediaQuery.paddingOf(context).bottom;
    // topPadding — Space reserved for the status bar / notch at the top.
    final topPadding = MediaQuery.paddingOf(context).top;

    // minimumHeight — The bar must be at least 64px tall plus the bottom padding.
    final minimumHeight = bottomPadding + 64.0;
    // targetHeight — The bar should be tall enough to clear the top status bar.
    final targetHeight = topPadding + kToolbarHeight;
    // resolvedHeight — Use whichever is taller: the minimum or the target.
    final resolvedHeight =
        targetHeight > minimumHeight ? targetHeight : minimumHeight;

    // contentHeight — The height available for the button after subtracting bottom padding.
    final contentHeight = resolvedHeight - bottomPadding;
    // controlHeight — Snap to 52 or 56 px if content height is close, otherwise use actual height.
    final controlHeight = contentHeight <= 52
        ? 52.0
        : contentHeight >= 56
            ? 56.0
            : contentHeight;
    // buttonHeight — The actual button is 8px smaller than the control for padding.
    final buttonHeight = controlHeight - 8;

    // foregroundColor — White text on dark backgrounds, dark text on light.
    final foregroundColor = theme.brightness == Brightness.dark
        ? theme.cardColor
        : theme.colorScheme.onPrimary;

    return SizedBox(
      height: resolvedHeight,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: surfaceColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 18,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Padding(
          padding: EdgeInsets.fromLTRB(14, 0, 14, bottomPadding),
          child: Center(
            child: SizedBox(
              height: controlHeight,
              width: double.infinity,
              child: Center(
                child: SizedBox(
                  height: buttonHeight,
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: onPressed,
                    style: FilledButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: foregroundColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      textStyle: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    child: Text(
                      label,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: foregroundColor,
                        fontWeight: FontWeight.w800,
                      ),
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
}

// ========================================================================
// _SavedUserDetailsCard
//
// A single saved address entry card displayed in the saved addresses list.
// Shows the recipient name, address (with optional address details in
// parentheses), contact number, and badges for "Default" and "Current"
// selection states. Tapping the card triggers the onTap callback.
// ========================================================================
class _SavedUserDetailsCard extends StatelessWidget {
  const _SavedUserDetailsCard({
    required this.entry,
    required this.isCurrent,
    required this.onTap,
  });

  // entry — The saved address entry data (name, address, contact, isDefault flag).
  final _SavedUserDetailsEntry entry;
  // isCurrent — True when this entry is the one currently selected for delivery.
  final bool isCurrent;
  // onTap — Callback fired when the user taps this card.
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    // secondaryColor — Muted text color for address and contact lines.
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);

    // addressLabel — If addressDetails (e.g., barangay, landmark) is provided,
    // append it in parentheses; otherwise just show the main address.
    final addressLabel = entry.addressDetails.trim().isEmpty
        ? entry.address
        : '${entry.address} (${entry.addressDetails.trim()})';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Person icon as a visual anchor for the address entry.
              Icon(
                Icons.person_outline_rounded,
                color: primaryColor,
                size: 22,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name row with optional "Default" and "Current" badges.
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            entry.name,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        // "Default" badge — shown when this entry is the user's default address.
                        if (entry.isDefault) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: primaryColor.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Default',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: primaryColor,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        // "Current" badge — shown when this entry is currently selected in the UI.
                        if (isCurrent)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            child: Text(
                              'Current',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: primaryColor,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Address line — includes address details in parentheses if available.
                    Text(
                      addressLabel,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: secondaryColor,
                        fontWeight: FontWeight.w400,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Contact number line.
                    Text(
                      entry.contactNumber,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: secondaryColor,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // Chevron icon indicating the card is tappable.
              Icon(
                Icons.chevron_right_rounded,
                color: secondaryColor,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ========================================================================
// _SavedUserDetailsGroup
//
// A container widget that renders a list of saved address entries
// (_SavedUserDetailsCard) with airmail-style border strips at the top
// and bottom. Each card is separated by a thin divider. The whole group
// has a surface-colored background with a subtle drop shadow.
// ========================================================================
class _SavedUserDetailsGroup extends StatelessWidget {
  const _SavedUserDetailsGroup({
    required this.entries,
    required this.isCurrentEntry,
    required this.onTapEntry,
  });

  // entries — The list of saved address entries to display.
  final List<_SavedUserDetailsEntry> entries;
  // isCurrentEntry — Callback that returns true for the currently selected entry.
  final bool Function(_SavedUserDetailsEntry entry) isCurrentEntry;
  // onTapEntry — Callback fired when a saved address card is tapped.
  final ValueChanged<_SavedUserDetailsEntry> onTapEntry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    // dividerColor — Subtle divider between cards (18% opacity of the theme divider color).
    final dividerColor = theme.dividerColor.withOpacity(0.18);

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top airmail border strip.
          const _UserDetailsAirmailBorderStrip(),
          // List of saved address cards with dividers between them.
          for (var index = 0; index < entries.length; index++) ...[
            _SavedUserDetailsCard(
              entry: entries[index],
              isCurrent: isCurrentEntry(entries[index]),
              onTap: () => onTapEntry(entries[index]),
            ),
            // Divider between cards (but not after the last card).
            if (index != entries.length - 1)
              Container(
                height: 1,
                color: dividerColor,
              ),
          ],
          // Bottom airmail border strip.
          const _UserDetailsAirmailBorderStrip(),
        ],
      ),
    );
  }
}
