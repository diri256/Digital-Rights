import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data.dart';
import '../ui.dart';
import 'services.dart';

class AuthScreen extends StatefulWidget {
  final DiriRepository repo;
  const AuthScreen(this.repo, {super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController(),
      password = TextEditingController(),
      name = TextEditingController();
  bool register = false, visible = false, terms = false;
  String message = '';
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Your DIRI account')),
    body: SafeArea(
      child: PageBody(
        children: [
          Heading(
            'Welcome to DIRI',
            register ? 'Start your journey.' : 'Welcome back.',
            'Use the same account as the DIRI website.',
          ),
          Form(
            key: form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (register) ...[
                  TextFormField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    textCapitalization: TextCapitalization.words,
                    validator: (v) =>
                        (v ?? '').trim().length < 2 ? 'Enter your name' : null,
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  validator: (v) =>
                      RegExp(
                        r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                      ).hasMatch((v ?? '').trim())
                      ? null
                      : 'Enter a valid email',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: password,
                  obscureText: !visible,
                  autofillHints: [
                    register
                        ? AutofillHints.newPassword
                        : AutofillHints.password,
                  ],
                  decoration: InputDecoration(
                    labelText: 'Password',
                    suffixIcon: IconButton(
                      tooltip: visible ? 'Hide password' : 'Show password',
                      onPressed: () => setState(() => visible = !visible),
                      icon: Icon(
                        visible ? Icons.visibility_off : Icons.visibility,
                      ),
                    ),
                  ),
                  validator: (v) => (v ?? '').length < (register ? 8 : 1)
                      ? (register
                            ? 'Use at least 8 characters'
                            : 'Enter your password')
                      : null,
                ),
                if (register)
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: terms,
                    onChanged: (value) =>
                        setState(() => terms = value ?? false),
                    title: const Text(
                      'I accept DIRI’s terms and privacy policy.',
                    ),
                  ),
                const SizedBox(height: 18),
                if (message.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Text(message),
                  ),
                BusyButton(register ? 'Create account' : 'Sign in', () async {
                  if (!form.currentState!.validate()) return;
                  if (register && !terms) {
                    notice(
                      context,
                      'Please accept the terms and privacy policy.',
                    );
                    return;
                  }
                  if (register) {
                    final result = await widget.repo.client.auth.signUp(
                      email: email.text.trim(),
                      password: password.text,
                      data: {'full_name': name.text.trim()},
                      emailRedirectTo: '${widget.repo.siteUrl}/index.html',
                    );
                    if (!context.mounted) return;
                    if (result.session == null) {
                      setState(() {
                        message =
                            'Check your email to confirm your address, then sign in here.';
                        register = false;
                      });
                      return;
                    }
                  } else {
                    await widget.repo.client.auth.signInWithPassword(
                      email: email.text.trim(),
                      password: password.text,
                    );
                  }
                  if (context.mounted) Navigator.pop(context);
                }),
                TextButton(
                  onPressed: () => setState(() {
                    register = !register;
                    message = '';
                  }),
                  child: Text(
                    register
                        ? 'Already have an account? Sign in'
                        : 'New to DIRI? Create an account',
                  ),
                ),
                if (!register)
                  TextButton(
                    onPressed: () async {
                      if (!email.text.contains('@')) {
                        notice(context, 'Enter your email first.');
                        return;
                      }
                      try {
                        await widget.repo.client.auth.resetPasswordForEmail(
                          email.text.trim(),
                          redirectTo:
                              '${widget.repo.siteUrl}/login.html?reset=1',
                        );
                        if (mounted) {
                          setState(
                            () => message =
                                'Check your email. Reset your password on the website, then return to sign in.',
                          );
                        }
                      } catch (error) {
                        if (context.mounted) {
                          notice(context, friendlyError(error));
                        }
                      }
                    },
                    child: const Text('Forgot password?'),
                  ),
                Wrap(
                  alignment: WrapAlignment.center,
                  children: [
                    TextButton(
                      onPressed: () => openLink(
                        context,
                        '${widget.repo.siteUrl}/terms.html',
                      ),
                      child: const Text('Terms'),
                    ),
                    TextButton(
                      onPressed: () => openLink(
                        context,
                        '${widget.repo.siteUrl}/privacy-policy.html',
                      ),
                      child: const Text('Privacy'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class SignInPanel extends StatelessWidget {
  final DiriRepository repo;
  final String description;
  const SignInPanel(this.repo, this.description, {super.key});
  @override
  Widget build(BuildContext context) => Panel(
    child: Column(
      children: [
        const Icon(Icons.person_outline, size: 48, color: navy),
        const SizedBox(height: 16),
        Text(description, textAlign: TextAlign.center),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: () => push(context, AuthScreen(repo)),
          child: const Text('Sign in or create account'),
        ),
      ],
    ),
  );
}

class AccountScreen extends StatefulWidget {
  final DiriRepository repo;
  const AccountScreen(this.repo, {super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  int revision = 0;
  Future<Json> load() async {
    final values = await Future.wait<dynamic>([
      widget.repo.profile(),
      widget.repo.progress(),
      widget.repo.owned('quiz_attempts'),
      widget.repo.owned('certificates', order: 'issue_date'),
      widget.repo.owned('certificate_requests'),
    ]);
    return {
      'profile': values[0],
      'progress': values[1],
      'attempts': values[2],
      'certificates': values[3],
      'requests': values[4],
    };
  }

  @override
  Widget build(BuildContext context) => PageBody(
    children: [
      const Heading(
        'Your pathway',
        'My DIRI dashboard',
        'Learn → Train → Assess → Certify → Verify',
      ),
      if (widget.repo.user == null)
        SignInPanel(
          widget.repo,
          'Save your lessons, track quiz results and manage your digital certificates.',
        )
      else ...[
        AsyncSection<Json>(
          key: ValueKey(revision),
          load: load,
          builder: (data) {
            final profile = data['profile'] as Json? ?? {};
            final completed = (data['progress'] as List)
                .where((r) => r['status'] == 'completed')
                .length;
            final attempts = List<Json>.from(data['attempts']);
            final certificates = List<Json>.from(data['certificates']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Panel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile['username'] ??
                            widget.repo.user?.userMetadata?['full_name'] ??
                            'DIRI learner',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      Text(widget.repo.user?.email ?? ''),
                      const SizedBox(height: 20),
                      Text('$completed / 9 lessons completed'),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: (completed / 9).clamp(0, 1),
                        color: teal,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Complete all nine lessons and pass an assessment with at least 70% to begin the certificate request process.',
                      ),
                    ],
                  ),
                ),
                Text(
                  'My certificates',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                if (certificates.isEmpty)
                  const Panel(
                    child: Text(
                      'No issued certificates yet. Your learning progress is the first step.',
                    ),
                  ),
                ...certificates.map(
                  (cert) => ActionTile(
                    Icons.verified_outlined,
                    cert['certificate_number'] ?? 'DIRI certificate',
                    '${cert['certificate_type'] ?? ''} · ${cert['status'] ?? ''}',
                    () => openLink(
                      context,
                      '${widget.repo.siteUrl}/certificate.html?id=${Uri.encodeComponent(cert['certificate_number'])}',
                    ),
                  ),
                ),
                ...List<Json>.from(data['requests']).map(
                  (request) => Panel(
                    child: Text(
                      'Certificate request: ${request['status'] ?? 'Pending review'}',
                    ),
                  ),
                ),
                BusyButton('Request a certificate', () async {
                  final name = await askText(
                    context,
                    'Name for your certificate',
                    initial: profile['username'] ?? '',
                  );
                  if (name == null) return;
                  await widget.repo.requestCertificate(name);
                  if (mounted) {
                    setState(() => revision++);
                    if (context.mounted) {
                      notice(context, 'Certificate request sent for review.');
                    }
                  }
                }),
                const SizedBox(height: 24),
                Text(
                  'Quiz history',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                if (attempts.isEmpty)
                  const Panel(
                    child: Text('Your quiz results will appear here.'),
                  ),
                ...attempts
                    .take(10)
                    .map(
                      (attempt) => Panel(
                        child: Text(
                          '${attempt['status'] == 'completed' ? '${attempt['score']} / ${attempt['total_questions']}' : 'In progress'} · ${(attempt['created_at'] ?? '').toString().split('T').first}',
                        ),
                      ),
                    ),
                OutlinedButton(
                  onPressed: () async {
                    final name = await askText(
                      context,
                      'Display name',
                      initial: profile['username'] ?? '',
                    );
                    if (name == null) return;
                    try {
                      await widget.repo.client
                          .from('profiles')
                          .update({
                            'username': name,
                            'updated_at': DateTime.now()
                                .toUtc()
                                .toIso8601String(),
                          })
                          .eq('id', widget.repo.userId);
                      if (mounted) setState(() => revision++);
                    } catch (error) {
                      if (context.mounted) {
                        notice(context, friendlyError(error));
                      }
                    }
                  },
                  child: const Text('Edit display name'),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 16),
        Text('My training', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        AsyncSection<List<Json>>(
          key: ValueKey('training-$revision'),
          load: () async => await widget.repo.client
              .from('cohort_participants')
              .select(
                'attendance_status,assessment_status,certification_status,training_cohorts(training_name,training_date,duration_hours)',
              )
              .eq('user_id', widget.repo.userId),
          builder: (rows) => rows.isEmpty
              ? const Panel(
                  child: Text('No in-person training is recorded yet.'),
                )
              : Column(
                  children: rows.map((row) {
                    final cohort = row['training_cohorts'] as Json? ?? {};
                    return Panel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cohort['training_name'] ?? 'DIRI training',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            '${cohort['training_date'] ?? 'Date to be confirmed'} · ${cohort['duration_hours'] ?? '—'} hours',
                          ),
                          const SizedBox(height: 12),
                          for (final entry in {
                            'attendance_status': 'Attendance',
                            'assessment_status': 'Assessment',
                            'certification_status': 'Certification',
                          }.entries)
                            Text(
                              '${entry.value}: ${(row[entry.key] ?? 'pending').toString().replaceAll('_', ' ')}',
                            ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
        ),
        OutlinedButton(
          onPressed: () => setState(() => revision++),
          child: const Text('Refresh dashboard'),
        ),
        BusyButton('Sign out', () => widget.repo.client.auth.signOut()),
        TextButton(
          onPressed: () async {
            final confirmation = await askText(
              context,
              'Permanently delete account',
              description:
                  'This removes your DIRI account and associated records. Type DELETE to confirm.',
            );
            if (confirmation != 'DELETE') return;
            try {
              final result = await widget.repo.client.functions.invoke(
                'delete-account',
                body: {'confirmation': 'DELETE'},
              );
              if (result.status >= 400) {
                throw StateError('Account deletion failed. Please try again.');
              }
              await widget.repo.client.auth.signOut(scope: SignOutScope.local);
            } catch (error) {
              if (context.mounted) notice(context, friendlyError(error));
            }
          },
          child: const Text(
            'Delete account',
            style: TextStyle(color: Colors.red),
          ),
        ),
      ],
      const SizedBox(height: 16),
      ActionTile(
        Icons.verified_outlined,
        'Verify a certificate',
        'Check a DIRI certificate number',
        () => push(context, VerifyScreen(widget.repo)),
      ),
    ],
  );
}

Future<String?> askText(
  BuildContext context,
  String title, {
  String initial = '',
  String? description,
}) async {
  final controller = TextEditingController(text: initial);
  final value = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (description != null) ...[
            Text(description),
            const SizedBox(height: 16),
          ],
          TextField(controller: controller, autofocus: true),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () {
            if (controller.text.trim().isNotEmpty) {
              Navigator.pop(context, controller.text.trim());
            }
          },
          child: const Text('Continue'),
        ),
      ],
    ),
  );
  // The dialog route retains its text field during its exit animation.
  await Future<void>.delayed(const Duration(milliseconds: 300));
  controller.dispose();
  return value;
}
