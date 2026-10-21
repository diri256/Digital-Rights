import 'package:flutter/material.dart';

import '../data.dart';
import '../ui.dart';
import 'services.dart';
import 'resources.dart';

class HomeScreen extends StatelessWidget {
  final DiriRepository repo;
  final ValueChanged<int> selectTab;
  const HomeScreen(this.repo, this.selectTab, {super.key});
  @override
  Widget build(BuildContext context) => PageBody(
    children: [
      Panel(
        color: navy,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.shield_outlined, color: teal),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'YOUR DIGITAL LIFE, PROTECTED',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            const Text(
              'Learn today.\nStay safer\nevery day.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 42,
                height: 1.12,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Digital safety training, assessment & certification. Built for you, here in Uganda.',
              style: TextStyle(color: Colors.white, fontSize: 17, height: 1.6),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: teal,
                foregroundColor: const Color(0xFF062452),
              ),
              onPressed: () => selectTab(1),
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Start learning'),
            ),
            const SizedBox(height: 16),
            const Text(
              '9 lessons  •  Learn at your own pace',
              style: TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
      const SizedBox(height: 8),
      Text('Your next step', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 14),
      ActionTile(
        Icons.auto_stories_outlined,
        'Explore the learning library',
        'Privacy, security, AI and digital rights',
        () => selectTab(1),
      ),
      ActionTile(
        Icons.quiz_outlined,
        'Take the weekly quiz',
        'Put your knowledge into practice',
        () => selectTab(2),
      ),
      ActionTile(
        Icons.workspace_premium_outlined,
        'Your certificate pathway',
        'Track learning and assessment progress',
        () => selectTab(4),
      ),
      const SizedBox(height: 12),
      Text('More from DIRI', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 14),
      ActionTile(
        Icons.groups_outlined,
        'Bring DIRI to your community',
        'Request training for your organisation',
        () => push(context, TrainingScreen(repo)),
      ),
      ActionTile(
        Icons.leaderboard_outlined,
        'Learner leaderboard',
        'Celebrate progress with the community',
        () => push(context, LeaderboardScreen(repo)),
      ),
      ActionTile(
        Icons.verified_outlined,
        'Verify a certificate',
        'Check an issued DIRI certificate',
        () => push(context, VerifyScreen(repo)),
      ),
      ActionTile(
        Icons.chat_bubble_outline,
        'Ask Mr. DIRI',
        'Your digital rights learning assistant',
        () => selectTab(3),
      ),
      ActionTile(
        Icons.newspaper_outlined,
        'News & updates',
        'Read published DIRI articles',
        () => push(context, NewsScreen(repo)),
      ),
      const SizedBox(height: 12),
      Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Learn → Train → Assess\n→ Certify → Verify',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            const Text(
              'A practical pathway from digital awareness to a verifiable DIRI certificate.',
            ),
          ],
        ),
      ),
      Wrap(
        spacing: 4,
        children: [
          for (final entry in {
            'About DIRI': 'about.html',
            'Safety guide': 'safety-guide.html',
            'FAQ': 'faq.html',
            'Contact': 'contact.html',
            'Privacy': 'privacy-policy.html',
            'Terms': 'terms.html',
            'Accessibility': 'accessibility.html',
          }.entries)
            TextButton(
              onPressed: () => push(
                context,
                ResourceScreen(repo, entry.value.replaceFirst('.html', '')),
              ),
              child: Text(entry.key),
            ),
        ],
      ),
      const SizedBox(height: 16),
      const Text(
        'DIRI · Team Netizens\nMbarara University of Science and Technology',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: Colors.black54),
      ),
    ],
  );
}
