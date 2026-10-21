import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diri_app/data.dart';
import 'package:diri_app/ui.dart';
import 'package:diri_app/screens/home.dart';

void main() {
  late SupabaseClient client;
  setUp(() {
    client = SupabaseClient(
      'https://example.supabase.co',
      'test-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    );
  });
  tearDown(() => client.dispose());
  testWidgets('render phone home preview', (tester) async {
    final regular = FontLoader('Roboto')
      ..addFont(rootBundle.load('assets/fonts/roboto-regular.ttf'));
    await regular.load();
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final key = GlobalKey();
    await tester.pumpWidget(
      MaterialApp(
        theme: diriTheme(),
        home: RepaintBoundary(
          key: key,
          child: Scaffold(
            appBar: AppBar(
              title: Image.asset('assets/logo.png', width: 96),
              actions: const [
                Padding(
                  padding: EdgeInsets.all(16),
                  child: Icon(Icons.account_circle_outlined),
                ),
              ],
            ),
            body: HomeScreen(
              DiriRepository(client, 'https://diri.online', []),
              (_) {},
            ),
            bottomNavigationBar: NavigationBar(
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
                NavigationDestination(
                  icon: Icon(Icons.auto_stories_outlined),
                  label: 'Learn',
                ),
                NavigationDestination(
                  icon: Icon(Icons.quiz_outlined),
                  label: 'Quiz',
                ),
                NavigationDestination(
                  icon: Icon(Icons.chat_bubble_outline),
                  label: 'Mr. DIRI',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline),
                  label: 'Account',
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.runAsync(
      () => precacheImage(
        const AssetImage('assets/logo.png'),
        key.currentContext!,
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    final boundary =
        key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    await tester.runAsync(() async {
      final rendered = await boundary.toImage(pixelRatio: 2);
      final bytes = await rendered.toByteData(format: ui.ImageByteFormat.png);
      final output = File('build/previews/diri-home.png');
      await output.parent.create(recursive: true);
      await output.writeAsBytes(bytes!.buffer.asUint8List());
      rendered.dispose();
    });
  });
}
