import 'package:flutter/material.dart';

/// Shared 3D empty-state artwork for search queries with no matches.
class SearchNotFoundArt extends StatelessWidget {
  const SearchNotFoundArt({
    super.key,
    this.size = 132,
    this.semanticLabel = 'No search results illustration',
  });

  final double size;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: semanticLabel,
      child: SizedBox.square(
        dimension: size,
        child: Image.asset(
          'assets/images/search-not-found-3d.png',
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          excludeFromSemantics: true,
        ),
      ),
    );
  }
}
