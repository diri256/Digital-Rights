import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data.dart';
import '../ui.dart';

class ResourceScreen extends StatelessWidget {
  final DiriRepository repo;
  final String page;
  const ResourceScreen(this.repo, this.page, {super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('DIRI resources')),
    body: SafeArea(
      child: PageBody(
        children: [
          AsyncSection<Json>(
            load: () async {
              final pages =
                  jsonDecode(
                        await rootBundle.loadString('assets/resources.json'),
                      )
                      as Json;
              return pages[page] as Json;
            },
            builder: (resource) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Heading(
                  'From the DIRI website',
                  resource['title'],
                  'Available to read offline.',
                ),
                for (final block in resource['blocks'] as List)
                  Padding(
                    padding: EdgeInsets.only(
                      top: block['type'] == 'heading' ? 16 : 0,
                      bottom: 14,
                    ),
                    child: SelectableText(
                      '${block['type'] == 'bullet' ? '• ' : ''}${block['text']}',
                      style: block['type'] == 'heading'
                          ? Theme.of(context).textTheme.titleLarge
                          : Theme.of(context).textTheme.bodyLarge,
                    ),
                  ),
                if (page == 'contact')
                  FilledButton.icon(
                    onPressed: () =>
                        openLink(context, 'mailto:diriuganda@gmail.com'),
                    icon: const Icon(Icons.email_outlined),
                    label: const Text('Email DIRI'),
                  ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () =>
                      openLink(context, '${repo.siteUrl}/$page.html'),
                  child: const Text('Check the latest website version'),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class NewsScreen extends StatefulWidget {
  final DiriRepository repo;
  const NewsScreen(this.repo, {super.key});
  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  String query = '', category = 'All';
  int revision = 0;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('News & updates'),
      actions: [
        IconButton(
          tooltip: 'Refresh news',
          onPressed: () => setState(() => revision++),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: SafeArea(
      child: PageBody(
        children: [
          const Heading(
            'Stay informed',
            'Digital rights news',
            'Published updates from DIRI’s editorial desk.',
          ),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Search updates',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (value) => setState(() => query = value),
          ),
          const SizedBox(height: 16),
          AsyncSection<List<Json>>(
            key: ValueKey(revision),
            load: () async => await widget.repo.client
                .from('news_articles')
                .select()
                .eq('status', 'published')
                .order('published_at', ascending: false)
                .limit(50),
            builder: (articles) {
              final categories = {
                'All',
                ...articles.map((a) => (a['category'] ?? 'Updates').toString()),
              };
              final filtered = articles
                  .where(
                    (a) =>
                        (category == 'All' || a['category'] == category) &&
                        '${a['title']} ${a['summary']}'.toLowerCase().contains(
                          query.toLowerCase(),
                        ),
                  )
                  .toList();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Wrap(
                    spacing: 8,
                    children: categories
                        .map(
                          (value) => ChoiceChip(
                            label: Text(value),
                            selected: category == value,
                            onSelected: (_) => setState(() => category = value),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 16),
                  if (filtered.isEmpty)
                    const Panel(
                      child: Text(
                        'No published articles match this view. Try another search or refresh later.',
                      ),
                    ),
                  for (final article in filtered)
                    ActionTile(
                      Icons.article_outlined,
                      article['title'] ?? 'DIRI update',
                      '${article['category'] ?? 'Updates'} · ${(article['published_at'] ?? '').toString().split('T').first}\n${article['summary'] ?? ''}',
                      () => push(
                        context,
                        NewsArticleScreen(widget.repo, article),
                      ),
                    ),
                  TextButton(
                    onPressed: () => openLink(
                      context,
                      '${widget.repo.siteUrl}/updates.html',
                    ),
                    child: const Text('More updates on the website'),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    ),
  );
}

class NewsArticleScreen extends StatelessWidget {
  final DiriRepository repo;
  final Json article;
  const NewsArticleScreen(this.repo, this.article, {super.key});
  @override
  Widget build(BuildContext context) {
    final blocks = (article['content_blocks'] as List? ?? []).isNotEmpty
        ? article['content_blocks'] as List
        : (article['body'] as List? ?? [])
              .map((text) => {'type': 'paragraph', 'text': text})
              .toList();
    final hero = article['preview_image_url'] ?? article['image_url'];
    return Scaffold(
      appBar: AppBar(title: const Text('DIRI update')),
      body: SafeArea(
        child: PageBody(
          children: [
            Heading(
              article['category'] ?? 'Updates',
              article['title'] ?? '',
              article['summary'] ?? '',
            ),
            Text(
              '${(article['published_at'] ?? '').toString().split('T').first} · ${article['reviewer'] ?? 'DIRI Editorial Desk'}',
            ),
            const SizedBox(height: 20),
            if (hero is String && hero.isNotEmpty)
              articleImage(hero, article['title'] ?? ''),
            for (final block in blocks)
              if (block['type'] == 'image' && block['url'] is String)
                articleImage(block['url'], block['caption'] ?? '')
              else if (block['type'] == 'video' && block['url'] is String)
                OutlinedButton.icon(
                  onPressed: () => openLink(context, block['url']),
                  icon: const Icon(Icons.play_circle_outline),
                  label: const Text('Watch supporting video'),
                )
              else
                Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: SelectableText(
                    block['text']?.toString() ?? '',
                    style: block['type'] == 'heading'
                        ? Theme.of(context).textTheme.titleLarge
                        : Theme.of(context).textTheme.bodyLarge,
                  ),
                ),
            OutlinedButton(
              onPressed: () => openLink(
                context,
                '${repo.siteUrl}/news-article.html?slug=${Uri.encodeComponent(article['slug'] ?? '')}',
              ),
              child: const Text('View on website'),
            ),
          ],
        ),
      ),
    );
  }

  Widget articleImage(String url, String caption) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Image.network(
            url,
            fit: BoxFit.cover,
            semanticLabel: caption,
            errorBuilder: (_, error, stack) => const Padding(
              padding: EdgeInsets.all(24),
              child: Icon(Icons.image_not_supported_outlined),
            ),
          ),
        ),
        if (caption.isNotEmpty)
          Padding(padding: const EdgeInsets.only(top: 8), child: Text(caption)),
      ],
    ),
  );
}
