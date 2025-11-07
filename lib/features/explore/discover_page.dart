import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';

class DiscoverPage extends StatefulWidget {
  const DiscoverPage({super.key});
  @override
  State<DiscoverPage> createState() => _DiscoverPageState();
}

class _DiscoverPageState extends State<DiscoverPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Thunder.base,
      body: PageView.builder(
        scrollDirection: Axis.vertical,
        itemBuilder: (context, i) {
          return Stack(
            children: [
              Positioned.fill(
                child: Container(
                  color: Thunder.surface,
                  child: Center(
                    child: Text(
                      'Discover ${(i % 50) + 1}',
                      style: const TextStyle(color: Thunder.onSurface, fontSize: 22),
                    ),
                  ),
                ),
              ),
              Positioned(
                right: GVSpacing.s16,
                bottom: GVSpacing.s24,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    _ActionBtn(icon: Icons.favorite_border),
                    SizedBox(height: GVSpacing.s12),
                    _ActionBtn(icon: Icons.share),
                    SizedBox(height: GVSpacing.s12),
                    _ActionBtn(icon: Icons.add),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  const _ActionBtn({required this.icon});
  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: Material(
        color: Thunder.surfaceAlt,
        child: InkWell(
          onTap: () {},
          child: SizedBox(
            width: 48,
            height: 48,
            child: Icon(icon, color: Thunder.onSurface),
          ),
        ),
      ),
    );
  }
}

