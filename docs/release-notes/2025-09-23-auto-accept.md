### 2025-09-23 — Vendor auto-accept toggle

What changed
- Added a vendor-configurable `auto_accept` setting that allows vendors to opt-in to automatic acceptance of customer orders created via the Telegram bot.

How it works
- When `auto_accept` is enabled (Settings → Vendor Management in the PWA), the bot will automatically accept a confirmed order and immediately create a corresponding Transaction for that order.
- The customer receives a confirmation message with the vendor's payment details and is prompted to upload proof of payment. The customer flow then asks for receiving details and optional note.
- The vendor will see the created Transaction in their Transactions list in the PWA and can complete the trade as usual.

Why we did this
- Reduces manual steps for trusted vendors who want the bot to streamline common trades and speed up the customer experience.

Notes for operators
- This is a non-breaking, incremental change — an Order is still created in the DB and the Transaction is created afterwards (no schema changes to remove Orders).
- The backend exposes `auto_accept` through the `vendors/me/` API and the PWA Settings UI includes a toggle that saves the value.
