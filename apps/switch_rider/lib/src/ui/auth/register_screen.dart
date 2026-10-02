import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../rider_api.dart';
import '../common.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.socialProfile,
    required this.socialCredential,
  });

  final RiderSocialProfile socialProfile;
  final RiderSocialCredential socialCredential;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _mobile = TextEditingController();
  final _plate = TextEditingController();
  final _model = TextEditingController();
  final _color = TextEditingController();
  final _emergencyName = TextEditingController();
  final _emergencyPhone = TextEditingController();
  final _emergencyRelation = TextEditingController();
  DateTime? _birthday;
  String _vehicleType = 'MOTORCYCLE';
  bool _agreed = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _firstName.text = widget.socialProfile.firstName;
    _lastName.text = widget.socialProfile.lastName;
  }

  @override
  void dispose() {
    for (final controller in [
      _firstName,
      _lastName,
      _mobile,
      _plate,
      _model,
      _color,
      _emergencyName,
      _emergencyPhone,
      _emergencyRelation,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  bool get _needsVehicleDetails => _vehicleType != 'BICYCLE';

  String get _birthdayText => _birthday == null
      ? ''
      : '${_birthday!.year}-${_birthday!.month.toString().padLeft(2, '0')}-${_birthday!.day.toString().padLeft(2, '0')}';

  Future<void> _pickBirthday() async {
    final now = DateTime.now();
    final latest = DateTime(now.year - 18, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthday ?? DateTime(latest.year - 7),
      firstDate: DateTime(now.year - 80),
      lastDate: latest,
      helpText: 'Birthday (you must be 18+)',
    );
    if (picked != null) setState(() => _birthday = picked);
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    if (_birthday == null) {
      setState(() => _error = 'Select your birthday.');
      return;
    }
    if (!_agreed) {
      setState(
        () => _error = 'Confirm that your details are accurate to continue.',
      );
      return;
    }
    final payload = <String, dynamic>{
      'firstName': _firstName.text.trim(),
      'lastName': _lastName.text.trim(),
      'countryCode': '+63',
      'mobileNumber': SwitchValidators.normalizePhMobile(_mobile.text),
      'email': widget.socialProfile.email,
      'socialProvider': widget.socialCredential.provider,
      if (widget.socialCredential.idToken.isNotEmpty)
        'idToken': widget.socialCredential.idToken,
      if (widget.socialCredential.accessToken.isNotEmpty)
        'accessToken': widget.socialCredential.accessToken,
      'birthday': _birthdayText,
      'vehicle': {
        'vehicleType': _vehicleType,
        'plateNumber': _plate.text.trim().toUpperCase(),
        'vehicleModel': _model.text.trim(),
        'vehicleColor': _color.text.trim(),
      },
      'emergencyContact': {
        'name': _emergencyName.text.trim(),
        'phone': SwitchValidators.normalizePhMobile(_emergencyPhone.text),
        'relationship': _emergencyRelation.text.trim(),
      },
    };
    try {
      await context.session.register(payload);
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (error) {
      if (mounted) setState(() => _error = errorText(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final vehicleTypes =
        context.session.meta?.vehicleTypes ??
        const ['BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN'];
    return Scaffold(
      appBar: AppBar(title: const Text('Rider application')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'After you apply, upload your documents. Switch will verify your account before you can take deliveries.',
                style: TextStyle(color: SwitchBrand.muted),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: SwitchBrand.teal.withValues(alpha: 0.18),
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: SwitchBrand.teal.withValues(alpha: 0.12),
                      foregroundColor: SwitchBrand.teal,
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: Image.asset(
                          widget.socialCredential.provider == 'facebook'
                              ? 'assets/images/facebook_logo.png'
                              : 'assets/images/google_logo.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${widget.socialProfile.provider == 'facebook' ? 'Facebook' : 'Google'} account',
                            style: const TextStyle(
                              fontSize: 12,
                              color: SwitchBrand.muted,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.socialProfile.email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.verified,
                      color: SwitchBrand.teal,
                      size: 20,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _heading('Personal details'),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstName,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'First name',
                      ),
                      validator: (v) =>
                          SwitchValidators.name(v, field: 'first name'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastName,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(labelText: 'Last name'),
                      validator: (v) =>
                          SwitchValidators.name(v, field: 'last name'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _mobile,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile number',
                  hintText: '0917 123 4567',
                ),
                validator: SwitchValidators.phMobile,
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickBirthday,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Birthday',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  child: Text(
                    _birthday == null ? 'Select date' : _birthdayText,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _heading('Vehicle'),
              DropdownButtonFormField<String>(
                initialValue: _vehicleType,
                decoration: const InputDecoration(labelText: 'Vehicle type'),
                items: [
                  for (final type in vehicleTypes)
                    DropdownMenuItem(
                      value: type,
                      child: Text(vehicleLabel(type)),
                    ),
                ],
                onChanged: (value) =>
                    setState(() => _vehicleType = value ?? _vehicleType),
              ),
              if (_needsVehicleDetails) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _plate,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'Plate number'),
                  validator: SwitchValidators.plate,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _model,
                        decoration: const InputDecoration(
                          labelText: 'Model',
                          hintText: 'Honda Click 125',
                        ),
                        validator: (v) =>
                            SwitchValidators.required(v, 'Enter the model.'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _color,
                        decoration: const InputDecoration(labelText: 'Color'),
                        validator: (v) =>
                            SwitchValidators.required(v, 'Enter the color.'),
                      ),
                    ),
                  ],
                ),
              ] else
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Bicycle riders only receive short-distance jobs.',
                    style: TextStyle(color: SwitchBrand.muted, fontSize: 12),
                  ),
                ),
              const SizedBox(height: 24),
              _heading('Emergency contact'),
              TextFormField(
                controller: _emergencyName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name'),
                validator: (v) =>
                    SwitchValidators.required(v, 'Enter a contact name.'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emergencyPhone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Mobile number'),
                validator: (v) {
                  final base = SwitchValidators.phMobile(v);
                  if (base != null) return base;
                  if (SwitchValidators.normalizePhMobile(v) ==
                      SwitchValidators.normalizePhMobile(_mobile.text)) {
                    return 'Use a different number from your own.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emergencyRelation,
                decoration: const InputDecoration(
                  labelText: 'Relationship',
                  hintText: 'Parent, spouse, sibling…',
                ),
                validator: (v) =>
                    SwitchValidators.required(v, 'Enter the relationship.'),
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _agreed,
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                onChanged: (value) => setState(() => _agreed = value ?? false),
                title: const Text(
                  'My details are accurate, and I agree to have my documents verified by Switch.',
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    _error!,
                    style: const TextStyle(
                      color: SwitchBrand.danger,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              BusyButton(label: 'Submit application', onPressed: _submit),
            ],
          ),
        ),
      ),
    );
  }

  Widget _heading(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      text,
      style: Theme.of(
        context,
      ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    ),
  );
}
