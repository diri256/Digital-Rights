import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:diri_app/data.dart';

void main() {
  test('bundled lessons preserve website IDs and all flashcards', () {
    final content =
        jsonDecode(File('assets/lessons.json').readAsStringSync()) as Json;
    expect(content.keys.toSet(), {
      'privacy',
      'cybersecurity',
      'governance',
      'ai',
      'rights',
      'scams',
      'identity',
      'mobile-money',
      'misinformation',
    });
    for (final entry in content.entries) {
      final lesson = Lesson(entry.key, entry.value);
      expect(lesson.cards, hasLength(4));
      expect(
        lesson.cards.every(
          (card) => card.length == 2 && card.every((text) => text.isNotEmpty),
        ),
        isTrue,
      );
      expect(Uri.parse(lesson.video).scheme, 'https');
    }
  });
  test('selects current quiz and excludes future and expired weeks', () {
    final now = DateTime.utc(2026, 10, 21);
    final weeks = <Json>[
      {'id': 'future', 'starts_at': '2026-10-22T00:00:00Z'},
      {'id': 'expired', 'ends_at': '2026-10-20T00:00:00Z'},
      {
        'id': 'active',
        'starts_at': '2026-10-21T00:00:00Z',
        'ends_at': '2026-10-22T00:00:00Z',
      },
      {'id': 'always'},
    ];
    expect(selectActiveWeek(weeks, now)?['id'], 'active');
    expect(selectActiveWeek(weeks.take(2).toList(), now), isNull);
    expect(
      selectActiveWeek([
        {'id': 'always'},
      ], now)?['id'],
      'always',
    );
    expect(selectActiveWeek([], now), isNull);
  });
  test('quiz scoring never awards points for unanswered questions', () {
    final questions = <Json>[
      {'correct_answer': 0},
      {'correct_answer': 2},
      {'correct_answer': 1},
    ];
    expect(quizScore(questions, [0, null, 1]), 2);
    expect(quizScore(questions, []), 0);
    expect(quizScore(questions, [1, 2, 0]), 1);
  });
  test('chat history preserves the latest ten messages in order', () {
    final history = List.generate(
      12,
      (i) => <String, dynamic>{'content': '$i'},
    );
    expect(history.takeLast(10).first['content'], '2');
    expect(history.takeLast(10).last['content'], '11');
    expect(history.take(2).toList().takeLast(10), hasLength(2));
  });
}
