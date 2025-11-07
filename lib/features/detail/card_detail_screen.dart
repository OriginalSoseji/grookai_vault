import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/overlays/toast_banner.dart';
import 'widgets/detail_actions.dart';
// import 'widgets/variant_chooser_sheet.dart';
import 'package:grookai_vault/ui/haptics.dart';

class CardDetailScreen extends StatefulWidget {
  final String cardId;
  final String heroTag;
  const CardDetailScreen({super.key, required this.cardId, required this.heroTag});
  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  bool wish = false;

  Future<void> _addToVault() async {
    await Haptics.medium();
    showToastSuccess(context, 'Added to vault');
    // TODO: optimistic add + Undo via VaultService
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 280,
            flexibleSpace: FlexibleSpaceBar(
              background: Hero(
                tag: widget.heroTag,
                child: Container(color: Colors.grey.shade300),
              ),
              title: const Text('Card Detail'),
            ),
            actions: [DetailActions(cardId: widget.cardId)],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Details coming soon'),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          decoration: BoxDecoration(color: Theme.of(context).cardColor, boxShadow: const [
            BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, -2)),
          ]),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => wish = !wish),
                  icon: Icon(wish ? Icons.favorite : Icons.favorite_border),
                  label: const Text('Wishlist'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _addToVault,
                  child: const Text('Add to Vault'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
