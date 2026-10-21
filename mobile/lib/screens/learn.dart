import 'package:flutter/material.dart';

import '../data.dart';
import '../ui.dart';
import 'account.dart';

class LearnScreen extends StatefulWidget {
  final DiriRepository repo;
  const LearnScreen(this.repo, {super.key});
  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  String search = '', category = 'All';
  int revision = 0;
  @override
  Widget build(BuildContext context) {
    final lessons = widget.repo.lessons
        .where(
          (lesson) =>
              (category == 'All' || category == lesson.category) &&
              '${lesson.title} ${lesson.category}'.toLowerCase().contains(
                search.toLowerCase(),
              ),
        )
        .toList();
    return PageBody(
      children: [
        const Heading(
          'Learn at your pace',
          'Know your rights.\nBuild your confidence.',
          'Nine practical lessons for a safer digital life. Read the flashcards even when you’re offline.',
        ),
        AsyncSection<List<Json>>(
          key: ValueKey(revision),
          load: widget.repo.progress,
          builder: (rows) {
            final complete = rows
                .where((r) => r['status'] == 'completed')
                .map((r) => r['lesson_id'])
                .toSet();
            final count = widget.repo.lessons
                .where((l) => complete.contains(l.id))
                .length;
            return Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.repo.user == null
                        ? 'Sign in to save your learning'
                        : '$count of 9 lessons completed',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                    value: count / 9,
                    color: teal,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ],
              ),
            );
          },
        ),
        TextField(
          decoration: const InputDecoration(
            hintText: 'Search lessons',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (value) => setState(() => search = value),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          children:
              [
                    'All',
                    'Privacy',
                    'Security',
                    'Governance',
                    'AI Policy',
                    'Rights',
                  ]
                  .map(
                    (value) => FilterChip(
                      label: Text(value),
                      selected: category == value,
                      onSelected: (_) => setState(() => category = value),
                    ),
                  )
                  .toList(),
        ),
        const SizedBox(height: 18),
        if (lessons.isEmpty)
          const Panel(
            child: Text('No lessons match your search. Try another topic.'),
          ),
        ...lessons.map(
          (lesson) => ActionTile(
            Icons.auto_stories_outlined,
            lesson.title,
            '${lesson.category} · ${lesson.cards.length} flashcards',
            () async {
              await push(context, LessonScreen(widget.repo, lesson));
              if (mounted) setState(() => revision++);
            },
          ),
        ),
      ],
    );
  }
}

class LessonScreen extends StatefulWidget {
  final DiriRepository repo;
  final Lesson lesson;
  const LessonScreen(this.repo, this.lesson, {super.key});
  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  int index = 0;
  final Set<int> seen = {0};
  bool saved = false;
  @override
  Widget build(BuildContext context) {
    final lesson = widget.lesson;
    return Scaffold(
      appBar: AppBar(title: const Text('Your lesson')),
      body: SafeArea(
        child: PageBody(
          children: [
            Heading(
              lesson.category,
              lesson.title,
              'Small steps. Lasting digital skills.',
            ),
            Text('Card ${index + 1} of ${lesson.cards.length}'),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: (index + 1) / lesson.cards.length,
              color: teal,
            ),
            const SizedBox(height: 24),
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lightbulb_outline, color: teal, size: 34),
                  const SizedBox(height: 20),
                  Text(
                    lesson.cards[index][0],
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 18),
                  SelectableText(
                    lesson.cards[index][1],
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: index == 0
                        ? null
                        : () => setState(() => index--),
                    child: const Text('Previous'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: index == lesson.cards.length - 1
                        ? null
                        : () => setState(() {
                            index++;
                            seen.add(index);
                          }),
                    child: const Text('Next card'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (seen.length == lesson.cards.length)
              BusyButton(
                saved ? 'Completion saved ✓' : 'Complete lesson',
                () async {
                  if (saved) return;
                  if (widget.repo.user == null) {
                    await push(context, AuthScreen(widget.repo));
                    if (widget.repo.user == null) return;
                  }
                  await widget.repo.complete(lesson);
                  if (mounted) setState(() => saved = true);
                },
              )
            else
              const Text('Read every card to complete this lesson.'),
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: () => openLink(
                context,
                lesson.video
                    .replaceFirst(
                      'www.youtube-nocookie.com/embed/',
                      'www.youtube.com/watch?v=',
                    )
                    .split('?rel=')[0],
              ),
              icon: const Icon(Icons.play_circle_outline),
              label: Text('Watch: ${lesson.videoTitle}'),
            ),
          ],
        ),
      ),
    );
  }
}
