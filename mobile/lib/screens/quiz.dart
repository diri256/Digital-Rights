import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../ui.dart';
import 'account.dart';

class QuizScreen extends StatefulWidget {
  final DiriRepository repo;
  const QuizScreen(this.repo, {super.key});
  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int revision = 0;
  @override
  Widget build(BuildContext context) => PageBody(
    children: [
      const Heading(
        'Put your skills into practice',
        'Your weekly challenge.',
        'Test what you know about digital rights and staying safe online.',
      ),
      if (widget.repo.user == null)
        SignInPanel(
          widget.repo,
          'Sign in to take the quiz and save your result to your DIRI account.',
        )
      else
        AsyncSection<Json?>(
          key: ValueKey(revision),
          load: widget.repo.activeWeek,
          builder: (week) {
            if (week == null) {
              return Panel(
                child: Column(
                  children: [
                    const Icon(Icons.event_outlined, size: 44, color: teal),
                    const SizedBox(height: 16),
                    const Text('No quiz is active right now. Check back soon.'),
                    TextButton(
                      onPressed: () => setState(() => revision++),
                      child: const Text('Refresh'),
                    ),
                  ],
                ),
              );
            }
            return Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.quiz_outlined, size: 50, color: teal),
                  const SizedBox(height: 18),
                  Text(
                    week['title'] ?? 'Weekly quiz',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  Text(week['description'] ?? ''),
                  const SizedBox(height: 18),
                  Text(
                    '${(week['question_ids'] as List? ?? []).length} questions · ${week['time_limit_minutes']} minutes',
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Your answers are saved as you go. The timer continues if you leave the quiz.',
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () =>
                        push(context, QuizAttemptScreen(widget.repo, week)),
                    child: const Text('Open quiz'),
                  ),
                ],
              ),
            );
          },
        ),
    ],
  );
}

class QuizAttemptScreen extends StatefulWidget {
  final DiriRepository repo;
  final Json week;
  const QuizAttemptScreen(this.repo, this.week, {super.key});
  @override
  State<QuizAttemptScreen> createState() => _QuizAttemptScreenState();
}

