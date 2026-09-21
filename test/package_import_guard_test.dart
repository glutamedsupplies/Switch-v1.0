import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('lib and test dart files do not import the retired package name', () {
    const retiredPackage = 'gms_shopping';
    final needle = 'package:$retiredPackage/';
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
          final trimmed = lines[i].trimLeft();
          final isDirective =
              trimmed.startsWith('import ') || trimmed.startsWith('export ');
          if (isDirective && trimmed.contains(needle)) {
            hits.add('${entity.path}:${i + 1}: ${trimmed}');
          }
        }
      }
    }

    expect(
      hits,
      isEmpty,
      reason:
          'Leftover $needle imports; use package:switch_app instead:\n'
          '${hits.join('\n')}',
    );
  });
}
