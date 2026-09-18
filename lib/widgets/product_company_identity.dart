import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:gms_shopping/models/product.dart';

class ProductCompanyIdentity extends StatelessWidget {
  const ProductCompanyIdentity({
    super.key,
    required this.product,
    required this.textColor,
    required this.fallbackColor,
    this.avatarSize = 18,
    this.fontSize = 11,
  });

  final Product product;
  final Color textColor;
  final Color fallbackColor;
  final double avatarSize;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final companyName = product.companyName.trim();
    final companyPictureUrl = product.companyPictureUrl.trim();

    if (companyName.isEmpty && companyPictureUrl.isEmpty) {
      return const SizedBox.shrink();
    }

    return Row(
      children: [
        _ProductCompanyAvatar(
          imageUrl: companyPictureUrl,
          fallbackColor: fallbackColor,
          size: avatarSize,
        ),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            companyName.isEmpty ? 'Company' : companyName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: textColor,
                      fontSize: fontSize,
                      fontWeight: FontWeight.w500,
                      height: 1.15,
                    ) ??
                TextStyle(
                  color: textColor,
                  fontSize: fontSize,
                  fontWeight: FontWeight.w500,
                  height: 1.15,
                ),
          ),
        ),
      ],
    );
  }
}

class _ProductCompanyAvatar extends StatelessWidget {
  const _ProductCompanyAvatar({
    required this.imageUrl,
    required this.fallbackColor,
    required this.size,
  });

  final String imageUrl;
  final Color fallbackColor;
  final double size;

  @override
  Widget build(BuildContext context) {
    final trimmedImageUrl = imageUrl.trim();
    final dataImageBytes = _decodeDataImage(trimmedImageUrl);

    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: dataImageBytes != null
            ? Image.memory(
                dataImageBytes,
                fit: BoxFit.cover,
                gaplessPlayback: true,
              )
            : trimmedImageUrl.isNotEmpty
                ? Image.network(
                    trimmedImageUrl,
                    fit: BoxFit.cover,
                    gaplessPlayback: true,
                    errorBuilder: (_, _, _) => _buildFallback(),
                  )
                : _buildFallback(),
      ),
    );
  }

  Widget _buildFallback() {
    return Container(
      color: fallbackColor.withOpacity(0.1),
      alignment: Alignment.center,
      child: Icon(
        Icons.storefront_rounded,
        size: size * 0.62,
        color: fallbackColor,
      ),
    );
  }
}

Uint8List? _decodeDataImage(String imageUrl) {
  final normalizedUrl = imageUrl.trim();
  if (!normalizedUrl.toLowerCase().startsWith('data:image/')) {
    return null;
  }

  final commaIndex = normalizedUrl.indexOf(',');
  if (commaIndex < 0) {
    return null;
  }

  final metadata = normalizedUrl.substring(0, commaIndex).toLowerCase();
  if (!metadata.contains(';base64')) {
    return null;
  }

  try {
    return base64Decode(normalizedUrl.substring(commaIndex + 1));
  } on FormatException {
    return null;
  }
}
