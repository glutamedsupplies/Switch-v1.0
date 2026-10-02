import 'dart:async';

import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../account/account_tab.dart';
import '../assistant/rider_assistant.dart';
import '../common.dart';
import '../earnings/earnings_tab.dart';
import '../history/history_tab.dart';
import '../jobs/jobs_tab.dart';
import 'home_tab.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  int _index = 0;
  RiderAssistantController? _assistant;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.runtime.start();
    });
  }

  RiderAssistantController _assistantFor(BuildContext context) {
    final runtime = context.runtime;
    return _assistant ??= RiderAssistantController(
      client: context.api.client,
      onRiderRefresh: () => unawaited(runtime.refresh()),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.runtime.refresh();
      context.session.refreshProfile();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _assistant?.dispose();
    super.dispose();
  }

  void _selectTab(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeTab(onOpenTab: _selectTab),
      const JobsTab(),
      const EarningsTab(),
      const HistoryTab(),
      const AccountTab(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      floatingActionButton: FloatingActionButton(
        tooltip: 'Switch Rider AI',
        backgroundColor: SwitchBrand.ink,
        foregroundColor: Colors.white,
        onPressed: () => openRiderAssistant(context, _assistantFor(context)),
        child: const Icon(Icons.auto_awesome),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _selectTab,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping),
            label: 'Jobs',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Earnings',
          ),
          NavigationDestination(icon: Icon(Icons.history), label: 'History'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }
}
