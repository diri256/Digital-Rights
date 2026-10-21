import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

const navy = Color(0xFF0B3D91);
const teal = Color(0xFF11B8B8);
const ink = Color(0xFF1F2937);
const canvas = Color(0xFFF5F9FC);

ThemeData diriTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'Roboto',
  colorScheme: ColorScheme.fromSeed(
    seedColor: navy,
    secondary: teal,
    surface: Colors.white,
  ),
  scaffoldBackgroundColor: canvas,
  appBarTheme: const AppBarTheme(
    backgroundColor: canvas,
    foregroundColor: navy,
    centerTitle: false,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(48, 52),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  ),
  textTheme: const TextTheme(
    headlineLarge: TextStyle(
      fontSize: 34,
      height: 1.15,
      fontWeight: FontWeight.w800,
      color: navy,
    ),
    headlineSmall: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w800,
      color: navy,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: navy,
    ),
    bodyLarge: TextStyle(fontSize: 17, height: 1.55, color: ink),
    bodyMedium: TextStyle(fontSize: 15, height: 1.5, color: ink),
  ),
);

String friendlyError(Object error) {
  if (error is AuthException) return error.message;
  if (error is PostgrestException) {
    if (error.code == 'P0001') return error.message;
    return 'We could not save or load this information. Please try again. (${error.code ?? 'database'})';
  }
  if (error is StateError) return error.message.toString();
  return 'Unable to connect. Check your internet connection and try again.';
}

void notice(BuildContext context, String message) => ScaffoldMessenger.of(
  context,
).showSnackBar(SnackBar(content: Text(message)));

Future<void> openLink(BuildContext context, String link) async {
  final uri = Uri.tryParse(link);
  if (uri == null || !['https', 'mailto', 'tel'].contains(uri.scheme)) return;
  try {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw StateError('Could not open this link.');
    }
  } catch (error) {
    if (context.mounted) notice(context, friendlyError(error));
  }
}

Future<T?> push<T>(BuildContext context, Widget page) =>
    Navigator.of(context).push<T>(MaterialPageRoute(builder: (_) => page));

class PageBody extends StatelessWidget {
  final List<Widget> children;
  const PageBody({super.key, required this.children});
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
    child: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 780),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    ),
  );
}

class Panel extends StatelessWidget {
  final Widget child;
  final Color? color;
  const Panel({super.key, required this.child, this.color});
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(22),
    decoration: BoxDecoration(
      color: color ?? Colors.white,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: navy.withValues(alpha: .07)),
    ),
    child: child,
  );
}

class Heading extends StatelessWidget {
  final String tag, title, description;
  const Heading(this.tag, this.title, this.description, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          tag.toUpperCase(),
          style: const TextStyle(
            color: Color(0xFF078484),
            fontWeight: FontWeight.w800,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 10),
        Text(title, style: Theme.of(context).textTheme.headlineLarge),
        const SizedBox(height: 12),
        Text(description, style: Theme.of(context).textTheme.bodyLarge),
      ],
    ),
  );
}

class ActionTile extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  const ActionTile(
    this.icon,
    this.title,
    this.subtitle,
    this.onTap, {
    super.key,
  });
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    elevation: 0,
    color: Colors.white,
    child: ListTile(
      contentPadding: const EdgeInsets.all(16),
      leading: CircleAvatar(
        backgroundColor: teal.withValues(alpha: .12),
        child: Icon(icon, color: navy),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    ),
  );
}

class AsyncSection<T> extends StatefulWidget {
  final Future<T> Function() load;
  final Widget Function(T value) builder;
  const AsyncSection({super.key, required this.load, required this.builder});
  @override
  State<AsyncSection<T>> createState() => _AsyncSectionState<T>();
}

class _AsyncSectionState<T> extends State<AsyncSection<T>> {
  late Future<T> future = widget.load();
  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Padding(
          padding: EdgeInsets.all(40),
          child: Center(child: CircularProgressIndicator()),
        );
      }
      if (snapshot.hasError) {
        return Panel(
          child: Column(
            children: [
              const Icon(Icons.cloud_off_outlined, size: 36, color: navy),
              const SizedBox(height: 12),
              Text(friendlyError(snapshot.error!)),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => setState(() => future = widget.load()),
                child: const Text('Try again'),
              ),
            ],
          ),
        );
      }
      return widget.builder(snapshot.data as T);
    },
  );
}

class BusyButton extends StatefulWidget {
  final String label;
  final Future<void> Function() action;
  const BusyButton(this.label, this.action, {super.key});
  @override
  State<BusyButton> createState() => _BusyButtonState();
}

class _BusyButtonState extends State<BusyButton> {
  bool busy = false;
  @override
  Widget build(BuildContext context) => FilledButton(
    onPressed: busy
        ? null
        : () async {
            setState(() => busy = true);
            try {
              await widget.action();
            } catch (error) {
              if (context.mounted) notice(context, friendlyError(error));
            } finally {
              if (mounted) setState(() => busy = false);
            }
          },
    child: busy
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : Text(widget.label),
  );
}
