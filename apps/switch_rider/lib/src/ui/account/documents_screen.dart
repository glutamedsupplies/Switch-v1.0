import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../../photo_picker.dart';
import '../common.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _listKey = GlobalKey();

  Future<void> _upload(String type, Future<void> Function() reload, {bool replacingApproved = false}) async {
    if (replacingApproved) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Replace approved document?'),
          content: const Text('The new photo will need to be reviewed again. Use this when your document was renewed.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Replace')),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }
    final photo = await pickPhoto(context, cameraOnly: type == 'SELFIE');
    if (photo == null || !mounted) return;
    final maxBytes = context.session.meta?.maxUploadBytes ?? 8 * 1024 * 1024;
    if (photo.bytes.length > maxBytes) {
      context.showMessage('Photos must be ${maxBytes ~/ (1024 * 1024)} MB or smaller.', error: true);
      return;
    }
    try {
      final rider = await context.api.uploadDocument(type, photo.bytes, photo.contentType);
      if (!mounted) return;
      context.session.updateProfile(rider);
      context.showMessage('Uploaded. Switch will review it shortly.');
      await reload();
    } catch (error) {
      if (mounted) context.showMessage(errorText(error), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.session.profile;
    final meta = context.session.meta;
    final required = profile?.requiredDocuments ?? const <String>[];
    final optional = ['PROFILE_PHOTO'].where((type) => !required.contains(type)).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: AsyncList<List<RiderDocument>>(
        key: _listKey,
        load: context.api.documents,
        builder: (context, documents, reload) {
          RiderDocument? latest(String type) {
            for (final doc in documents) {
              if (doc.docType == type) return doc;
            }
            return null;
          }

          Widget tile(String type, {required bool isRequired}) {
            final doc = latest(type);
            final label = meta?.documentLabel(type) ?? doc?.label ?? type;
            final (statusText, color) = switch (doc?.reviewStatus) {
              'APPROVED' => ('Approved', SwitchBrand.success),
              'REJECTED' => ('Rejected — upload again', SwitchBrand.danger),
              'PENDING' => ('Under review', SwitchBrand.warning),
              _ => (isRequired ? 'Required' : 'Optional', SwitchBrand.muted),
            };
            final approved = doc?.reviewStatus == 'APPROVED';
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                        StatusChip(statusText, color: color),
                      ],
                    ),
                    if (doc?.reviewNote.isNotEmpty ?? false)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(doc!.reviewNote, style: const TextStyle(color: SwitchBrand.danger)),
                      ),
                    if (doc?.uploadedAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          'Uploaded ${formatDateTime(doc!.uploadedAt)}',
                          style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
                        ),
                      ),
                    if (type == 'SELFIE')
                      const Padding(
                        padding: EdgeInsets.only(top: 6),
                        child: Text(
                          'Take a clear selfie holding your government ID.',
                          style: TextStyle(color: SwitchBrand.muted, fontSize: 12),
                        ),
                      ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton.icon(
                        onPressed: () => _upload(type, reload, replacingApproved: approved),
                        icon: const Icon(Icons.upload_file),
                        label: Text(doc == null ? 'Upload' : 'Replace'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'Documents are private. Only the Switch verification team can see them.',
                style: TextStyle(color: SwitchBrand.muted),
              ),
              const SizedBox(height: 14),
              for (final type in required) tile(type, isRequired: true),
              for (final type in optional) tile(type, isRequired: false),
            ],
          );
        },
      ),
    );
  }
}
