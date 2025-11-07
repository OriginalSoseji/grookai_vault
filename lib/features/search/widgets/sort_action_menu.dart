import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/overlays/action_sheet.dart';

Future<void> showSortActionMenu(BuildContext context) async {
  await showActionSheet(
    context,
    title: 'Sort',
    items: [
      ActionSheetItem(icon: Icons.trending_up, label: 'Price ↑', onTap: () {}),
      ActionSheetItem(icon: Icons.trending_down, label: 'Price ↓', onTap: () {}),
      ActionSheetItem(icon: Icons.star_border, label: 'Rarity', onTap: () {}),
    ],
  );
}

