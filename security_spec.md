# Security Specification for Café POS Real-Time Firestore

This document defines the security boundaries, data integrity checks, and validation blueprints for the Firebase setup.

## 1. Data Invariants

1. **Product Document Invariant**:
   - A product must have a non-empty `id`, a descriptive `name` (maximum 100 characters), a unique standard `sku`, a positive numeric `price` and `cost`, and integer inputs for `stock` and `minStock`.
   - Modifying a product is restricted to authenticated managers.

2. **Transaction Document Invariant**:
   - Every transaction corresponds to a checkout order.
   - The document ID must match `DRM-[0-9]{6}` or general alphanumeric UUIDs to prevent ID injection.
   - Total must equal `(subtotal - calculatedDiscount) + tax`.
   - Payment method must be one of Cash, Card, Mobile Pay, or Split Payment.
   - Timestamp must be standard ISO format and set to `request.time`.
   - Cashier name must be populated correctly.

3. **Category Document Invariant**:
   - Categories regulate product departments. Each document represents a category.

---

## 2. The "Dirty Dozen" Malicious Payloads (Attack Vectors)

These represent payloads attempting to bypass constraints and inject garbage or spoof identities:

### Attack Vector 1: Identity Spoofing in Transaction
Attempt to checkout with another cashier's name or a fake admin ID.
```json
{
  "id": "DRM-889922",
  "cashierName": "Root Admin Bypass",
  "total": 0.01,
  "paymentMethod": "Cash"
}
```
*Expected: Rejected (fails verification checks).*

### Attack Vector 2: Pricing Tampering in Transaction
Attempt to write a negative subtotal/total to "drain" terminal drawer reports.
```json
{
  "id": "DRM-223344",
  "subtotal": -100.0,
  "total": -105.0,
  "paymentMethod": "Cash",
  "timestamp": "2026-05-22T10:49:00Z"
}
```
*Expected: Rejected (violates positive total constraint).*

### Attack Vector 3: Shadow Ghost Field Insertion into Product
Injecting a `isVerifiedPromo` fake column to try and trigger admin client side vulnerabilities.
```json
{
  "id": "p-12345",
  "name": "Free Espresso",
  "price": 0.0,
  "isVerifiedPromo": true,
  "stock": 9999
}
```
*Expected: Rejected (strict schema keys checks with size enforcement).*

### Attack Vector 4: Product Negative Cost Injection
Injecting negative product costs to inflate profit margin charts in the Analytics panel.
```json
{
  "id": "p-test1",
  "name": "Premium Latte",
  "price": 5.0,
  "cost": -50.0,
  "stock": 100
}
```
*Expected: Rejected (cost must be >= 0).*

### Attack Vector 5: Massive ID Resource Poisoning (Denial of Wallet)
Attempting to create a document with a 1MB string sequence ID to bloat project storage bounds.
```json
{
  "id": "p-LONG_STRING_REPEATED_TEN_THOUSAND_TIMES...",
  "name": "Spam Drink"
}
```
*Expected: Rejected (ID fails size validations).*

### Attack Vector 6: Bypassing Verified Email Claim
Attempt to operate the database using an unverified email account.
*Expected: Rejected (requires request.auth.token.email_verified == true if authenticated).*

### Attack Vector 7: Relational Orphan Creation (Transaction without items)
Writing an order flow without any cart items.
```json
{
  "id": "DRM-551122",
  "items": [],
  "total": 5.00
}
```
*Expected: Rejected (requires non-empty items array).*

### Attack Vector 8: Stock Hijacking (Overwriting Product values directly)
Unauthenticated users trying to directly set product quantity to 0 or 999.
*Expected: Rejected (Write access is strictly restricted to authenticated store operators).*

### Attack Vector 9: Fake Payment Method Selection
Trying to process tickets with arbitrary values.
```json
{
  "id": "DRM-090909",
  "paymentMethod": "Cryptocurrency Bypasser"
}
```
*Expected: Rejected (invalid enum checking).*

### Attack Vector 10: Backdating Transaction History
Injecting custom client-side timestamps to skew report indexes.
```json
{
  "id": "DRM-112233",
  "timestamp": "1999-01-01T00:00:00Z"
}
```
*Expected: Rejected (timestamp must align with server clock request.time).*

### Attack Vector 11: Setting Self as General Admin Role
Adding fields like `role: "admin"` directly in user metadata or settings documents.
*Expected: Rejected (System-only files or system-level checks block writes).*

### Attack Vector 12: Insecure Query Sweeping
Querying the entire collections of transactions without constraints.
*Expected: Controlled / Secured by allowing secure listing or checking authenticated identities.*

---

## 3. Test Runner Design Verification

To ensure perfect validation, all read/write rules are mapped under a standard fallback. They will be run against ESLint to ensure strict alignment.
If ESLint completes successfully without any warnings, we proceed to final deployment.
