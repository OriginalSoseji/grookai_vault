import 'package:flutter/material.dart';

import '../../services/grookai_objects/grookai_object_export_service.dart';
import 'grookai_object.dart';

Future<GrookaiObjectExportDestination?> showGrookaiObjectShareDestinationSheet({
  required BuildContext context,
  required GrookaiObject object,
}) {
  return showModalBottomSheet<GrookaiObjectExportDestination>(
    context: context,
    showDragHandle: true,
    builder: (context) => GrookaiObjectShareDestinationSheet(object: object),
  );
}

class GrookaiObjectShareDestinationSheet extends StatelessWidget {
  const GrookaiObjectShareDestinationSheet({super.key, required this.object});

  final GrookaiObject object;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final destinations = GrookaiObjectExportService.destinationsFor(object);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Share destination',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Choose the output shape before generating the image.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            for (final destination in destinations)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(_iconFor(destination)),
                title: Text(destination.label),
                subtitle: Text(_descriptionFor(destination)),
                onTap: () => Navigator.of(context).pop(destination),
              ),
          ],
        ),
      ),
    );
  }
}

IconData _iconFor(GrookaiObjectExportDestination destination) {
  switch (destination) {
    case GrookaiObjectExportDestination.instagramFeed:
      return Icons.crop_portrait_rounded;
    case GrookaiObjectExportDestination.story:
      return Icons.stay_current_portrait_rounded;
    case GrookaiObjectExportDestination.ebayListing:
      return Icons.storefront_outlined;
    case GrookaiObjectExportDestination.saveImage:
      return Icons.image_outlined;
  }
}

String _descriptionFor(GrookaiObjectExportDestination destination) {
  switch (destination) {
    case GrookaiObjectExportDestination.instagramFeed:
      return '4:5 social post with Grookai skin and overlay.';
    case GrookaiObjectExportDestination.story:
      return '9:16 story image with top and bottom safe zones.';
    case GrookaiObjectExportDestination.ebayListing:
      return 'Plain 1:1 listing image with condition only.';
    case GrookaiObjectExportDestination.saveImage:
      return 'Native card image, matching the in-app preview.';
  }
}
