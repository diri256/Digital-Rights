import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diri_app/data.dart';
import 'package:diri_app/ui.dart';
import 'package:diri_app/screens/home.dart';
import 'package:diri_app/screens/learn.dart';
import 'package:diri_app/screens/account.dart';

void main() {
  late DiriRepository repo;
  setUp(() {
    final content =
        jsonDecode(File('assets/lessons.json').readAsStringSync()) as Json;
    repo = DiriRepository(
      SupabaseClient('https://example.supabase.co', 'test-public-key'),
      'https://diri.online',
      content.entries.map((e) => Lesson(e.key, e.value)).toList(),
    );
  });
  tearDown(() async => repo.client.dispose());
  Future<void> show(
    WidgetTester tester,
    Widget child, {
    double scale = 1,
  }) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: diriTheme(),
        home: MediaQuery(
          data: MediaQueryData(
            size: const Size(390, 844),
            textScaler: TextScaler.linear(scale),
          ),
          child: Scaffold(body: SafeArea(child: child)),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('home fits a phone and starts learning', (tester) async {
    int? selected;
    await show(tester, HomeScreen(repo, (value) => selected = value));
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Start learning'));
    expect(selected, 1);
  });
  testWidgets('home remains readable with large accessibility text', (
    tester,
  ) async {
    await show(tester, HomeScreen(repo, (_) {}), scale: 2);
    expect(tester.takeException(), isNull);
  });
  testWidgets('lesson search filters bundled content offline', (tester) async {
    await show(tester, LearnScreen(repo));
    await tester.enterText(find.byType(TextField), 'cybersecurity');
    await tester.pumpAndSettle();
    expect(find.text('Cybersecurity Fundamentals'), findsOneWidget);
    expect(find.text('Internet Governance'), findsNothing);
    await tester.enterText(find.byType(TextField), 'no matching lesson');
    await tester.pumpAndSettle();
    expect(
      find.text('No lessons match your search. Try another topic.'),
      findsOneWidget,
    );
  });
  testWidgets('completion is gated until every flashcard is read', (
    tester,
  ) async {
    await show(tester, LessonScreen(repo, repo.lessons.first));
    expect(find.text('Complete lesson'), findsNothing);
    for (var i = 0; i < 3; i++) {
      await tester.ensureVisible(find.text('Next card'));
      await tester.tap(find.text('Next card'));
      await tester.pumpAndSettle();
    }
    expect(find.text('Complete lesson'), findsOneWidget);
  });
  testWidgets('sign-in validates input without making a request', (
    tester,
  ) async {
    await show(tester, AuthScreen(repo));
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(find.text('Enter your password'), findsOneWidget);
  });
}
