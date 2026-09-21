import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/order_store.dart';
import 'package:switch_app/search_bar.dart' show buyerLiveSearchMatchScore;
import 'package:switch_app/services/search_suggestions_service.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Personalized "For You" ranking from search, favorites, cart, checkout, and views.
///
/// Interests accumulate: search "pasta" then "bike" → pasta + bike stay in the
/// profile, with newer signals weighted higher.
class ForYouRecommendations {
  ForYouRecommendations._();

  static final ForYouRecommendations instance = ForYouRecommendations._();

  static const int _maxRecentViews = 40;

  final ValueNotifier<int> revisionNotifier = ValueNotifier<int>(0);

  void notifyChanged() {
    revisionNotifier.value = revisionNotifier.value + 1;
  }

  Future<String> _viewsStorageKey() async {
    final accountId = await AuthSession.getAccountId();
    if (accountId != null && accountId.trim().isNotEmpty) {
      return 'for_you_recent_views_${accountId.trim()}';
    }
    final email = await AuthSession.getAccountEmail();
    if (email != null && email.trim().isNotEmpty) {
      return 'for_you_recent_views_${email.trim().hashCode.abs()}';
    }
    return 'for_you_recent_views_guest';
  }

  Future<List<String>> loadRecentViewProductIds() async {
    final prefs = await SharedPreferences.getInstance();
    final key = await _viewsStorageKey();
    return prefs.getStringList(key) ?? const <String>[];
  }

