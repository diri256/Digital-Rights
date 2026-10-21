import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diri_app/data.dart';
import 'package:diri_app/screens/resources.dart';
import 'package:diri_app/ui.dart';
import 'package:diri_app/validation.dart';

void main() {
  test('all seven resource pages have readable native content', () {
    final pages =
        jsonDecode(File('assets/resources.json').readAsStringSync()) as Json;
    expect(pages.keys.toSet(), {
      'about',
      'safety-guide',
      'faq',
      'contact',
      'privacy-policy',
      'terms',
      'accessibility',
    });
    for (final page in pages.values) {
      expect(page['title'], isNotEmpty);
      expect(page['blocks'], isNotEmpty);
      for (final block in page['blocks']) {
        expect(block['text'], isNot(contains('<script')));
        expect(block['text'], isNot(contains('â€')));
      }
    }
  });
  test('training validation matches database boundaries', () {
    expect(validateTrainingField('participant_count', '10000'), isNull);
    expect(validateTrainingField('participant_count', '10001'), isNotNull);
    expect(validateTrainingField('participant_count', '0'), isNotNull);
    expect(validateTrainingField('participant_count', '1.5'), isNotNull);
    expect(validateTrainingField('phone', '123'), isNotNull);
    expect(validateTrainingField('phone', '+256700123456'), isNull);
    expect(validateTrainingField('email', ' learner@example.com '), isNull);
    expect(validateTrainingField('training_topics', 'Hi'), isNotNull);
    expect(validateTrainingField('additional_message', ''), isNull);
  });
  late SupabaseClient client;
  setUp(
    () => client = SupabaseClient(
      'https://example.supabase.co',
      'test-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    ),
  );
  tearDown(() => client.dispose());
  testWidgets('FAQ opens natively without a network request', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: diriTheme(),
        home: ResourceScreen(
          DiriRepository(client, 'https://diri.online', []),
          'faq',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Frequently Asked Questions'), findsOneWidget);
    expect(find.text('What is DIRI?'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
