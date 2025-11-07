import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/overlays/action_sheet.dart';

class DetailActions extends StatelessWidget {
  final String cardId;
  const DetailActions({super.key, required this.cardId});
  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.more_horiz),
      onPressed: () => showActionSheet(
        context,
        title: 'Actions',
        items: [
          ActionSheetItem(icon: Icons.share, label: 'Share', onTap: () {}),
          ActionSheetItem(icon: Icons.flag_outlined, label: 'Report', onTap: () {}),
        ],
      ),
    );
  }
}