  Future<void> recordProductView(Product product) async {
    final productId = product.id.trim();
    if (productId.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final key = await _viewsStorageKey();
    final existing = List<String>.from(prefs.getStringList(key) ?? const []);
    existing.removeWhere((id) => id == productId);
    existing.insert(0, productId);
    await prefs.setStringList(
      key,
      existing.length > _maxRecentViews
          ? existing.take(_maxRecentViews).toList(growable: false)
          : existing,
    );
    // Persist only — don't bump revision here. Immediate notify reshuffles the
    // home For You grid and makes product images blink on every open.
  }

  Future<int> _resolveShuffleSeed(String platformId) async {
    final accountId = await AuthSession.getAccountId();
    final email = await AuthSession.getAccountEmail();
    final key =
        '${accountId?.trim() ?? ''}|${email?.trim() ?? ''}|${platformId.trim()}|for_you_rest';
    return key.hashCode;
  }

  void _stableShuffle(List<Product> list, int seed) {
    final random = math.Random(seed);
    for (var i = list.length - 1; i > 0; i--) {
      final j = random.nextInt(i + 1);
      final temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
  }

  Future<_ForYouInterestProfile> _buildInterestProfile({
    required List<Product> catalog,
    String platformId = '',
  }) async {
    await Future.wait([
      FavoriteProductsStore.instance.ensureLoaded(),
      CartStore.instance.ensureLoaded(),
      OrderStore.instance.ensureLoaded(),
    ]);

    final prefs = await SharedPreferences.getInstance();
    final searchesKey = await resolveBuyerRecentSearchesKey(
      platformId: platformId,
    );
    final recentSearches = prefs.getStringList(searchesKey) ?? const <String>[];
    final recentViewIds = await loadRecentViewProductIds();

    final byId = <String, Product>{
      for (final product in catalog)
        if (product.id.trim().isNotEmpty) product.id.trim(): product,
    };

    final termWeights = <String, double>{};
    final boostProductIds = <String, double>{};

    void addTerm(String raw, double weight) {
      final normalized = _normalizeInterestTerm(raw);
      if (normalized.isEmpty || normalized.length < 2) return;
      if (_stopTerms.contains(normalized)) return;
      termWeights[normalized] = (termWeights[normalized] ?? 0) + weight;

      for (final token in normalized.split(' ')) {
        if (token.length < 3 || _stopTerms.contains(token)) continue;
        if (token == normalized) continue;
        termWeights[token] = (termWeights[token] ?? 0) + (weight * 0.55);
      }
    }

    void addProductSignals(Product product, double weight) {
      final id = product.id.trim();
      if (id.isNotEmpty) {
        boostProductIds[id] = (boostProductIds[id] ?? 0) + weight;
      }
      addTerm(product.name, weight * 0.85);
      for (final category in product.categoryList) {
        addTerm(category, weight);
      }
      addTerm(product.companyName, weight * 0.35);
    }

    for (var i = 0; i < recentSearches.length && i < 20; i++) {
      final decay = 1.0 - (i * 0.04);
      addTerm(recentSearches[i], 14.0 * decay.clamp(0.35, 1.0));
    }

    for (final id in FavoriteProductsStore.instance.favoriteProductIdsNotifier
        .value) {
      final product = byId[id.trim()];
      if (product != null) {
        addProductSignals(product, 9);
      }
    }

    for (final item in CartStore.instance.cartItemsNotifier.value) {
      final product = byId[item.productId.trim()];
      if (product != null) {
        addProductSignals(product, 11);
      } else {
        addTerm(item.productName, 10);
        addTerm(item.category, 11);
        addTerm(item.companyName, 3);
        final id = item.productId.trim();
        if (id.isNotEmpty) {
          boostProductIds[id] = (boostProductIds[id] ?? 0) + 8;
        }
      }
    }

    final seenOrderProducts = <String>{};
    final orders = [...OrderStore.instance.ordersNotifier.value]
      ..sort((a, b) => b.createdAtEpochMs.compareTo(a.createdAtEpochMs));
    for (var i = 0; i < orders.length && i < 40; i++) {
      final order = orders[i];
      final id = order.productId.trim();
      if (id.isEmpty || !seenOrderProducts.add(id)) continue;
      final decay = 1.0 - (i * 0.02);
      final weight = 16.0 * decay.clamp(0.4, 1.0);
      final product = byId[id];
      if (product != null) {
        addProductSignals(product, weight);
      } else {
        addTerm(order.productName, weight);
        boostProductIds[id] = (boostProductIds[id] ?? 0) + weight * 0.6;
      }
    }

    for (var i = 0; i < recentViewIds.length && i < 25; i++) {
      final id = recentViewIds[i].trim();
      final product = byId[id];
      if (product == null) continue;
      final decay = 1.0 - (i * 0.03);
      addProductSignals(product, 6.5 * decay.clamp(0.35, 1.0));
    }

    return _ForYouInterestProfile(
      termWeights: Map<String, double>.unmodifiable(termWeights),
      boostProductIds: Map<String, double>.unmodifiable(boostProductIds),
      hasPersonalSignals: termWeights.isNotEmpty || boostProductIds.isNotEmpty,
    );
  }

  /// Full All-home feed: personalized matches first, then remaining listings
  /// in a stable per-user random order.
  Future<List<Product>> buildHomeListingFeed(
    List<Product> products, {
    String platformId = '',
  }) async {
    final visible = filterVisibleProducts(products);
    if (visible.isEmpty) return const <Product>[];

    final profile = await _buildInterestProfile(
      catalog: visible,
      platformId: platformId,
    );
    final seed = await _resolveShuffleSeed(platformId);

    if (!profile.hasPersonalSignals) {
      final shuffled = [...visible];
      _stableShuffle(shuffled, seed);
      return List<Product>.unmodifiable(shuffled);
    }

    final scored = <({Product product, double score})>[];
    for (final product in visible) {
      final score = _scoreProduct(product, profile);
      if (score <= 0) continue;
      scored.add((product: product, score: score));
    }

    scored.sort((a, b) {
      final scoreCompare = b.score.compareTo(a.score);
      if (scoreCompare != 0) return scoreCompare;
      final soldCompare = b.product.sold.compareTo(a.product.sold);
      if (soldCompare != 0) return soldCompare;
      final ratingCompare = b.product.rating.compareTo(a.product.rating);
      if (ratingCompare != 0) return ratingCompare;
      return a.product.name.toLowerCase().compareTo(
        b.product.name.toLowerCase(),
      );
    });

    final forYou = scored.map((entry) => entry.product).toList(growable: false);
    final forYouIds = {for (final product in forYou) product.id};
    final rest = [
      for (final product in visible)
        if (!forYouIds.contains(product.id)) product,
    ];
    _stableShuffle(rest, seed);

    return List<Product>.unmodifiable([...forYou, ...rest]);
  }

  double _scoreProduct(Product product, _ForYouInterestProfile profile) {
    var score = profile.boostProductIds[product.id.trim()] ?? 0;

    final fields = <(String, double)>[
      (product.name, 1.0),
      (product.categoryLabel, 1.15),
      (product.description, 0.45),
      (product.companyName, 0.4),
    ];

    for (final entry in profile.termWeights.entries) {
      final term = entry.key;
      final weight = entry.value;
      var bestMatch = 0;
      for (final field in fields) {
        final match = buyerLiveSearchMatchScore(field.$1, term);
        if (match > bestMatch) {
          bestMatch = match;
        }
      }
      if (bestMatch <= 0) continue;

      final matchFactor = bestMatch >= 200
          ? 1.0
          : bestMatch >= 100
          ? 0.85
          : bestMatch >= 85
          ? 0.7
          : 0.45;
      score += weight * matchFactor;

      if (product.belongsToCategory(term) ||
          product.categoryList.any(
            (category) =>
                category.toLowerCase().contains(term) ||
                term.contains(category.toLowerCase()),
          )) {
        score += weight * 0.35;
      }
    }

    if (score > 0) {
      score += product.rating.clamp(0, 5) * 0.15;
      if (product.sold > 0) {
        score += (product.sold > 50 ? 1.2 : product.sold / 50.0);
      }
    }

    return score;
  }

  static String _normalizeInterestTerm(String raw) {
    return raw
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^\w\s+]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static const Set<String> _stopTerms = {
    'the',
    'and',
    'for',
    'with',
    'from',
    'this',
    'that',
    'your',
    'you',
    'all',
    'new',
    'best',
    'item',
    'items',
    'product',
    'products',
    'shop',
    'buy',
    'sale',
    'free',
    'pcs',
    'pc',
    'set',
  };
}

class _ForYouInterestProfile {
  const _ForYouInterestProfile({
    required this.termWeights,
    required this.boostProductIds,
    required this.hasPersonalSignals,
  });

  final Map<String, double> termWeights;
  final Map<String, double> boostProductIds;
  final bool hasPersonalSignals;
}
