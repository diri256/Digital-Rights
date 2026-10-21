import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diri_app/data.dart';
import 'package:diri_app/ui.dart';
import 'package:diri_app/screens/quiz.dart';

class QuizRepository extends DiriRepository {
  QuizRepository()
    : super(
        SupabaseClient(
          'https://example.supabase.co',
          'test-key',
          authOptions: const AuthClientOptions(autoRefreshToken: false),
        ),
        'https://diri.online',
        [],
      );
  bool failSave = false;
  final updates = <Json>[];
  @override
  Future<List<Json>> questions(Json week) async => [
    {
      'id': 'q1',
      'question_text': 'Which action is safe?',
      'options': ['Keep your PIN private', 'Share your PIN'],
      'correct_answer': 0,
    },
  ];
  @override
  Future<Json?> attempt(String weekId) async => {
    'id': 'attempt',
    'status': 'in_progress',
    'answers': [null],
    'current_index': 0,
    'elapsed_seconds': 0,
    'started_at': DateTime.now().toUtc().toIso8601String(),
  };
  @override
  Future<void> saveAttempt(String id, Json values) async {
    if (failSave) throw StateError('Network unavailable.');
    updates.add(values);
  }
}

void main() {
  late QuizRepository repo;
  setUp(() => repo = QuizRepository());
  tearDown(() => repo.client.dispose());
  testWidgets(
    'failed answer writes are not displayed as saved; submission can retry',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: diriTheme(),
          home: QuizAttemptScreen(repo, {
            'id': 'week',
            'title': 'Digital safety',
            'time_limit_minutes': 15,
          }),
        ),
      );
      await tester.pumpAndSettle();
      repo.failSave = true;
      await tester.tap(find.text('Keep your PIN private'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Your last change was not saved'),
        findsOneWidget,
      );
      expect(repo.updates, isEmpty);
      repo.failSave = false;
      await tester.tap(find.text('Keep your PIN private'));
      await tester.pumpAndSettle();
      expect(repo.updates.last['answers'], [0]);
      repo.failSave = true;
      await tester.ensureVisible(find.text('Submit'));
      await tester.tap(find.text('Submit'));
      await tester.pumpAndSettle();
      expect(find.text('Your result is saved.'), findsNothing);
      expect(
        find.textContaining('Your result has not been submitted'),
        findsOneWidget,
      );
      repo.failSave = false;
      await tester.ensureVisible(find.text('Submit'));
      await tester.tap(find.text('Submit'));
      await tester.pumpAndSettle();
      expect(find.text('Your result is saved.'), findsOneWidget);
      expect(repo.updates.last['score'], 1);
      expect(repo.updates.last['status'], 'completed');
      await tester.pumpWidget(const SizedBox());
    },
  );
}
