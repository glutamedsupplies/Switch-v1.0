import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:switch_app/main.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/profile.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('app snackbar appears near the top of the screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            return Scaffold(
              body: Center(
                child: TextButton(
                  onPressed: () {
                    AppSnackBar.showInfo(
                      context,
                      message: 'Top snackbar message',
                      duration: const Duration(milliseconds: 500),
                    );
                  },
                  child: const Text('Show snackbar'),
                ),
              ),
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('Show snackbar'));
    await tester.pump();

    final messageRect = tester.getRect(find.text('Top snackbar message'));
    final screenHeight = tester.getSize(find.byType(MaterialApp)).height;

    expect(messageRect.center.dy, lessThan(screenHeight / 2));
    expect(messageRect.top, lessThan(120));
    expect(find.byType(SnackBar), findsNothing);

    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Top snackbar message'), findsNothing);
  });

  testWidgets('profile page shows settings action above sign out', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      MaterialApp(
        home: ProfilePage(
          backgroundColor: Colors.white,
          surfaceColor: Colors.white,
          titleColor: Colors.black,
          secondaryColor: Colors.grey.shade700,
          primaryColor: Colors.blue,
          themeModeNotifier: ValueNotifier(ThemeMode.light),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Sign out'), findsOneWidget);
  });

  testWidgets('header, search, footer, and products render', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _FakeProductRepository(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.menu_rounded), findsOneWidget);
    expect(find.byIcon(Icons.shopping_cart_outlined), findsOneWidget);
    expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
    expect(find.byIcon(Icons.search_rounded), findsOneWidget);
    expect(find.text('Flash Deals'), findsOneWidget);
    expect(find.text('Top Selling'), findsOneWidget);
    expect(find.text('Top Reviews'), findsOneWidget);
    expect(find.text('Canvas Everyday Tote'), findsWidgets);
    expect(find.text('Stoneware Coffee Mug'), findsWidgets);
    expect(find.text('4.8 | 2139 sold'), findsWidgets);
    expect(find.text('3.5 | 557 sold'), findsWidgets);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Shop'), findsOneWidget);
    expect(find.text('Order'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  testWidgets('hamburger opens drawable list view', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _FakeProductRepository(),
      ),
    );

    await tester.tap(find.byIcon(Icons.menu_rounded));
    await tester.pumpAndSettle();

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Guest Shopper'), findsOneWidget);
  });

  testWidgets('dark mode drawer item switches when tapped', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _FakeProductRepository(),
      ),
    );

    await tester.tap(find.byIcon(Icons.menu_rounded));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Light Mode'));
    await tester.pump();
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.menu_rounded));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.dark_mode_outlined), findsOneWidget);
    expect(find.text('Dark Mode'), findsOneWidget);
  });

  testWidgets('scroll-to-top button appears after scrolling dashboard', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _FakeProductRepository(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.keyboard_arrow_up_rounded), findsNothing);

    await tester.drag(
      find.byType(SingleChildScrollView).first,
      const Offset(0, -500),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.keyboard_arrow_up_rounded), findsOneWidget);

    await tester.tap(find.byIcon(Icons.keyboard_arrow_up_rounded));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.keyboard_arrow_up_rounded), findsNothing);
  });

  testWidgets('slideshow pauses during user drag and resumes afterward', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _FakeProductRepository(),
      ),
    );
    await tester.pumpAndSettle();

    final pageViewFinder = find.byType(PageView);
    final pageController = tester.widget<PageView>(pageViewFinder).controller!;

    expect(pageController.page, 0);

    await tester.pump(const Duration(seconds: 4));
    await tester.pump(const Duration(milliseconds: 500));

    expect(pageController.page, 1);

    final gesture = await tester.startGesture(tester.getCenter(pageViewFinder));
    await gesture.moveBy(const Offset(-180, 0));
    await tester.pump();

    final pageWhileDragging = pageController.page!;

    await tester.pump(const Duration(seconds: 5));

    expect(pageController.page, closeTo(pageWhileDragging, 0.01));

    await gesture.up();
    await tester.pumpAndSettle();

    final resumedFromPage = pageController.page!;

    await tester.pump(const Duration(seconds: 4));
    await tester.pump(const Duration(milliseconds: 500));

    expect(pageController.page, greaterThan(resumedFromPage));
  });

  testWidgets('top reviews only accepts products rated 4.5 and above', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _LowRatedProductRepository(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Top Reviews'));
    await tester.pumpAndSettle();

    expect(find.text('No top reviews yet'), findsOneWidget);
    expect(
      find.text(
        'Only products rated 4.5 to 5.0 appear here. Add higher-rated products, then pull down to refresh.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('top selling shows only the top 10 highest-sold products', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MyApp(
        initialThemeMode: ThemeMode.light,
        productRepository: _TopSellingProductRepository(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Top Selling'));
    await tester.pumpAndSettle();

    final dashboardScrollView = find.byType(SingleChildScrollView).first;

    expect(
      find.descendant(of: dashboardScrollView, matching: find.text('1')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: dashboardScrollView, matching: find.text('10')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: dashboardScrollView, matching: find.text('11')),
      findsNothing,
    );
    expect(
      find.descendant(
        of: dashboardScrollView,
        matching: find.text('Top Seller 1'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: dashboardScrollView,
        matching: find.text('Top Seller 10'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: dashboardScrollView,
        matching: find.text('Top Seller 11'),
      ),
      findsNothing,
    );
  });
}

class _FakeProductRepository implements ProductRepository {
  @override
  Future<List<Product>> fetchProducts({bool forceRefresh = false}) async {
    return [
      _buildProduct(
        id: 'prd-1',
        name: 'Canvas Everyday Tote',
        originalPrice: 799,
        category: 'Bags',
        description: 'Minimal tote bag for daily shopping and essentials.',
        createdAt: DateTime(2026, 5, 9),
        salesPrice: 699,
        sold: 2139,
        rating: 4.8,
      ),
      _buildProduct(
        id: 'prd-2',
        name: 'Stoneware Coffee Mug',
        originalPrice: 349,
        category: 'Home',
        description: 'Clean ceramic mug with a soft matte finish.',
        createdAt: DateTime(2026, 5, 9),
        sold: 557,
        rating: 3.5,
      ),
      _buildProduct(
        id: 'prd-3',
        name: 'Linen Table Runner',
        originalPrice: 459,
        category: 'Dining',
        description: 'Soft woven runner for everyday table styling.',
        createdAt: DateTime(2026, 5, 8),
        sold: 318,
        rating: 4.4,
      ),
      _buildProduct(
        id: 'prd-4',
        name: 'Travel Organizer Pouch',
        originalPrice: 299,
        category: 'Travel',
        description: 'Compact pouch for cables, chargers, and essentials.',
        createdAt: DateTime(2026, 5, 8),
        sold: 842,
        rating: 4.2,
      ),
      _buildProduct(
        id: 'prd-5',
        name: 'Reusable Water Bottle',
        originalPrice: 520,
        category: 'Lifestyle',
        description: 'Double-wall bottle that keeps drinks cold for hours.',
        createdAt: DateTime(2026, 5, 7),
        sold: 1290,
        rating: 4.7,
      ),
      _buildProduct(
        id: 'prd-6',
        name: 'Desk Storage Tray',
        originalPrice: 275,
        category: 'Office',
        description: 'Low-profile tray for pens, clips, and daily tools.',
        createdAt: DateTime(2026, 5, 6),
        sold: 406,
        rating: 4.1,
      ),
    ];
  }

  @override
  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  }) async {
    return fetchProducts();
  }
}

class _LowRatedProductRepository implements ProductRepository {
  @override
  Future<List<Product>> fetchProducts({bool forceRefresh = false}) async {
    return [
      _buildProduct(
        id: 'low-1',
        name: 'Basic Notepad',
        originalPrice: 120,
        category: 'Office',
        description: 'Simple notepad for daily lists and reminders.',
        createdAt: DateTime(2026, 5, 9),
        sold: 88,
        rating: 4.2,
      ),
      _buildProduct(
        id: 'low-2',
        name: 'Plastic Storage Box',
        originalPrice: 260,
        category: 'Home',
        description: 'Compact box for small household items.',
        createdAt: DateTime(2026, 5, 8),
        sold: 43,
        rating: 3.9,
      ),
    ];
  }

  @override
  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  }) async {
    return fetchProducts();
  }
}

class _TopSellingProductRepository implements ProductRepository {
  @override
  Future<List<Product>> fetchProducts({bool forceRefresh = false}) async {
    final now = DateTime.now();

    return [
      for (var rank = 1; rank <= 11; rank++)
        _buildProduct(
          id: 'top-$rank',
          name: 'Top Seller $rank',
          originalPrice: 199 + rank.toDouble(),
          category: 'Category $rank',
          description: 'Top-selling test product number $rank.',
          createdAt: now.subtract(Duration(days: rank - 1)),
          sold: (12 - rank) * 100,
          rating: 4.0,
        ),
    ];
  }

  @override
  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  }) async {
    return fetchProducts();
  }
}

Product _buildProduct({
  required String id,
  required String name,
  required double originalPrice,
  required String category,
  required String description,
  required DateTime createdAt,
  required int sold,
  required double rating,
  double? salesPrice,
}) {
  return Product(
    id: id,
    name: name,
    originalPrice: originalPrice,
    category: category,
    description: description,
    imageUrl: '',
    createdAt: createdAt,
    salesPrice: salesPrice,
    sold: sold,
    rating: rating,
  );
}
