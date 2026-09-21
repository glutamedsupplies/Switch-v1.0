# Switch

Switch is a marketplace platform with a Flutter buyer app and a Node.js backend for seller and administrator workflows.

## Project Structure

- `lib/` contains the Flutter buyer application.
- `backend/` contains the API server and seller/admin web interfaces.
- `test/` contains Flutter tests.
- `ANALYTICS.md` describes the pre-launch marketplace funnel APIs.

## Development

Install Flutter dependencies and run the app:

```sh
flutter pub get
flutter run
```

Start the backend separately from `backend/`:

```sh
npm install
npm start
```
