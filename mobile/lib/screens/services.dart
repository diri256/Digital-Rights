import 'package:flutter/material.dart';

import '../data.dart';
import '../ui.dart';
import '../validation.dart';
import 'account.dart';

class VerifyScreen extends StatefulWidget {
  final DiriRepository repo;
  const VerifyScreen(this.repo, {super.key});
  @override
  State<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends State<VerifyScreen> {
  final number = TextEditingController();
  List<Json>? results;
  @override
  void dispose() {
    number.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Verify certificate')),
    body: SafeArea(
      child: PageBody(
        children: [
          const Heading(
            'Trust, verified',
            'Check a DIRI certificate',
            'Enter the certificate number exactly as it appears on the certificate.',
          ),
          TextField(
            controller: number,
            decoration: const InputDecoration(labelText: 'Certificate number'),
            onChanged: (_) => setState(() => results = null),
          ),
          const SizedBox(height: 16),
          BusyButton('Verify certificate', () async {
            if (number.text.trim().isEmpty) {
              notice(context, 'Enter a certificate number.');
              return;
            }
            setState(() => results = null);
            final value = await widget.repo.verify(number.text);
            if (mounted) setState(() => results = value);
          }),
          const SizedBox(height: 24),
          if (results != null && results!.isEmpty)
            const Panel(
              child: Text(
                'Certificate not found. Check the number and try again.',
              ),
            ),
          if (results != null)
            ...results!.map(
              (certificate) => Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      certificate['is_valid'] == true
                          ? Icons.verified
                          : Icons.error_outline,
                      size: 48,
                      color: certificate['is_valid'] == true
                          ? const Color(0xFF078484)
                          : Colors.red,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      certificate['is_valid'] == true
                          ? 'Valid certificate'
                          : 'Certificate is not valid',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    for (final field in {
                      'certificate_holder': 'Holder',
                      'certificate_type': 'Type',
                      'certificate_number': 'Number',
                      'issue_date': 'Issued',
                      'certificate_status': 'Status',
                    }.entries)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SelectableText(
                          '${field.value}: ${certificate[field.key] ?? '—'}',
                        ),
                      ),
                    if (certificate['is_valid'] == true)
                      OutlinedButton(
                        onPressed: () => openLink(
                          context,
                          '${widget.repo.siteUrl}/certificate.html?id=${Uri.encodeComponent(certificate['certificate_number'])}',
                        ),
                        child: const Text('View digital certificate'),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class LeaderboardScreen extends StatefulWidget {
  final DiriRepository repo;
  const LeaderboardScreen(this.repo, {super.key});
  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  String period = 'weekly';
  @override
  Widget build(BuildContext context) => StreamBuilder(
    stream: widget.repo.client.auth.onAuthStateChange,
    builder: (context, _) => Scaffold(
      appBar: AppBar(title: const Text('Leaderboard')),
      body: SafeArea(
        child: PageBody(
          children: [
            const Heading(
              'Learning together',
              'Celebrate your progress.',
              'Rankings from completed DIRI quizzes.',
            ),
            if (widget.repo.user == null)
              SignInPanel(widget.repo, 'Sign in to view learner rankings.')
            else ...[
              Wrap(
                spacing: 8,
                children:
                    {
                          'weekly': 'This week',
                          'monthly': 'This month',
                          'all-time': 'All time',
                        }.entries
                        .map(
                          (e) => ChoiceChip(
                            label: Text(e.value),
                            selected: period == e.key,
                            onSelected: (_) => setState(() => period = e.key),
                          ),
                        )
                        .toList(),
              ),
              const SizedBox(height: 20),
              AsyncSection<List<Json>>(
                key: ValueKey('${widget.repo.user?.id}-$period'),
                load: () => widget.repo.leaderboard(period),
                builder: (rows) => rows.isEmpty
                    ? const Panel(
                        child: Text('No completed quizzes in this period yet.'),
                      )
                    : Column(
                        children: rows
                            .map(
                              (row) => Card(
                                color: row['is_current_user'] == true
                                    ? const Color(0xFFDCF5F4)
                                    : Colors.white,
                                elevation: 0,
                                child: ListTile(
                                  leading: CircleAvatar(
                                    child: Text('${row['leaderboard_rank']}'),
                                  ),
                                  title: Text(
                                    '${row['display_name']}${row['is_current_user'] == true ? ' (You)' : ''}',
                                  ),
                                  subtitle: Text(
                                    '${row['quizzes_completed']} quizzes · ${row['time_seconds']} seconds',
                                  ),
                                  trailing: Text(
                                    '${row['score_points']} pts',
                                    style: const TextStyle(
                                      color: navy,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

class TrainingScreen extends StatefulWidget {
  final DiriRepository repo;
  const TrainingScreen(this.repo, {super.key});
  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> {
  final form = GlobalKey<FormState>();
  final fields = <String, TextEditingController>{};
  String group = 'students';
  bool certificate = false, sent = false;
  DateTime? date;
  final labels = const {
    'organization_name': 'Organisation name',
    'contact_person': 'Contact person',
    'email': 'Email',
    'phone': 'Phone number',
    'location': 'Location',
    'participant_count': 'Number of participants',
    'training_topics': 'Training topics',
    'additional_message': 'Additional message (optional)',
  };
  @override
  void initState() {
    super.initState();
    for (final key in labels.keys) {
      fields[key] = TextEditingController(
        text: key == 'email' ? widget.repo.user?.email : null,
      );
    }
  }

  @override
  void dispose() {
    for (final controller in fields.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Request training')),
    body: SafeArea(
      child: PageBody(
        children: [
          const Heading(
            'Skills for your community',
            'Bring DIRI to your team.',
            'Tell us about your organisation. DIRI will contact you to discuss your needs and provide a quote.',
          ),
          if (sent)
            const Panel(
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline, color: teal, size: 48),
                  SizedBox(height: 16),
                  Text('Request received. The DIRI team will be in touch.'),
                ],
              ),
            )
          else
            Form(
              key: form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ...labels.entries.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: TextFormField(
                        controller: fields[entry.key],
                        decoration: InputDecoration(labelText: entry.value),
                        maxLines: entry.key == 'additional_message' ? 3 : 1,
                        keyboardType: entry.key == 'email'
                            ? TextInputType.emailAddress
                            : entry.key == 'participant_count'
                            ? TextInputType.number
                            : entry.key == 'phone'
                            ? TextInputType.phone
                            : TextInputType.text,
                        validator: (value) =>
                            validateTrainingField(entry.key, value),
                      ),
                    ),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: group,
                    decoration: const InputDecoration(
                      labelText: 'Participant type',
                    ),
                    items:
                        {
                              'students': 'Students',
                              'staff': 'Staff',
                              'teachers': 'Teachers',
                              'community_members': 'Community members',
                              'youth': 'Youth',
                              'mixed': 'Mixed group',
                              'other': 'Other',
                            }.entries
                            .map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            )
                            .toList(),
                    onChanged: (value) => setState(() => group = value!),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final today = DateUtils.dateOnly(DateTime.now());
                      final selected = await showDatePicker(
                        context: context,
                        firstDate: today,
                        lastDate: today.add(const Duration(days: 730)),
                        initialDate: date ?? today,
                      );
                      if (selected != null && mounted) {
                        setState(() => date = selected);
                      }
                    },
                    icon: const Icon(Icons.calendar_month),
                    label: Text(
                      date == null
                          ? 'Preferred date (optional)'
                          : date!.toIso8601String().split('T').first,
                    ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Certification required'),
                    value: certificate,
                    onChanged: (value) => setState(() => certificate = value),
                  ),
                  const SizedBox(height: 16),
                  BusyButton('Send training request', () async {
                    if (!form.currentState!.validate()) return;
                    await widget.repo.client.from('training_requests').insert({
                      for (final entry in fields.entries)
                        entry.key: entry.value.text.trim(),
                      'participant_count': int.parse(
                        fields['participant_count']!.text.trim(),
                      ),
                      'participant_type': group,
                      'preferred_training_date': date
                          ?.toIso8601String()
                          .split('T')
                          .first,
                      'certification_required': certificate,
                      'requester_user_id': widget.repo.user?.id,
                    });
                    if (mounted) setState(() => sent = true);
                  }),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}
