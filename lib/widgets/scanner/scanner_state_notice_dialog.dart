import 'package:flutter/material.dart';

class ScannerStateNoticeDecision {
  const ScannerStateNoticeDecision({
    required this.proceed,
    required this.doNotShowAgain,
  });

  final bool proceed;
  final bool doNotShowAgain;
}

Future<ScannerStateNoticeDecision?> showScannerStateNoticeDialog(
  BuildContext context,
) {
  return showDialog<ScannerStateNoticeDecision>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const _ScannerStateNoticeDialog(),
  );
}

class _ScannerStateNoticeDialog extends StatefulWidget {
  const _ScannerStateNoticeDialog();

  @override
  State<_ScannerStateNoticeDialog> createState() =>
      _ScannerStateNoticeDialogState();
}

class _ScannerStateNoticeDialogState extends State<_ScannerStateNoticeDialog> {
  bool _doNotShowAgain = false;

  void _finish({required bool proceed}) {
    Navigator.of(context).pop(
      ScannerStateNoticeDecision(
        proceed: proceed,
        doNotShowAgain: _doNotShowAgain,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return PopScope(
      canPop: false,
      child: AlertDialog(
        key: const Key('scanner_state_notice_dialog'),
        icon: Icon(Icons.document_scanner_outlined, color: colorScheme.primary),
        title: const Text('Scanner status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'The scanner is available, but it is not perfect yet. It may '
              'miss or misidentify cards, printings, and variants. We are '
              'actively working through these issues. Please review every '
              'match before adding it to your Vault.',
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              key: const Key('scanner_state_notice_do_not_show_again'),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('Do not show again'),
              value: _doNotShowAgain,
              onChanged: (value) {
                setState(() {
                  _doNotShowAgain = value ?? false;
                });
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            key: const Key('scanner_state_notice_go_back'),
            onPressed: () => _finish(proceed: false),
            child: const Text('Go back'),
          ),
          FilledButton(
            key: const Key('scanner_state_notice_ok'),
            onPressed: () => _finish(proceed: true),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
