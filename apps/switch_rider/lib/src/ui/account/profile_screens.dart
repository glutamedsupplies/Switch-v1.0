import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../common.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _email;
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _relation;
  String? _error;

  @override
  void initState() {
    super.initState();
    final profile = context.session.profile;
    _email = TextEditingController(text: profile?.email ?? '');
    _name = TextEditingController(text: profile?.emergencyName ?? '');
    _phone = TextEditingController(text: _localPhone(profile?.emergencyPhone ?? ''));
    _relation = TextEditingController(text: profile?.emergencyRelationship ?? '');
  }

  String _localPhone(String stored) {
    final national = SwitchValidators.normalizePhMobile(stored);
    return national == null ? stored : '0$national';
  }

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
    _phone.dispose();
    _relation.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    try {
      final rider = await context.api.updateProfile({
        'email': _email.text.trim(),
        'emergencyContact': {
          'name': _name.text.trim(),
          'phone': SwitchValidators.normalizePhMobile(_phone.text),
          'relationship': _relation.text.trim(),
        },
      });
      if (!mounted) return;
      context.session.updateProfile(rider);
      context.showMessage('Saved.');
      Navigator.of(context).pop();
    } catch (error) {
      if (mounted) setState(() => _error = errorText(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Email & emergency contact')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email (optional)'),
              validator: SwitchValidators.optionalEmail,
            ),
            const SizedBox(height: 24),
            Text('Emergency contact', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Full name'),
              validator: (v) => SwitchValidators.required(v, 'Enter a contact name.'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Mobile number'),
              validator: SwitchValidators.phMobile,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _relation,
              decoration: const InputDecoration(labelText: 'Relationship'),
              validator: (v) => SwitchValidators.required(v, 'Enter the relationship.'),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(_error!, style: const TextStyle(color: SwitchBrand.danger)),
              ),
            const SizedBox(height: 16),
            BusyButton(label: 'Save', onPressed: _save),
          ],
        ),
      ),
    );
  }
}

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    try {
      await context.api.changePassword(currentPassword: _current.text, newPassword: _next.text);
      if (!mounted) return;
      context.showMessage('Password changed.');
      Navigator.of(context).pop();
    } catch (error) {
      if (mounted) setState(() => _error = errorText(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _current,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
              validator: (v) => (v ?? '').isEmpty ? 'Enter your current password.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _next,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
              validator: SwitchValidators.password,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirm,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm new password'),
              validator: (v) => v == _next.text ? null : 'Passwords do not match.',
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(_error!, style: const TextStyle(color: SwitchBrand.danger)),
              ),
            const SizedBox(height: 16),
            BusyButton(label: 'Change password', onPressed: _save),
          ],
        ),
      ),
    );
  }
}
