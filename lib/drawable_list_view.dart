import 'package:flutter/material.dart';

class DrawableListView extends StatelessWidget {
  const DrawableListView({
    super.key,
    this.userFirstName,
    this.userLastName,
    this.userEmail,
  });

  final String? userFirstName;
  final String? userLastName;
  final String? userEmail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dashboardColor = theme.cardColor;
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final activeColor = theme.colorScheme.primary;
    final inactiveColor =
        theme.textTheme.bodyMedium?.color ?? theme.colorScheme.onSurface;
    final firstName = userFirstName?.trim() ?? '';
    final lastName = userLastName?.trim() ?? '';
    final fullName = [firstName, lastName].where((part) => part.isNotEmpty).join(' ');
    final displayName = fullName.isEmpty ? 'Guest Shopper' : fullName;
    final email = userEmail?.trim() ?? '';

    return Drawer(
      backgroundColor: dashboardColor,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
              decoration: BoxDecoration(
                color: surfaceColor,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.account_circle_rounded,
                    size: 56,
                    color: activeColor,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (email.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            email,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: inactiveColor.withOpacity(0.72),
                              height: 1.4,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
