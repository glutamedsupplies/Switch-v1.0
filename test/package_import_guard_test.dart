import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('lib and test dart files do not import package:gms_shopping', () {
    final hits = <String>[];
    for (final root in <Directory>[Directory('lib'), Directory('test')]) {
      if (!root.existsSync()) {
        continue;
      }
      for (final entity in root.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) {
          continue;
        }
        final lines = entity.readAsLinesSync();
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].contains('package:gms_shopping/')) {
            hits.add('${entity.path}:${i + 1}: ${lines[i].trim()}');
          }
        }
      }
    }

    expect(
      hits,
      isEmpty,
      reason:
          'Leftover package:gms_shopping imports; use package:switch_app instead:\n'
          '${hits.join('\n')}',
    );
  });
}
