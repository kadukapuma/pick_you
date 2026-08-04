# Driver Commission & Account Balancing — Implementation Plan

PickU takes **6% commission** on every ride. Driver and company positions are netted in a
single balanced account per driver, held in the backend.

---

## 1. What exists today

| Piece | State | Notes |
|---|---|---|
| `payments` table | exists | `ride_id`, `payment_method` (cash/card/wallet), `amount`, `payment_status` |
| `PaymentController::processPayment` | works | Transactional, row-locked, idempotent (`idempotent` middleware), guards duplicate payment per ride |
| `wallet_transactions` | exists | Single-entry, `user_id` scoped, used **only** for the passenger wallet |
| `drivers.bank_name / bank_branch / account_name / account_number` | exists | Added 2026-07-08 — payout target already collected |
| `settings` table + `Setting::getSetting/setSetting` | exists | Typed key/value — good home for the commission rate |
| `fare_configs` | exists | Per `vehicle_type` rates |
| `DriverApp` `EarningScreen.js` | static | Period toggle only, no API wired |
| `PassengerApp` payment picker | exists, **not persisted** | [payment-method.tsx](PassengerApp/app/ride-booking/payment-method.tsx) offers cash + card (wallet deliberately hidden). Held in `RideBookingContext` as `paymentMethod`, default `"cash"` |
| `PassengerApp` `app/payments/*` | UI only | `cards.tsx`, `card-setup.tsx`, `success.tsx` etc. contain **no API calls at all** — prototype screens |
| **`rides.payment_method`** | **does not exist** | The passenger's choice never reaches the server (see §9) |
| **Commission** | **does not exist** | No column, no service, no ledger |
| **Card payment gateway** | **does not exist** | No `stripe`/`payhere`/gateway package. A `card` payment is written with status `PENDING` and nothing ever completes it |

Two consequences worth stating up front:

- The **cash** half of this feature can ship end-to-end today.
- The **card** half ("money goes to PickU first") has no real gateway behind it. Rather than
  defer it, card is built now against a **mock gateway** (§9.6) so the full cash↔card netting
  is exercisable immediately. Phase 4 then swaps one binding for a real provider. The mock
  carries hard production guards — it credits driver balances for money never collected.

---

## 2. Core model: one signed account per driver

The thing that makes this balance cleanly is **not** having separate "driver owes us" and
"we owe driver" buckets. Use **one account per driver with a signed balance**:

```
balance > 0   →  PickU owes the driver   (payout due)
balance < 0   →  driver owes PickU       (top-up due)
balance = 0   →  settled
```

