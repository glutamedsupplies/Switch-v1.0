import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:gms_shopping/utils/currency_format.dart';

/// Buyer-facing price: Roboto + ₱ aligned to the same size/weight as digits.
class AppPriceText extends StatelessWidget {
  const AppPriceText({
    super.key,
    required this.amount,
    this.style,
    this.color,
    this.fontSize,
    this.fontWeight,
    this.decoration,
    this.decorationColor,
    this.height = 1,
    this.maxLines,
    this.overflow,
    this.trimTrailingZeros = true,
  });

  final double amount;
  final TextStyle? style;
  final Color? color;
  final double? fontSize;
  final FontWeight? fontWeight;
  final TextDecoration? decoration;
  final Color? decorationColor;
  final double? height;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool trimTrailingZeros;

  @override
  Widget build(BuildContext context) {
    final base = DefaultTextStyle.of(context).style.merge(style);
    final resolvedColor = color ?? base.color;
    final resolved = GoogleFonts.roboto(
      color: resolvedColor,
      fontSize: fontSize ?? base.fontSize ?? 14,
      fontWeight: fontWeight ?? base.fontWeight ?? FontWeight.w400,
      decoration: decoration ?? base.decoration,
      decorationColor: decorationColor ?? resolvedColor,
      height: height ?? base.height ?? 1,
    );

    return Text(
      formatPesoCurrency(amount, trimTrailingZeros: trimTrailingZeros),
      maxLines: maxLines,
      overflow: overflow,
      style: resolved,
    );
  }
}
