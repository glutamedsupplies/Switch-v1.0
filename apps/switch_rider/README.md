# Switch Rider

Delivery partner app for the Switch marketplace. It is a separate app (own name, icon,
bundle ID, permissions, and release cycle) that talks to the same Switch backend through
the rider-only `/api/rider/*` endpoints. Rider sessions cannot reach buyer, seller, or
Super Admin APIs.

## Run

```bash
cd apps/switch_rider
flutter pub get
# Local backend (Android emulator uses 10.0.2.2 automatically):
flutter run
# Any other backend:
flutter run --dart-define=API_BASE_URL=https://api.example.com
```

Release builds must pass `API_BASE_URL` with an `https://` URL; cleartext HTTP is only
allowed in Android debug builds.

## Before publishing

- Replace the placeholder IDs (`com.example.switch_rider` on Android, the iOS bundle ID)
  with your real, registered identifiers.
- Regenerate icons after changing `assets/icon/*`: `dart run flutter_launcher_icons`.

## Structure

- `lib/src/rider_api.dart` – typed client for `/api/rider/*` (uses `switch_core`).
- `lib/src/session.dart` – session token (secure storage) and rider profile.
- `lib/src/runtime.dart` – dashboard + offer polling, online/offline.
- `lib/src/location_reporter.dart` – shares location only while online or delivering.
- `lib/src/ui/` – screens (home, jobs, earnings, history, account, support, safety).
