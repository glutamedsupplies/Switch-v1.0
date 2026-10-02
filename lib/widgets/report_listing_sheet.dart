import 'package:flutter/material.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/services/listing_report_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/own_listing.dart';

const reportListingCategories = <Map<String, String>>[
  {'id': 'misleading_listing', 'label': 'Misleading photos or description'},
  {'id': 'prohibited_item', 'label': 'Prohibited or banned item'},
  {'id': 'counterfeit', 'label': 'Counterfeit or replica product'},
  {'id': 'unsafe_product', 'label': 'Unsafe or hazardous product'},
  {
    'id': 'intellectual_property',
    'label': 'Intellectual property violation',
  },
  {'id': 'price_bait', 'label': 'Fake price or bait-and-switch listing'},
  {'id': 'adult_or_illegal', 'label': 'Adult, illegal, or harmful content'},
  {'id': 'other_listing', 'label': 'Other listing policy issue'},
];

Future<void> openReportListingSheet(
  BuildContext context, {
  required String productId,
  required String productName,
  String adminId = '',
  String companyId = '',
  String companyName = '',
  String orderId = '',
}) async {
  if (!AuthSession.isLoggedInSync) {
    await redirectGuestToLogin(context);
    return;
  }

  if (productId.trim().isEmpty) {
    if (context.mounted) {
      AppSnackBar.showError(
        context,
        message: 'This listing cannot be reported right now.',
      );
    }
    return;
  }

  final scope = await loadOwnListingScope();
  if (listingBelongsToOwnCompany(
    scope: scope,
    adminId: adminId,
    companyId: companyId,
    companyName: companyName,
  )) {
    if (context.mounted) {
      AppSnackBar.showError(
        context,
        message: 'You cannot report your own listing.',
      );
    }
    return;
  }

  final eligibility = await createListingReportService()
      .checkListingReportEligibility(
    productId: productId,
    adminId: adminId,
    companyId: companyId,
  );
  if (!context.mounted) {
    return;
  }
  if (!eligibility.eligible) {
    AppSnackBar.showError(
      context,
      message: eligibility.message.isNotEmpty
          ? eligibility.message
          : 'You can only report a listing you have ordered.',
    );
    return;
  }

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) {
      return _ReportListingSheet(
        productId: productId,
        productName: productName,
        adminId: adminId,
        companyId: companyId,
        companyName: companyName,
        orderId: orderId,
      );
    },
  );
}

class _ReportListingSheet extends StatefulWidget {
  const _ReportListingSheet({
    required this.productId,
    required this.productName,
    required this.adminId,
    required this.companyId,
    required this.companyName,
    required this.orderId,
  });

  final String productId;
  final String productName;
  final String adminId;
  final String companyId;
  final String companyName;
  final String orderId;

  @override
  State<_ReportListingSheet> createState() => _ReportListingSheetState();
}

class _ReportListingSheetState extends State<_ReportListingSheet> {
  final _detailsController = TextEditingController();
  final _service = createListingReportService();
  String _category = '';
  bool _submitting = false;

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reasonText = _detailsController.text.trim();
    if (_category.isEmpty || reasonText.length < 20) {
      AppSnackBar.showError(
        context,
        message:
            'Choose a listing reason and explain what is wrong in at least 20 characters.',
      );
      return;
    }

    setState(() => _submitting = true);
    final result = await _service.submitListingReport(
      productId: widget.productId,
      productName: widget.productName,
      adminId: widget.adminId,
      companyId: widget.companyId,
      companyName: widget.companyName,
      orderId: widget.orderId,
      reasonCategory: _category,
      reasonText: reasonText,
    );
    if (!mounted) {
      return;
    }
    setState(() => _submitting = false);
    if (result.ok) {
      Navigator.of(context).maybePop();
      AppSnackBar.showSuccess(
        context,
        message: result.reportId.isEmpty
            ? result.message
            : result.message.contains(result.reportId)
                ? result.message
                : '${result.message} Report ID: ${result.reportId}',
      );
      return;
    }
    AppSnackBar.showError(context, message: result.message);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Report this listing',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This report is about ${widget.productName}, not the seller company. Super Admin will review the product. One listing report never hides a product by itself.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _category.isEmpty ? null : _category,
              decoration: const InputDecoration(
                labelText: 'What is wrong with this listing?',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final item in reportListingCategories)
                  DropdownMenuItem<String>(
                    value: item['id'],
                    child: Text(item['label'] ?? ''),
                  ),
              ],
              onChanged: _submitting
                  ? null
                  : (value) => setState(() => _category = value ?? ''),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _detailsController,
              minLines: 4,
              maxLines: 6,
              maxLength: 2000,
              enabled: !_submitting,
              decoration: const InputDecoration(
                labelText: 'Tell us what happened',
                alignLabelWithHint: true,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Sending…' : 'Submit listing report'),
            ),
          ],
        ),
      ),
    );
  }
}
