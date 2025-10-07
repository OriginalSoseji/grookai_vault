import 'package:grookai_vault/widgets/fix_card_img_adapter.dart';
import "package:flutter/material.dart";
import "package:grookai_vault/widgets/fix_card_image.dart";

/// Drop-in adapter so existing calls keep working:
/// fixCardImg(setCode, number, width: 88, height: 124, ...)
Widget fixCardImg(
  String setCode,
  String number, {
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
  BorderRadius? borderRadius,
  TcgdexUrlBuilder? tcgDexBuilder,
}) {
  return FixCardImage(
    setCode: setCode,
    number: number,
    width: width,
    height: height,
    fit: fit,
    borderRadius: borderRadius,
    tcgDexBuilder: tcgDexBuilder,
  );
}


