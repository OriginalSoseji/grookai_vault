import 'package:flutter/material.dart';
import '../services/public/jungle_edition_resolution_service.dart';

class JungleEditionChoiceSheet extends StatelessWidget {
  const JungleEditionChoiceSheet({
    super.key,
    required this.resolution,
    required this.onSelect,
  });
  final JungleEditionResolution resolution;
  final ValueChanged<JungleEditionOption> onSelect;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Edition unconfirmed',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Your saved copies stay as they are. Choose the edition on your card before adding another copy. The catalog photo does not confirm its edition.',
            ),
            if (resolution.status == 'unavailable' ||
                resolution.options.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text('Edition choices are being reviewed.'),
              ),
            for (final option
                in resolution.status == 'unavailable'
                    ? <JungleEditionOption>[]
                    : resolution.options)
              ListTile(
                title: Text(option.label),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => onSelect(option),
              ),
          ],
        ),
      ),
    ),
  );
}
