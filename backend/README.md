# GMS Shopping Backend

This folder contains a simple local web server for product input and product
display.

## Run the backend

```bash
node backend/server.js
```

Or:

```bash
cd backend
npm start
```

## Open the admin page

Use this URL in your browser:

```text
http://127.0.0.1:8080
```

That page lets you create products and stores them in:

```text
backend/data/products.json
```

## API endpoint

```text
GET  /api/products
POST /api/products
```

## Flutter connection

The Flutter app reads products from:

- `http://127.0.0.1:8080` on Windows, macOS, Linux, and Flutter web
- `http://10.0.2.2:8080` on the Android emulator
