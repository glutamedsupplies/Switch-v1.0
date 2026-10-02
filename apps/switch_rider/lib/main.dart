import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import 'src/runtime.dart';
import 'src/session.dart';
import 'src/ui/auth/login_screen.dart';
import 'src/ui/common.dart';
import 'src/ui/home/home_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final session = RiderSession()..init();
  runApp(SwitchRiderApp(session: session, runtime: RiderRuntime(session)));
}

class SwitchRiderApp extends StatefulWidget {
  const SwitchRiderApp({super.key, required this.session, required this.runtime});

  final RiderSession session;
  final RiderRuntime runtime;

  @override
  State<SwitchRiderApp> createState() => _SwitchRiderAppState();
}

class _SwitchRiderAppState extends State<SwitchRiderApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  SessionPhase? _lastPhase;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    final phase = widget.session.phase;
    if (phase == _lastPhase) return;
    _lastPhase = phase;
    if (phase != SessionPhase.signedIn) widget.runtime.stop();
    // Drop screens from the previous session (e.g. after sign-out or expiry).
    _navigatorKey.currentState?.popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: SwitchBrand.teal, primary: SwitchBrand.teal),
      scaffoldBackgroundColor: SwitchBrand.surface,
      appBarTheme: const AppBarTheme(backgroundColor: SwitchBrand.surface, centerTitle: false),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
    return RiderScope(
      session: widget.session,
      runtime: widget.runtime,
      child: MaterialApp(
        title: 'Switch Rider',
        debugShowCheckedModeBanner: false,
        navigatorKey: _navigatorKey,
        theme: theme,
        home: ListenableBuilder(
          listenable: widget.session,
          builder: (context, _) => switch (widget.session.phase) {
            SessionPhase.loading => const _Splash(),
            SessionPhase.signedOut => const LoginScreen(),
            SessionPhase.signedIn => const HomeShell(),
          },
        ),
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: SwitchBrand.teal,
      body: Center(child: Icon(Icons.delivery_dining, color: Colors.white, size: 72)),
    );
  }
}
