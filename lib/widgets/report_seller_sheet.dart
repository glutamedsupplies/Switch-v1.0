import 'package:flutter/material.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/services/company_report_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/own_listing.dart';

const reportSellerCategories = <Map<String, String>>[
  {'id': 'scam', 'label': 'Scam or fraud by this store'},
  {'id': 'non_delivery', 'label': 'Paid but the store did not deliver'},
  {'id': 'impersonation', 'label': 'Fake store or impersonation'},
  {'id': 'harassment', 'label': 'Harassment or abuse from the store'},
  {'id': 'off_platform', 'label': 'Pressed to pay or chat off Switch'},
  {'id': 'other', 'label': 'Other store policy issue'},
];

Future<void> openReportSellerSheet(
  BuildContext context, {
  required String adminId,
  required String companyName,
  String companyId = '',
  String productId = '',
  String productName = '',
  String orderId = '',
}) async {
  if (!AuthSession.isLoggedInSync) {
    await redirectGuestToLogin(context);
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
        message: 'You cannot report your own company.',
      );
    }
    return;
  }

  final eligibility = await createCompanyReportService()
      .checkSellerReportEligibility(
    adminId: adminId,
    companyId: companyId,
    productId: productId,
  );
  if (!context.mounted) {
    return;
  }
  if (!eligibility.eligible) {
    AppSnackBar.showError(
      context,
      message: eligibility.message.isNotEmpty
          ? eligibility.message
          : 'You can only report a store you have ordered from.',
    );
    return;
  }

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) {
      return _ReportSellerSheet(
        adminId: adminId,
        companyName: companyName,
        companyId: companyId,
        productId: productId,
        productName: productName,
        orderId: orderId,
      );
    },
  );
}

class _ReportSellerSheet extends StatefulWidget {
  const _ReportSellerSheet({
    required this.adminId,
    required this.companyName,
    required this.companyId,
    required this.productId,
    required this.productName,
    required this.orderId,
  });

  final String adminId;
  final String companyName;
  final String companyId;
  final String productId;
  final String productName;
  final String orderId;

  @override
  State<_ReportSellerSheet> createState() => _ReportSellerSheetState();
}

class _ReportSellerSheetState extends State<_ReportSellerSheet> {
  final _detailsController = TextEditingController();
  final _service = createCompanyReportService();
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
            'Choose a reason and explain what happened in at least 20 characters.',
      );
      return;
    }

    setState(() => _submitting = true);
    final result = await _service.submitSellerReport(
      adminId: widget.adminId,
      companyName: widget.companyName,
      companyId: widget.companyId,
      productId: widget.productId,
      productName: widget.productName,
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
              'Report ${widget.companyName}',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This report is about the store, not a product. Super Admin will review ${widget.companyName}. One company report never warns or restricts a store. Use Report this listing for product photos, prohibited items, or counterfeit products.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _category.isEmpty ? null : _category,
              decoration: const InputDecoration(
                labelText: 'What did this store do?',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final item in reportSellerCategories)
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
              child: Text(_submitting ? 'Sending…' : 'Submit report'),
            ),
          ],
        ),
      ),
    );
  }
}
