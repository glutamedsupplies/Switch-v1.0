# Admin Manual

## Admin Login

1. Start the backend.
2. Open `http://127.0.0.1:8080/login.html`.
3. Enter admin email and password.
4. After successful login, the admin dashboard opens.
5. The browser stores admin session data and admin scope for subsequent admin API calls.

## Dashboard

Use the Store Overview dashboard to monitor:

- Orders today
- Pending/cancelled orders
- Courier/order partner counts
- Low stock and dead stock
- Staff online
- Active users
- Top selling products
- Top reviewed products
- Followers

The dashboard pulls data from orders, products, accounts, and follower APIs.

## Inventory

1. Open Inventory or Stock.
2. Review product stock levels, low stock, and stock history.
3. Add or deduct stock where the page allows.
4. Use expiry date fields when managing perishable inventory.
5. Packing actions can deduct inventory automatically when `deductInventory` is enabled.
6. Cancelling orders can restore previously deducted inventory.

## Products

1. Open Products or Product Listing.
2. Add a new listing.
3. Complete product details, pricing, category, media, variants, barcode, partner selections, visual search images, and 3D model fields where applicable.
4. Submit the product.
5. New products are sent for super admin approval.
6. Edit existing products from the product listing page.
7. Toggle product visibility for approved products.

## Orders

1. Open order, packing, tracking, or employee dashboard pages.
2. Review order groups by status.
3. Pack an order group to move it to To Ship.
4. Ship an order group to move it to To Receive.
5. Cancel an order group when needed.
6. Review concern/cancellation requests and accept or reject them.

## Reports and Analytics

Use Insight and Product Insight pages to review:

- Sales and order trends
- Product performance
- Review and rating performance
- Delivery/payment-related order data
- Chat activity where available

Most reporting is computed in browser scripts from API data.

## Users

1. Open User Data to review app user/customer records.
2. Customer account records come from `accounts.json` with source and role fields.
3. Customer orders and reviews are linked by `accountId`.

## Employees

1. Open Employee Data or Register.
2. Create employee accounts with personal/contact information.
3. Assign position, schedule, and access permissions.
4. Upload employee documents if needed.
5. Edit or delete employee records.
6. Employee login uses employee ID and password.
7. Face verification metadata can be loaded from the configured Face Attendance files.

## Live Chat

1. Open Live Chat or the employee dashboard chat section.
2. Review customer chat threads.
3. Reply with text or media.
4. Use edit/delete where appropriate.
5. Mark support messages as read.
6. Trigger AI reply only if the backend is configured with chat AI environment variables.

## Delivery Partners

1. Open Delivery Partners.
2. Add branch/name, description, and logo.
3. Activate or deactivate partners.
4. Delete partners when no longer needed.
5. Products and checkout can reference active delivery partners.

## Payment Partners

1. Open Payment Partners.
2. Add branch/name and logo.
3. Activate or deactivate partners.
4. Delete partners when no longer needed.
5. Checkout records selected payment partner details on orders.

## Settings

Admin pages include shared settings/theme menus for color customization and notification behavior. Some settings are stored in browser local storage and are applied per browser/session.

## Super Admin Functions

Super admin users open `root_login.html` or the configured super admin entry point and log in with root credentials.

Super admin can:

- View and create admin companies.
- Notify, deactivate, or ban companies.
- Clear a company workspace data.
- Manage global categories.
- Manage Store Type/Business Type records with categories, status, companies using, product count, commission, and service fee.
- Review pending product requests.
- Approve or cancel product requests.
- View follower overview and company/product counts.

## Operational Notes

- Admin scope is controlled by the browser session and `x-gms-admin-id` headers.
- Runtime data is stored in JSON files, so concurrent edits can overwrite each other.
- Uploads are stored publicly under `/uploads`.
- Use backups before deleting companies, products, accounts, or workspace data.

