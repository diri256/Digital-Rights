import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

typedef Json = Map<String, dynamic>;

class Lesson {
  final String id, title, category, video, videoTitle;
  final List<List<String>> cards;
  Lesson(this.id, Json data)
    : title = data['title'],
      category = data['category'],
      video = data['video'],
      videoTitle = data['videoTitle'],
      cards = (data['cards'] as List).map((c) => List<String>.from(c)).toList();
}

class DiriRepository {
  final SupabaseClient client;
  final String siteUrl;
  final List<Lesson> lessons;
  DiriRepository(this.client, this.siteUrl, this.lessons);
  User? get user => client.auth.currentUser;
  String get userId => user?.id ?? (throw StateError('Please sign in first.'));
  static Future<DiriRepository> initialize() async {
    final config =
        jsonDecode(await rootBundle.loadString('assets/public_config.json'))
            as Json;
    await Supabase.initialize(
      url: const String.fromEnvironment('SUPABASE_URL').isEmpty
          ? config['supabaseUrl']
          : const String.fromEnvironment('SUPABASE_URL'),
      publishableKey: const String.fromEnvironment('SUPABASE_ANON_KEY').isEmpty
          ? config['supabaseKey']
          : const String.fromEnvironment('SUPABASE_ANON_KEY'),
    );
    final data =
        jsonDecode(await rootBundle.loadString('assets/lessons.json')) as Json;
    return DiriRepository(
      Supabase.instance.client,
      const String.fromEnvironment('DIRI_SITE_URL').isEmpty
          ? config['siteUrl']
          : const String.fromEnvironment('DIRI_SITE_URL'),
      data.entries.map((e) => Lesson(e.key, e.value)).toList(),
    );
  }

  Future<List<Json>> progress() async => user == null
      ? []
      : await client.from('lesson_progress').select().eq('user_id', userId);
  Future<void> complete(Lesson lesson) async {
    await profile();
    final now = DateTime.now().toUtc().toIso8601String();
    await client.from('lesson_progress').upsert({
      'user_id': userId,
      'lesson_id': lesson.id,
      'lesson_title': lesson.title,
      'status': 'completed',
      'completed_at': now,
      'updated_at': now,
    }, onConflict: 'user_id,lesson_id');
  }

  Future<List<Json>> owned(String table, {String order = 'created_at'}) async =>
      await client
          .from(table)
          .select()
          .eq('user_id', userId)
          .order(order, ascending: false);
  Future<Json?> profile() async {
    final existing = await client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    if (existing != null) return existing;
    final name =
        (user?.userMetadata?['full_name'] ??
                user?.email?.split('@').first ??
                'DIRI learner')
            .toString()
            .trim();
    try {
      return await client
          .from('profiles')
          .insert({
            'id': userId,
            'username': name.length > 40 ? name.substring(0, 40) : name,
            'language': 'en',
          })
          .select()
          .single();
    } on PostgrestException catch (error) {
      if (error.code != '23505') rethrow;
      return await client.from('profiles').select().eq('id', userId).single();
    }
  }

  Future<List<Json>> leaderboard(String period) async => List<Json>.from(
    await client.rpc('get_quiz_leaderboard', params: {'p_period': period}),
  );
  Future<List<Json>> verify(String number) async => List<Json>.from(
    await client.rpc(
      'verify_diri_certificate',
      params: {'p_certificate_id': number.trim()},
    ),
  );
  Future<void> requestCertificate(String name) async => await client.rpc(
    'request_diri_certificate',
    params: {'p_full_learner_name': name.trim()},
  );

  Future<Json?> activeWeek({DateTime? now}) async {
    final rows = await client
        .from('quiz_weeks')
        .select()
        .eq('is_published', true)
        .order('week_number', ascending: false);
    return selectActiveWeek(rows, now ?? DateTime.now());
  }

  Future<List<Json>> questions(Json week) async {
    final ids = List<String>.from(week['question_ids'] ?? []);
    if (ids.isEmpty) return [];
    final rows = await client
        .from('quiz_questions')
        .select()
        .inFilter('id', ids);
    final byId = {for (final row in rows) row['id']: row};
    if (ids.any((id) => !byId.containsKey(id))) {
      throw StateError(
        'Some quiz questions are unavailable. Please contact DIRI.',
      );
    }
    return ids.map((id) => byId[id]!).toList();
  }

  Future<Json?> attempt(String weekId) async => await client
      .from('quiz_attempts')
      .select()
      .eq('user_id', userId)
      .eq('week_id', weekId)
      .maybeSingle();
  Future<Json> startAttempt(Json week, int count) async {
    await profile();
    return await client
        .from('quiz_attempts')
        .insert({
          'user_id': userId,
          'week_id': week['id'],
          'answers': [],
          'total_questions': count,
          'status': 'in_progress',
          'current_index': 0,
          'elapsed_seconds': 0,
          'started_at': DateTime.now().toUtc().toIso8601String(),
        })
        .select()
        .single();
  }

  Future<void> saveAttempt(String id, Json values) async {
    await client
        .from('quiz_attempts')
        .update(values)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single();
  }

  Future<Json> chat(String message, List<Json> history) async {
    final response = await http
        .post(
          Uri.parse('$siteUrl/api/chat'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'message': message,
            'history': history.takeLast(10),
          }),
        )
        .timeout(const Duration(seconds: 60));
    final body = jsonDecode(response.body) as Json;
    if (response.statusCode != 200) {
      throw StateError(body['error'] ?? 'Mr. DIRI is unavailable.');
    }
    return {
      'role': 'assistant',
      'content': body['reply'] as String,
      'sources': body['sources'] ?? [],
    };
  }
}

extension RecentMessages on List<Json> {
  List<Json> takeLast(int count) =>
      skip(length > count ? length - count : 0).toList();
}

Json? selectActiveWeek(List<Json> weeks, DateTime now) {
  for (final week in weeks) {
    final start = DateTime.tryParse(week['starts_at'] ?? '');
    final end = DateTime.tryParse(week['ends_at'] ?? '');
    if ((start == null || !now.isBefore(start)) &&
        (end == null || !now.isAfter(end))) {
      return week;
    }
  }
  return null;
}

int quizScore(List<Json> questions, List<int?> answers) {
  var score = 0;
  for (var i = 0; i < questions.length; i++) {
    if (i < answers.length &&
        answers[i] != null &&
        answers[i] == questions[i]['correct_answer']) {
      score++;
    }
  }
  return score;
}
