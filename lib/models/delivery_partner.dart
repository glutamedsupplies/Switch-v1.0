class DeliveryPartner {
  const DeliveryPartner({
    required this.id,
    required this.branch,
    required this.description,
    required this.imageUrl,
    this.isEnabled = true,
    this.createdAt,
  });

  final String id;
  final String branch;
  final String description;
  final String imageUrl;
  final bool isEnabled;
  final DateTime? createdAt;

  bool get hasImage => imageUrl.trim().isNotEmpty;

  String get branchLabel {
    final value = branch.trim();
    return value.isEmpty ? 'Delivery Partner' : value;
  }

  String get descriptionLabel {
    final value = description.trim();
    return value.isEmpty ? 'No description added yet.' : value;
  }

  DeliveryPartner copyWith({
    String? id,
    String? branch,
    String? description,
    String? imageUrl,
    bool? isEnabled,
    DateTime? createdAt,
  }) {
    return DeliveryPartner(
      id: id ?? this.id,
      branch: branch ?? this.branch,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      isEnabled: isEnabled ?? this.isEnabled,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory DeliveryPartner.fromJson(Map<String, dynamic> json) {
    final rawCreatedAt = json['createdAt']?.toString() ?? '';

    return DeliveryPartner(
      id: json['id']?.toString() ?? '',
      branch: json['branch']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      isEnabled: _normalizePartnerEnabledState(json),
      createdAt: rawCreatedAt.isEmpty ? null : DateTime.tryParse(rawCreatedAt),
    );
  }
}

bool _normalizePartnerEnabledState(Map<String, dynamic> json) {
  bool readBoolean(Object? value, bool fallback) {
    if (value is bool) {
      return value;
    }
    if (value is num) {
      return value != 0;
    }
    if (value is String) {
      final normalizedValue = value.trim().toLowerCase();
      if (normalizedValue == 'true' ||
          normalizedValue == 'active' ||
          normalizedValue == 'enabled') {
        return true;
      }
      if (normalizedValue == 'false' ||
          normalizedValue == 'inactive' ||
          normalizedValue == 'disabled') {
        return false;
      }
    }
    return fallback;
  }

  if (readBoolean(json['disabled'], false)) {
    return false;
  }
  if (json.containsKey('enabled')) {
    return readBoolean(json['enabled'], true);
  }
  if (json.containsKey('isEnabled')) {
    return readBoolean(json['isEnabled'], true);
  }
  if (json.containsKey('isActive')) {
    return readBoolean(json['isActive'], true);
  }

  final status = json['status']?.toString().trim().toLowerCase() ?? '';
  if (status == 'inactive' || status == 'disabled' || status == 'archived') {
    return false;
  }

  return true;
}
