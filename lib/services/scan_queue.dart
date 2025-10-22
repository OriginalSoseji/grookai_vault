import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

class ScanQueueItem {
  final String name;
  final String number;
  final String lang;
  final List<int>? imageJpegBytes;
  final DateTime ts;
  ScanQueueItem({required this.name, required this.number, required this.lang, this.imageJpegBytes, required this.ts});
  Map<String, dynamic> toJson() => {
    'name': name,
    'number': number,
    'lang': lang,
    'image': imageJpegBytes == null ? null : base64Encode(imageJpegBytes!),
    'ts': ts.toIso8601String(),
  };
  static ScanQueueItem fromJson(Map<String, dynamic> j) => ScanQueueItem(
    name: (j['name'] ?? '').toString(),
    number: (j['number'] ?? '').toString(),
    lang: (j['lang'] ?? 'en').toString(),
    imageJpegBytes: (j['image'] == null) ? null : base64Decode(j['image']),
    ts: DateTime.tryParse((j['ts'] ?? '').toString()) ?? DateTime.now(),
  );
}

class ScanQueue {
  static const _file = 'scan_queue.json';
  Future<File> _path() async { final dir = await getApplicationDocumentsDirectory(); return File('${dir.path}/$_file'); }

  Future<List<ScanQueueItem>> load() async {
    try { final f = await _path(); if (!await f.exists()) return []; final txt = await f.readAsString(); final list = (jsonDecode(txt) as List).cast<dynamic>(); return list.map((e)=>ScanQueueItem.fromJson((e as Map).cast<String,dynamic>())).toList(); } catch (_) { return []; }
  }
  Future<void> save(List<ScanQueueItem> items) async { final f = await _path(); await f.writeAsString(jsonEncode(items.map((e)=>e.toJson()).toList())); }
  Future<void> enqueue(ScanQueueItem it) async { final list = await load(); list.add(it); await save(list); }
  Future<ScanQueueItem?> peek() async { final list = await load(); return list.isEmpty ? null : list.first; }
  Future<void> removeFirst() async { final list = await load(); if (list.isEmpty) return; list.removeAt(0); await save(list); }
}