Cash rides push the balance **down** (driver holds cash that includes our commission).
Card rides push it **up** (we hold cash that includes the driver's share). They net
automatically — which is exactly the behaviour you described.

### Worked example (LKR)

Driver does two rides, commission 6%:

**Ride A — cash, fare 1,000**
Passenger hands 1,000 to the driver. PickU never touches the money but is owed 60.

```
Dr  DRIVER:17            60.00      (reduces what we owe the driver)
Cr  REVENUE_COMMISSION   60.00
                                     → driver balance: −60.00
```

**Ride B — card, fare 2,000**
Passenger pays PickU. We owe the driver 2,000 − 120 = 1,880.

```
Dr  GATEWAY_RECEIVABLE  2,000.00
Cr  REVENUE_COMMISSION    120.00
Cr  DRIVER:17           1,880.00
                                     → driver balance: −60 + 1,880 = +1,820.00
```

**Payout run**

```
Dr  DRIVER:17           1,820.00
Cr  BANK                1,820.00
                                     → driver balance: 0.00
```

The 60 cash debt was absorbed by the card ride without the driver ever making a
separate payment. Books balance at every step: every entry's debits equal its credits.

### Ledger accounts

| Code | Type | Meaning |
|---|---|---|
| `DRIVER:{driver_id}` | liability | Signed net position with that driver |
| `REVENUE_COMMISSION` | revenue | PickU's 6% |
| `GATEWAY_RECEIVABLE` | asset | Card money captured but not yet settled to our bank |
| `BANK` | asset | Company bank account |
| `PAYOUT_PAYABLE` | liability | Payouts requested/approved but not yet paid (reserves the funds) |
| `CASH_CLEARING` | asset | Driver top-ups declared but not yet confirmed |

Only commission moves through the ledger for cash rides — the gross fare passed hand to
hand and never entered our custody. Gross fare is still recorded on the ride for GMV
reporting (§3.7, `rides.commission_*` columns).

---

## 3. Schema

### 3.1 `ledger_accounts`

```php
$table->id();
$table->string('code')->unique();              // 'DRIVER:17', 'REVENUE_COMMISSION'
$table->string('type');                        // asset|liability|revenue|equity
$table->nullableMorphs('owner');               // owner_type/owner_id → Driver, or null for company
$table->decimal('balance', 14, 2)->default(0); // cached projection of the lines
$table->char('currency', 3)->default('LKR');
$table->timestamps();
```

### 3.2 `journal_entries` (the transaction header)

```php
$table->id();
$table->string('type');                        // RIDE_SETTLEMENT|PAYOUT_REQUEST|PAYOUT_PAID|TOPUP|ADJUSTMENT|REVERSAL
$table->nullableMorphs('reference');           // → Ride, Payment, DriverPayout, DriverTopup
$table->string('idempotency_key')->unique();   // 'ride:412:settlement'
$table->string('description');
$table->foreignId('created_by')->nullable()->constrained('users');  // admin actor
$table->foreignId('reverses_entry_id')->nullable()->constrained('journal_entries');
$table->timestamp('posted_at');
$table->timestamps();
```

### 3.3 `journal_lines`

```php
$table->id();
$table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
$table->foreignId('ledger_account_id')->constrained();
$table->decimal('debit', 14, 2)->default(0);
$table->decimal('credit', 14, 2)->default(0);
$table->decimal('balance_after', 14, 2);       // snapshot for fast statements
$table->index(['ledger_account_id', 'id']);
```

**Append-only.** Journal lines are never updated or deleted. Corrections are posted as a
reversing entry pointing back via `reverses_entry_id`. This is what makes the books
auditable — flag it in the model with a `saving`/`deleting` guard that throws on any
mutation of an existing row.

### 3.4 `driver_accounts` (policy, not money)

Money lives in `ledger_accounts`. This table holds the per-driver business rules:

```php
$table->id();
$table->foreignId('driver_id')->unique()->constrained()->cascadeOnDelete();
$table->foreignId('ledger_account_id')->constrained();
$table->decimal('commission_rate', 5, 4)->nullable();   // per-driver override, else global
$table->decimal('credit_limit', 12, 2)->default(-2000); // block below this
$table->boolean('is_blocked')->default(false);
$table->string('block_reason')->nullable();
$table->timestamps();
```

### 3.5 `driver_payouts`

```php
$table->id();
$table->foreignId('driver_id')->constrained();
$table->decimal('amount', 12, 2);
$table->string('status');                      // REQUESTED|APPROVED|PAID|FAILED|CANCELLED
// snapshot the bank details at request time — the driver may edit them later
$table->string('bank_name'); $table->string('bank_branch');
$table->string('account_name'); $table->string('account_number');
$table->string('bank_reference')->nullable();
$table->string('failure_reason')->nullable();
$table->foreignId('processed_by')->nullable()->constrained('users');
$table->timestamp('requested_at'); $table->timestamp('processed_at')->nullable();
$table->timestamps();
```

### 3.6 `driver_topups`

Driver clears a negative balance by bank deposit (or gateway, later).

```php
$table->id();
$table->foreignId('driver_id')->constrained();
$table->decimal('amount', 12, 2);
$table->string('method');                      // BANK_DEPOSIT|GATEWAY|OFFICE_CASH
$table->string('status');                      // PENDING|CONFIRMED|REJECTED
$table->string('slip_path')->nullable();       // deposit slip upload
$table->string('reference')->nullable();
$table->foreignId('confirmed_by')->nullable()->constrained('users');
$table->timestamps();
```

### 3.7 Columns on `rides`

Snapshot so history never shifts when the rate changes:

```php
$table->decimal('commission_rate', 5, 4)->nullable();    // e.g. 0.0600
$table->decimal('commission_amount', 10, 2)->nullable();
$table->decimal('driver_earning', 10, 2)->nullable();    // gross − commission
```

---

## 4. Services

### `App\Services\Ledger\LedgerService`

The only class allowed to write to the journal.

```php
public function post(
    string $type,
    string $idempotencyKey,
    string $description,
    array $lines,              // [['account' => 'DRIVER:17', 'debit' => '60.00'], ...]
    ?Model $reference = null,
    ?int $createdBy = null,
): JournalEntry
```

Rules enforced inside `post()`:

1. Wrap in `DB::transaction`.
2. **Idempotency first** — `firstWhere('idempotency_key', $key)`; if found, return it
   untouched. This makes retries and duplicate webhooks free.
3. Resolve accounts, then `lockForUpdate()` them **ordered by `ledger_accounts.id`**.
   Deterministic lock order is what prevents deadlocks when two rides for two drivers
   both touch `REVENUE_COMMISSION`.
4. Assert `sum(debit) === sum(credit)` — throw `UnbalancedEntryException` otherwise.
   This is the invariant that makes "professionally balanced" true by construction.
5. Write lines with `balance_after`, update each account's cached `balance`.

Use `brick/math` (already in `vendor/`) for all arithmetic — never PHP floats.

### `App\Services\Ledger\CommissionService`

```php
public function rateFor(Ride $ride): string      // resolution order below
public function computeFor(Ride $ride, string $gross): array  // ['rate','commission','driver_earning']
```

**Rate resolution:** `driver_accounts.commission_rate` → `fare_configs.commission_rate`
(per vehicle type) → `Setting::getSetting('commission_rate', '0.06')`.

**Rounding rule:** `commission = round(gross × rate, 2)`, then
`driver_earning = gross − commission`. Never compute the driver's share independently —
deriving it by subtraction guarantees the two halves sum to gross exactly, with no
stray cent.

### `App\Services\Ledger\RideSettlementService`

```php
public function settle(Payment $payment): JournalEntry
```

Called once a payment reaches `COMPLETED`. Branches on `payment_method`:

- **cash** → `Dr DRIVER:{id}` / `Cr REVENUE_COMMISSION` (commission only)
- **card** → `Dr GATEWAY_RECEIVABLE` (gross) / `Cr REVENUE_COMMISSION` / `Cr DRIVER:{id}` (net)
- **wallet** → same shape as card; the passenger wallet debit already happened, so the
  contra is `PASSENGER_WALLET_LIABILITY` rather than `GATEWAY_RECEIVABLE`

Idempotency key: `ride:{ride_id}:settlement`.

### `App\Services\Ledger\PayoutService` / `TopupService`

Payout lifecycle, with funds reserved at request time so a driver can't request the
same balance twice:

| Step | Entry |
|---|---|
| REQUESTED | `Dr DRIVER:{id}` / `Cr PAYOUT_PAYABLE` |
| PAID | `Dr PAYOUT_PAYABLE` / `Cr BANK` |
| FAILED | reversal of the REQUESTED entry |

Top-up confirmed: `Dr BANK` / `Cr DRIVER:{id}`.

---

## 5. Where this hooks into existing code

| File | Change |
|---|---|
| [PaymentController.php:86](backend-api/app/Http/Controllers/Api/PaymentController.php#L86) | After the payment reaches `COMPLETED`, call `RideSettlementService::settle($payment)` **inside the same `DB::transaction`** — money and ledger must commit atomically |
| [PaymentController.php:62](backend-api/app/Http/Controllers/Api/PaymentController.php#L62) | Cash path already sets `COMPLETED` — settles immediately |
| [RideTransitionService.php:30](backend-api/app/Services/Rides/RideTransitionService.php#L30) | On `COMPLETED`, stamp `commission_rate` / `commission_amount` / `driver_earning` onto the ride from `CommissionService` |
| [RideController](backend-api/app/Http/Controllers/Api/RideController.php) `acceptRide` | Reject if `driver_accounts.is_blocked` or `balance < credit_limit`, with a message the app can act on |
| `Services/RideMatching` | Exclude blocked/over-limit drivers from dispatch so they aren't offered rides they can't accept |
| Driver availability / go-online endpoint | Same credit-limit gate |
| [Driver.php](backend-api/app/Models/Driver.php) | `hasOne(DriverAccount::class)`, `hasMany(DriverPayout::class)` |
| [Ride.php:11](backend-api/app/Models/Ride.php#L11) | Add the three commission columns to `$fillable` |
| Settings admin view | Expose `commission_rate`, `driver_credit_limit`, `min_payout_amount` |

Leave `wallet_transactions` alone — it is the passenger wallet and works. Don't overload
it for driver accounts; it's single-entry with no balancing constraint, which is the
opposite of what this needs.

---

## 6. API surface

**Driver app**

```
GET  /api/driver/account                  → balance, status(OWED|OWING|SETTLED), credit_limit, is_blocked
GET  /api/driver/account/transactions     → paginated journal lines for DRIVER:{id}
GET  /api/driver/earnings/summary?period=day|week|month
                                          → gross, commission, net, ride_count  (wires up EarningScreen.js)
POST /api/driver/payouts                  → request (validated ≤ available balance, ≥ min_payout)
GET  /api/driver/payouts
POST /api/driver/topups                   → declare deposit + slip upload
```

**Admin**

```
GET  /api/admin/drivers/{id}/account
GET  /api/admin/drivers/{id}/account/transactions
POST /api/admin/drivers/{id}/adjustments        → manual credit/debit, reason required, audit-logged
GET  /api/admin/payouts?status=REQUESTED        → approval queue
POST /api/admin/payouts/{id}/approve|mark-paid|fail
GET  /api/admin/topups?status=PENDING
POST /api/admin/topups/{id}/confirm|reject
GET  /api/admin/finance/summary                 → commission revenue, outstanding driver debt, pending payouts
GET  /api/admin/finance/trial-balance           → proves the books balance
```

All mutating endpoints go behind the existing `idempotent` middleware — it's already in
place on `/payments/{ride_id}` and the pattern carries over directly.

**Admin UI** — new `frontend-admin/src/views/Finance/` (payout queue, top-up queue,
driver statement, trial balance), plus a driver-account panel on the existing
`DriverDetail` view.

**Driver app** — wire `EarningScreen.js` to the summary endpoint; add a balance card
showing "You owe PickU Rs. X" / "PickU owes you Rs. X", a statement list, and a payout
request screen. `BankDetailsScreen.js` already collects the payout target.

---

## 7. Invariants and edge cases

**Invariants** (each deserves a test):

- Every journal entry: `sum(debit) == sum(credit)`.
- Globally: `sum(all debits) == sum(all credits)`.
- For every account: cached `balance == sum(credit) − sum(debit)` over its lines.
- `commission + driver_earning == gross` exactly, for every ride.
- Settling the same ride twice produces one entry (idempotency key).

**Edge cases:**

- **Concurrency** — two payouts requested simultaneously: the `lockForUpdate` in
  `LedgerService::post()` serialises them; the second sees the reduced balance and fails
  validation.
- **Ride cancelled after payment** — post a reversal entry, don't edit the original.
- **Cancellation fee** — currently `fare_configs.cancellation_fee`. Decide whether the 6%
  applies (see §10).
- **Promotions** — `ride_promotions` discounts the passenger's charge. If PickU funds the
  discount, commission should be on the **pre-discount** fare or the driver silently pays
  for your marketing. See §10.
- **Rate change** — never recompute historical rides; the snapshot on `rides` is authoritative.
- **Driver deleted** — `drivers` cascades on delete. A driver with a non-zero balance must
  not be hard-deleted; enforce with a check or move to soft deletes.
- **Reconciliation job** — nightly command asserting the invariants above and alerting on
  drift. This is what catches a bug before a driver does.

---

## 8. Phasing

| Phase | Scope | Ships |
|---|---|---|
| **1** | Migrations, models, `LedgerService`, `CommissionService`, `RideSettlementService`, hook into `PaymentController` + `RideTransitionService`, `rides.payment_method` (§9), `MockPaymentGateway` + guards (§9.6), unit + feature tests for the invariants | Cash **and** card commission accrue correctly; netting demonstrable end to end; balances visible via API |
| **2** | Driver endpoints, `EarningScreen` wiring, balance card, credit-limit gate on accept/go-online | Drivers see what they owe and are stopped at the limit |
| **3** | Payouts + top-ups, admin finance views, adjustments, settings | Full settlement loop, money actually moves |
| **4** | `PayHereGateway` (usual fit for LKR) replacing the mock binding, webhook → `settle()` | Real card money routes through PickU |
| **5** | Reconciliation command, trial balance, finance reports | Auditable |

Phase 1 is the one that has to be right. Everything else is UI and workflow on top of a
ledger that is already correct.

---

## 9. Payment method: selected at booking, carried to the driver, settled correctly

### 9.1 The gap

The passenger already picks cash or card in
[payment-method.tsx](PassengerApp/app/ride-booking/payment-method.tsx), and it's stored in
`RideBookingContext` — but **it never reaches the backend**. In
[confirm.tsx:212](PassengerApp/app/ride-booking/confirm.tsx#L212) the `/rides` payload
carries only vehicle type and the two addresses. `selected_payment_method` is stitched into
the *router params* one line later ([confirm.tsx:230](PassengerApp/app/ride-booking/confirm.tsx#L230))
and lives purely in client navigation state — lost on app restart, invisible to the driver,
invisible to the server. `RideController::store()` neither validates nor persists it.

Today the method is chosen a second time, from scratch, at
[PaymentController.php:30](backend-api/app/Http/Controllers/Api/PaymentController.php#L30) —
*after* the ride is over.

### 9.2 Persist it on the ride

Migration:

```php
Schema::table('rides', function (Blueprint $table) {
    $table->string('payment_method')->default('cash')->after('final_fare');   // cash|card|wallet
    $table->string('payment_method_locked_at')->nullable();
});
```

`default('cash')` backfills existing rows correctly — every historical ride was cash in
practice.

- Add `payment_method` to `Ride::$fillable`.
- `RideController::store()` — validate `'payment_method' => 'sometimes|in:cash,card'` and
  persist it. Default `cash` when absent so older app builds keep working.
- `PassengerApp` `confirm.tsx` — add `payment_method: paymentMethod` to the `/rides` payload.
  Once the server echoes it back, drop the `selected_payment_method` router-param hack in
  `confirm.tsx` and `matching.tsx` and read it off the ride.

### 9.3 Show it to the driver

The driver needs to know *before accepting* whether they'll be collecting cash — it changes
whether they can make change, and whether the ride helps or hurts their balance.

- `RideController::driverRideRequests()` — add `'payment_method' => $ride->payment_method`
  to the mapped payload at
  [RideController.php:115](backend-api/app/Http/Controllers/Api/RideController.php#L115).
- Same for `show()` and the driver's active-ride payload, so it survives an app restart
  mid-ride.
- `DriverApp` — a badge on the ride-request card (`RideDetailsScreen.js`), and prominently on
  `TripCompletedScreen.js`: **"Collect Rs. 1,000 cash"** vs **"Paid by card — collect nothing"**.
  Getting this wrong on a card ride means the driver double-charges the passenger.

### 9.4 Derive settlement from the ride, not the request — important

`processPayment` currently takes `payment_method` from the **request body**. Once the method
determines which ledger entries post, that becomes an integrity hole: the party confirming
payment gets to choose the branch that suits them.

Concretely — on a card ride, a driver confirming `cash` would post
`Dr DRIVER / Cr REVENUE_COMMISSION` (driver owes 6%) while the passenger's card is *also*
charged by the gateway. The passenger pays twice and the driver's account is wrong. The
reverse — a cash ride confirmed as `card` — credits the driver the full 94% for money that
was never captured.

**Fix:** `processPayment` reads `payment_method` from `$lockedRide`, ignoring the request
body entirely (keep accepting the field for a release, compare, and log mismatches to catch
stale app builds, then remove it). The existing driver-only `cash` guard at
[PaymentController.php:34](backend-api/app/Http/Controllers/Api/PaymentController.php#L34)
becomes redundant and should go.

### 9.5 Card lifecycle and the ledger

Card money reaches the driver on a different schedule than cash, so settlement posts at a
different moment:

| Event | Payment status | Ledger |
|---|---|---|
| Ride completed, method `card` | `PENDING` | **nothing** — no money has moved |
| Gateway capture confirmed (webhook) | `COMPLETED` | `Dr GATEWAY_RECEIVABLE` (gross) / `Cr REVENUE_COMMISSION` (6%) / `Cr DRIVER:{id}` (94%) |
| Gateway settles the batch to our bank | — | `Dr BANK` / `Cr GATEWAY_RECEIVABLE` |
| Capture **fails** | `FAILED` | nothing yet — see fallback below |

**Capture failure fallback.** A declined card at the end of a ride is common (limit,
expiry, network). The driver has already done the work. Policy:

1. Payment flips to `FAILED`; the ride is flagged `payment_outstanding`.
2. The driver is prompted to collect cash instead. If they do, it settles as a **cash**
   ride — commission debited to the driver's account as normal.
3. If the passenger can't pay, the amount becomes a **passenger** debt
   (`Dr PASSENGER_RECEIVABLE / Cr DRIVER:{id}` — the driver is still paid their 94% and
   PickU still books its 6%, absorbing the collection risk rather than pushing it onto the
   driver). The existing [outstanding.tsx](PassengerApp/app/payments/outstanding.tsx)
   screen is presumably for exactly this; block new bookings until cleared.

Step 3 is a policy call — the alternative is the driver eats it, which is common but bad
for driver retention. Recorded here as the recommended default, flag if you disagree.

**Fare drift.** `final_fare` can exceed `estimated_fare` via waiting time and extra distance
([RideLocationPointProcessor.php:204](backend-api/app/Services/Locations/RideLocationPointProcessor.php#L204)).
So a card flow must **authorize** at booking (with a buffer, or zero-amount verification)
and **capture the final amount** at completion — not capture the estimate up front.

### 9.6 Card stays enabled, backed by a mock gateway — **DECIDED**

Card remains selectable. The prototype screens in `app/payments/*` keep their sample values,
and a **mock gateway** completes the payment so the card branch of the ledger actually posts.
This lets the full netting behaviour from §2 — cash debt absorbed by card credit — be
exercised end to end before a real gateway exists.

**Swappable driver.** One interface, two implementations, chosen by config:

```php
// app/Services/Payments/PaymentGateway.php
interface PaymentGateway {
    public function authorize(Payment $payment, string $token): GatewayResult;
    public function capture(Payment $payment): GatewayResult;   // captures final_fare, not the estimate
    public function refund(Payment $payment, string $amount): GatewayResult;
}
```

- `MockPaymentGateway` — decides the outcome from the card number, no network calls
- `PayHereGateway` — Phase 4, same interface, no caller changes

Bound in a service provider from `config('services.payments.driver')` (`mock` | `payhere`).

**Sample cards** — drive both paths from the card number, so the §9.5 decline fallback is
testable rather than theoretical:

| Number | Mock outcome |
|---|---|
| `4242 4242 4242 4242` | capture succeeds |
| `4000 0000 0000 0002` | declined — exercises the cash-fallback path |
| `4000 0000 0000 0119` | capture error — exercises the retry/outstanding path |

**Stored cards** need a home — `passenger_payment_methods` (passenger_id, gateway, token,
brand, last4, exp_month, exp_year, is_default). Mock issues `tok_mock_*`. This is what
[cards.tsx](PassengerApp/app/payments/cards.tsx) and
[card-setup.tsx](PassengerApp/app/payments/card-setup.tsx) get wired to; today they contain
no API calls at all.

**Flow with the mock:** ride completes → `processPayment` creates the `Payment` as `PENDING`
→ calls `gateway->capture()` → mock returns success → status `COMPLETED` → `settle()` posts
`Dr GATEWAY_RECEIVABLE / Cr REVENUE_COMMISSION / Cr DRIVER:{id}`. The real gateway differs
only in that capture is asynchronous and `settle()` is called from the webhook instead.

#### ⚠️ The one hard rule: mock captures create real driver balances

A mock capture posts a genuine journal entry crediting the driver 94% of money **that was
never collected**. If that reaches production, PickU pays real money out of `BANK` for
revenue it never received — and payouts are irreversible once the bank transfer clears.

Three guards, all cheap:

1. `MockPaymentGateway::__construct()` throws if `app()->environment('production')`. Not a
   config flag that can be flipped by accident — a hard failure.
2. The provider refuses to bind `mock` in production, so a stray `PAYMENTS_DRIVER=mock` in a
   prod `.env` fails at boot rather than silently minting money.
3. `payments.gateway` and `journal_entries.gateway` columns record which gateway settled
   each entry. Even if guards 1–2 are bypassed, every mock-created balance is greppable and
   reversible: `WHERE gateway = 'mock'`.

Run the mock against a **non-production database**. Mock and real ledger rows in one set of
books means payout totals are computed partly from fake money, and the §7 reconciliation
job can't tell you which is which.

### 9.7 Work items

| # | Area | Item |
|---|---|---|
| 1 | backend | Migration: `rides.payment_method` |
| 2 | backend | `Ride::$fillable`; validate + persist in `store()` |
| 3 | backend | Expose in `driverRideRequests()`, `show()`, active-ride payload |
| 4 | backend | `processPayment` derives method from the ride (§9.4) |
| 5 | backend | `RideSettlementService` card branch |
| 6 | backend | `PaymentGateway` interface + `MockPaymentGateway` + provider binding + env guards (§9.6) |
| 7 | backend | `passenger_payment_methods` table + CRUD endpoints |
| 8 | backend | `payments.gateway` / `journal_entries.gateway` columns |
| 9 | PassengerApp | Send `payment_method` in the `/rides` payload; drop the router-param hack |
| 10 | PassengerApp | Wire `cards.tsx` / `card-setup.tsx` to the new endpoints |
| 11 | DriverApp | Payment badge on ride request + "collect / don't collect" on trip completion |
| 12 | backend | `PayHereGateway` + webhook → `settle()` *(Phase 4)* |
| 13 | product | Confirm the §9.5 capture-failure policy |

Everything except 12 belongs in **Phase 1** — with the mock gateway in place, the card
settlement path is testable immediately, so it's no longer deferred. Phase 4 shrinks to
swapping one binding and adding a webhook.

---

## 10. Business decisions — all settled

Confirmed 2026-07-30. Summary:

| # | Decision |
|---|---|
| 1 | Commission base = `rides.final_fare` (incl. waiting + extra distance) |
| 2 | Post-discount — driver shares promo cost |
| 3 | No commission on cancellation fees |
| 4 | Credit limit −2,000 LKR, per-driver overridable |
| 5 | No backfill — cutoff at `commission_effective_from` |
| 6 | On-demand payouts with admin approval |

Detail and implementation consequences below.

1. ~~**Commission base**~~ — **DECIDED: 6% of `final_fare`**, i.e. the full amount charged
   to the passenger including waiting time and extra distance. `CommissionService` reads
   `final_fare` (falling back to `estimated_fare` when `final_fare` is 0, matching the
   existing behaviour in `PaymentController::processPayment`).
2. ~~**Promotions**~~ — **DECIDED: post-discount.** Commission is 6% of what the passenger
   actually pays, so the driver shares the cost of a promo.

   Combined with decision 1, this collapses to a single rule: **commission base is always
   `rides.final_fare`**. `CommissionService` needs no promotion lookup at all.

   ⚠️ **Dependency for whoever implements promotions:** discounts are currently *not*
   applied anywhere — `FareCalculationService` never reads `promotions` /
   `ride_promotions`, and those models are unused CRUD scaffolding. `final_fare` is
   therefore undiscounted today. For this decision to hold, promo redemption must write
   the discount **into** `final_fare` rather than applying it at payment time. If a promo
   is ever discounted at the payment layer instead, commission would silently revert to
   pre-discount behaviour.
3. ~~**Cancellation fees**~~ — **DECIDED: no commission.** The driver keeps 100% of a
   cancellation fee; it compensates their time and fuel to the pickup point and is not
   PickU revenue.

   Implementation: `RideSettlementService` must branch on **what** is being paid, not just
   the payment method. A cancellation fee still needs a ledger entry when paid by card
   (PickU collects it and owes the driver the full amount) — it just carries no
   `REVENUE_COMMISSION` line:

   | Fee paid by | Entry |
   |---|---|
   | cash | none — driver already holds it, nothing is owed either way |
   | card | `Dr GATEWAY_RECEIVABLE` / `Cr DRIVER:{id}` (full amount) |

   ⚠️ **Not implemented today:** `fare_configs.cancellation_fee` is only validated in the
   admin editor ([FareConfigController.php:56](backend-api/app/Http/Controllers/Api/FareConfigController.php#L56)).
   It is never charged, never written to a ride, and never paid — and `processPayment`
   rejects any ride not in `COMPLETED` status, so a cancelled ride cannot be paid for at
   all. Whoever implements cancellation charging must mark those payments as a distinct
   type so this rule can be applied.
4. ~~**Credit limit**~~ — **DECIDED: −2,000 LKR.** A driver whose balance falls below this
   is blocked from going online and from accepting rides (~a week of cash-only driving at
   6%).

   Stored as `driver_accounts.credit_limit` with a `−2000` default, overridable per driver
   (trusted/high-volume drivers can be given more room), and seeded from a global
   `driver_credit_limit` setting exposed in the admin Settings view. Changing the global
   default must **not** retroactively rewrite existing `driver_accounts` rows — it applies
   to newly created accounts only, so a policy change can't silently block active drivers
   mid-shift.

   Warn before blocking: surface a banner in the driver app at ~75% of the limit
   (−1,500 LKR) so the first time a driver hears about this isn't when they can't work.
5. ~~**Backfill**~~ — **DECIDED: no backfill.** Commission applies only to rides completed
   on or after a `commission_effective_from` timestamp stored in `settings`.

   `RideSettlementService` short-circuits when `ride.completed_at < commission_effective_from`:
   no journal entry, no commission columns stamped. Set the cutoff to the Phase 1 deploy
   time. Historical rides keep `commission_amount = NULL`, which is distinguishable from
   `0.00` (a genuinely zero-commission ride) in reporting.

6. ~~**Payout cadence**~~ — **DECIDED: on-demand.** The driver requests a payout; it enters
   an admin approval queue; an admin marks it paid after the bank transfer clears.

   Guards on the request endpoint:
   - amount ≤ current balance (enforced under `lockForUpdate`, not just validated)
   - amount ≥ `min_payout_amount` setting — suggest 1,000 LKR so bank fees don't eat the transfer
   - no second `REQUESTED` payout while one is open
   - driver's bank details must be present and complete

   Funds are reserved at request time (`Dr DRIVER:{id}` / `Cr PAYOUT_PAYABLE`), so a driver
   cannot request the same balance twice or spend it on commission while a payout is in
   flight. A scheduled weekly batch can be layered on later without ledger changes — it
   posts the identical entries.
