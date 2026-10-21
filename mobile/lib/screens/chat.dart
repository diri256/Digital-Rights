import 'package:flutter/material.dart';

import '../data.dart';
import '../ui.dart';

class ChatScreen extends StatefulWidget {
  final DiriRepository repo;
  const ChatScreen(this.repo, {super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final scroll = ScrollController();
  final List<Json> messages = [];
  bool busy = false;
  String? error;
  @override
  void dispose() {
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> send([String? suggestion]) async {
    final message = (suggestion ?? input.text).trim();
    if (busy || message.isEmpty || message.length > 1000) return;
    final history = List<Json>.from(messages);
    setState(() {
      busy = true;
      error = null;
      messages.add({'role': 'user', 'content': message});
      input.clear();
    });
    try {
      final reply = await widget.repo.chat(message, history);
      if (mounted) {
        setState(() => messages.add(reply));
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          messages.removeLast();
          input.text = message;
          error = friendlyError(err);
        });
      }
    } finally {
      if (mounted) {
        setState(() => busy = false);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (scroll.hasClients) {
            scroll.animateTo(
              scroll.position.maxScrollExtent,
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOut,
            );
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Expanded(
        child: ListView(
          controller: scroll,
          padding: const EdgeInsets.all(20),
          children: [
            const Heading(
              'Meet your learning companion',
              'Hello, I’m Mr. DIRI.',
              'Ask about digital rights, privacy or staying safe online. You can write in English or Luganda.',
            ),
            if (messages.isEmpty) ...[
              const Panel(
                child: Text(
                  'Don’t share passwords, PINs or one-time codes. AI can make mistakes; check important advice.',
                ),
              ),
              ...[
                'How can I spot a scam?',
                'How do I protect my privacy?',
                'Explain digital rights',
              ].map(
                (text) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OutlinedButton(
                    onPressed: () => send(text),
                    child: Text(text),
                  ),
                ),
              ),
            ],
            ...messages.map(
              (message) => Align(
                alignment: message['role'] == 'user'
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 600),
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: message['role'] == 'user' ? navy : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SelectableText(
                        message['content'],
                        style: TextStyle(
                          fontSize: 16,
                          height: 1.5,
                          color: message['role'] == 'user' ? Colors.white : ink,
                        ),
                      ),
                      for (final source in (message['sources'] as List? ?? []))
                        TextButton(
                          onPressed: () => openLink(context, source['url']),
                          child: Text(source['title']),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            if (busy)
              const Padding(
                padding: EdgeInsets.all(12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    SizedBox(width: 12),
                    Text('Mr. DIRI is thinking…'),
                  ],
                ),
              ),
            if (error != null)
              Text(error!, style: const TextStyle(color: Colors.red)),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextField(
                controller: input,
                minLines: 1,
                maxLines: 4,
                maxLength: 1000,
                enabled: !busy,
                decoration: const InputDecoration(
                  hintText: 'Ask Mr. DIRI…',
                  counterText: '',
                ),
                onSubmitted: (_) => send(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Send message',
              onPressed: busy ? null : send,
              icon: const Icon(Icons.send),
            ),
          ],
        ),
      ),
    ],
  );
}
