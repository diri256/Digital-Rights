import 'package:flutter/material.dart';

import 'data.dart';
import 'ui.dart';
import 'screens/home.dart';
import 'screens/learn.dart';
import 'screens/quiz.dart';
import 'screens/chat.dart';
import 'screens/account.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Bootstrap());
}

class Bootstrap extends StatefulWidget {
  const Bootstrap({super.key});
  @override
  State<Bootstrap> createState() => _BootstrapState();
}

class _BootstrapState extends State<Bootstrap> {
  late Future<DiriRepository> repository = DiriRepository.initialize();
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'DIRI',
    theme: diriTheme(),
    debugShowCheckedModeBanner: false,
    home: FutureBuilder<DiriRepository>(
      future: repository,
      builder: (context, snapshot) {
        if (snapshot.hasData) return DiriShell(repository: snapshot.data!);
        return Scaffold(
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset('assets/logo.png', width: 150),
                    const SizedBox(height: 32),
                    if (!snapshot.hasError)
                      const CircularProgressIndicator()
                    else ...[
                      const Text('DIRI could not start. Please try again.'),
                      FilledButton(
                        onPressed: () => setState(
                          () => repository = DiriRepository.initialize(),
                        ),
                        child: const Text('Retry'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    ),
  );
}

class DiriShell extends StatefulWidget {
  final DiriRepository repository;
  const DiriShell({super.key, required this.repository});
  @override
  State<DiriShell> createState() => _DiriShellState();
}

class _DiriShellState extends State<DiriShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) => StreamBuilder(
    stream: widget.repository.client.auth.onAuthStateChange,
    builder: (context, snapshot) {
      final repo = widget.repository;
      return Scaffold(
        appBar: AppBar(
          title: Image.asset(
            'assets/logo.png',
            width: 96,
            height: 40,
            fit: BoxFit.contain,
          ),
          actions: [
            IconButton(
              tooltip: 'My account',
              onPressed: () => setState(() => index = 4),
              icon: const Icon(Icons.account_circle_outlined),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SafeArea(
          child: IndexedStack(
            index: index,
            children: [
              HomeScreen(repo, (value) => setState(() => index = value)),
              LearnScreen(repo, key: ValueKey('learn-${repo.user?.id}')),
              QuizScreen(repo, key: ValueKey('quiz-${repo.user?.id}')),
              ChatScreen(repo, key: ValueKey('chat-${repo.user?.id}')),
              AccountScreen(repo, key: ValueKey('account-${repo.user?.id}')),
            ],
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.auto_stories_outlined),
              selectedIcon: Icon(Icons.auto_stories),
              label: 'Learn',
            ),
            NavigationDestination(
              icon: Icon(Icons.quiz_outlined),
              selectedIcon: Icon(Icons.quiz),
              label: 'Quiz',
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              selectedIcon: Icon(Icons.chat_bubble),
              label: 'Mr. DIRI',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Account',
            ),
          ],
        ),
      );
    },
  );
}