class _QuizAttemptScreenState extends State<QuizAttemptScreen> {
  List<Json> questions = [];
  List<int?> answers = [];
  Json? attempt;
  int index = 0, elapsed = 0;
  DateTime? started;
  Timer? timer;
  bool loading = true, busy = false, autoSubmitted = false;
  String? error;
  late int limit =
      (widget.week['time_limit_minutes'] as num? ?? 15).toInt() * 60;
  bool get complete => attempt?['status'] == 'completed';
  int get remaining => math.max(0, limit - elapsed);

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      var loadedQuestions = await widget.repo.questions(widget.week);
      final title = '${widget.week['title']} ${widget.week['description']}';
      if (RegExp(
        r'\b(?:UIGF|UYIGF)\b|internet governance forum',
        caseSensitive: false,
      ).hasMatch(title)) {
        loadedQuestions = List<Json>.from(
          jsonDecode(
            await rootBundle.loadString('assets/practice_questions.json'),
          ),
        );
        limit = 600;
      }
      final existing = await widget.repo.attempt(widget.week['id']);
      if (!mounted) return;
      questions = loadedQuestions;
      attempt = existing;
      final saved = (existing?['answers'] as List? ?? []);
      answers = List.generate(
        questions.length,
        (i) => i < saved.length ? (saved[i] as num?)?.toInt() : null,
      );
      index = math.min(
        (existing?['current_index'] as num? ?? 0).toInt(),
        math.max(0, questions.length - 1),
      );
      elapsed = (existing?['elapsed_seconds'] as num? ?? 0).toInt();
      if (existing != null && !complete) startClock();
    } catch (err) {
      error = friendlyError(err);
    }
    if (mounted) setState(() => loading = false);
  }

  void startClock() {
    started =
        DateTime.tryParse(attempt?['started_at'] ?? '') ??
        DateTime.now().subtract(Duration(seconds: elapsed));
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || complete) return;
      setState(
        () => elapsed = math.max(
          elapsed,
          DateTime.now().difference(started!).inSeconds,
        ),
      );
      if (remaining == 0 && !busy && !autoSubmitted) {
        autoSubmitted = true;
        submit();
      }
    });
  }

  Future<void> begin() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      // Recheck for attempts created on another device before inserting.
      final existing = await widget.repo.attempt(widget.week['id']);
      if (existing != null) {
        await load();
        return;
      }
      attempt = await widget.repo.startAttempt(widget.week, questions.length);
      startClock();
    } catch (err) {
      error = friendlyError(err);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> save({int? selection, int? moveTo}) async {
    if (busy || remaining == 0) return;
    setState(() {
      busy = true;
      error = null;
    });
    final next = List<int?>.from(answers);
    if (selection != null) next[index] = selection;
    final nextIndex = moveTo ?? index;
    try {
      await widget.repo.saveAttempt(attempt!['id'], {
        'answers': next,
        'current_index': nextIndex,
        'elapsed_seconds': elapsed,
      });
      if (mounted) {
        setState(() {
          answers = next;
          index = nextIndex;
        });
      }
    } catch (err) {
      if (mounted) {
        setState(
          () => error =
              '${friendlyError(err)} Your last change was not saved; please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submit() async {
    if (busy || complete) return;
    setState(() {
      busy = true;
      error = null;
    });
    final score = elapsed > limit + 30 ? 0 : quizScore(questions, answers);
    try {
      final update = {
        'answers': answers,
        'score': score,
        'total_questions': questions.length,
        'time_spent_seconds': elapsed,
        'elapsed_seconds': elapsed,
        'current_index': index,
        'status': 'completed',
      };
      await widget.repo.saveAttempt(attempt!['id'], update);
      timer?.cancel();
      if (mounted) setState(() => attempt = {...attempt!, ...update});
    } catch (err) {
      if (mounted) {
        setState(
          () => error =
              '${friendlyError(err)} Your result has not been submitted. Tap Submit to retry.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Weekly assessment')),
      body: SafeArea(
        child: PageBody(
          children: [
            if (loading)
              const Center(child: CircularProgressIndicator())
            else if (questions.isEmpty) ...[
              Panel(
                child: Text(
                  error ?? 'No questions are available for this quiz.',
                ),
              ),
              OutlinedButton(onPressed: load, child: const Text('Try again')),
            ] else if (complete) ...[
              const Heading(
                'Assessment complete',
                'Your result is saved.',
                'Continue learning and track your certificate pathway in your account.',
              ),
              Panel(
                child: Column(
                  children: [
                    const Icon(Icons.workspace_premium, color: teal, size: 72),
                    const SizedBox(height: 20),
                    Text(
                      '${attempt!['score']} / ${attempt!['total_questions']}',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 12),
                    Text('${attempt!['time_spent_seconds']} seconds'),
                  ],
                ),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ] else if (attempt == null) ...[
              const Heading(
                'Ready when you are',
                'Let’s put learning into action.',
                'Once started, the timer keeps running. Choose a time when you can finish the assessment.',
              ),
              Text('${questions.length} questions · ${limit ~/ 60} minutes'),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: busy ? null : begin,
                child: Text(busy ? 'Starting…' : 'Start assessment'),
              ),
              if (error != null) Text(error!),
            ] else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Question ${index + 1} of ${questions.length}'),
                  Text(
                    '${remaining ~/ 60}:${(remaining % 60).toString().padLeft(2, '0')}',
                    style: TextStyle(
                      color: remaining < 60 ? Colors.red : navy,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: (index + 1) / questions.length,
                color: teal,
              ),
              const SizedBox(height: 24),
              Panel(
                child: Text(
                  questions[index]['question_text'],
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              ...(questions[index]['options'] as List).asMap().entries.map(
                (option) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Semantics(
                    selected: answers[index] == option.key,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.all(18),
                        alignment: Alignment.centerLeft,
                        backgroundColor: answers[index] == option.key
                            ? const Color(0xFFDCF5F4)
                            : Colors.white,
                        side: BorderSide(
                          color: answers[index] == option.key
                              ? teal
                              : Colors.black12,
                        ),
                      ),
                      onPressed: busy || remaining == 0
                          ? null
                          : () => save(selection: option.key),
                      child: Row(
                        children: [
                          Icon(
                            answers[index] == option.key
                                ? Icons.radio_button_checked
                                : Icons.radio_button_off,
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Text(option.value.toString())),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    error!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              if (busy) const LinearProgressIndicator(),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: busy || index == 0 || remaining == 0
                          ? null
                          : () => save(moveTo: index - 1),
                      child: const Text('Previous'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: busy
                          ? null
                          : index == questions.length - 1 || remaining == 0
                          ? submit
                          : () => save(moveTo: index + 1),
                      child: Text(
                        index == questions.length - 1 || remaining == 0
                            ? 'Submit'
                            : 'Next',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '${answers.where((a) => a != null).length} of ${questions.length} answered. Unanswered questions receive no points.',
              ),
            ],
          ],
        ),
      ),
    ),
  );
}
