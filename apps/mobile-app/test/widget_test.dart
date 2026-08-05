import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:travellersin/shared/presentation/architecture_placeholder_page.dart';

void main() {
  testWidgets('architecture placeholder renders', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ArchitecturePlaceholderPage(title: 'TravellersIn'),
      ),
    );

    expect(find.text('TravellersIn'), findsOneWidget);
  });
}
