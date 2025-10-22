import 'package:flutter/material.dart';
import 'price_tiers_page.dart';

void openPriceTiers(
  BuildContext context, {
  required String name,
  required String setCode,
  required String number,
}) {
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) =>
          PriceTiersPage(name: name, setCode: setCode, number: number),
    ),
  );
}
