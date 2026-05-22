# Home Feature Screen Plan

This document is a planning guide only. It does not require changing the current working screens immediately. It explains how to add the next screens in a clean folder structure that matches the current Expo Router setup.

## Current Relevant Structure

```txt
frontend/
  app/
    (auth)/
    (drawer)/
      _layout.tsx
      (tabs)/
        _layout.tsx
        home.tsx
        scan.tsx
        activities.tsx
        notification.tsx
        account.tsx
    components/
      CustomDrawerContent.tsx
      home/
        HomeHeader.tsx
        WalletCard.tsx
        SearchBar.tsx
        ServiceGrid.tsx
        FeatureRow.tsx
        PromoBanner.tsx
        SavedPlaces.tsx
  assets/
    images/
```

The current app uses route groups:

- `(auth)` for login/signup/onboarding screens.
- `(drawer)` for the authenticated app shell.
- `(drawer)/(tabs)` for bottom tab screens.
- `app/components/home` for home-only UI pieces.

New feature screens should stay inside `(drawer)` because they belong to the logged-in app, but they should not be tabs unless they are main bottom navigation items.

## Recommended Route Structure

```txt
frontend/app/
  (drawer)/
    _layout.tsx

    (tabs)/
      _layout.tsx
      home.tsx
      scan.tsx
      activities.tsx
      notification.tsx
      account.tsx
      index.tsx

    wallet/
      index.tsx
      add-money.tsx
      transactions.tsx
      points.tsx
      payment-methods.tsx

    ride/
      index.tsx
      search-location.tsx
      saved-places.tsx
      select-vehicle.tsx
      confirm-booking.tsx
      finding-driver.tsx
      tracking.tsx
      payment.tsx
      complete.tsx
      cancel.tsx

    bike/
      index.tsx
      search-location.tsx
      confirm-booking.tsx
      tracking.tsx
      complete.tsx

    food/
      index.tsx
      restaurant.tsx
      cart.tsx
      checkout.tsx
      tracking.tsx
      order-complete.tsx

    drop/
      index.tsx
      sender-details.tsx
      receiver-details.tsx
      parcel-details.tsx
      confirm-booking.tsx
      tracking.tsx
      complete.tsx

    load/
      index.tsx
      search-location.tsx
      select-truck.tsx
      load-details.tsx
      confirm-booking.tsx
      tracking.tsx
      complete.tsx

    rent/
      index.tsx
      car-details.tsx
      booking-details.tsx
      checkout.tsx
      booking-complete.tsx

    mart/
      index.tsx
      category.tsx
      product.tsx
      cart.tsx
      checkout.tsx
      tracking.tsx
      order-complete.tsx

    offers/
      index.tsx
      details.tsx

    support/
      index.tsx
      chat.tsx
      ticket.tsx
      faq.tsx

    payments/
      index.tsx
      add-card.tsx
      add-bank.tsx
      methods.tsx
```

## Recommended Component Structure

Keep reusable app-wide UI separate from feature-specific UI.

```txt
frontend/app/components/
  ui/
    AppButton.tsx
    AppInput.tsx
    AppCard.tsx
    ScreenHeader.tsx
    EmptyState.tsx
    LoadingState.tsx
    PriceRow.tsx

  home/
    HomeHeader.tsx
    WalletCard.tsx
    SearchBar.tsx
    ServiceGrid.tsx
    FeatureRow.tsx
    PromoBanner.tsx
    SavedPlaces.tsx

  wallet/
    WalletBalanceCard.tsx
    AddMoneyAmountGrid.tsx
    TransactionRow.tsx
    PaymentMethodRow.tsx
    PointsSummaryCard.tsx

  ride/
    LocationInputCard.tsx
    VehicleOptionCard.tsx
    FareSummary.tsx
    DriverCard.tsx
    TripStatusCard.tsx
    SavedPlaceRow.tsx

  food/
    RestaurantCard.tsx
    MenuItemCard.tsx
    CartItemRow.tsx
    FoodOrderStatus.tsx

  drop/
    ParcelTypeCard.tsx
    ContactDetailsForm.tsx
    ParcelSummary.tsx

  load/
    TruckOptionCard.tsx
    LoadDetailsForm.tsx
    LoadFareSummary.tsx

  rent/
    RentalCarCard.tsx
    RentalDateSelector.tsx
    RentalSummary.tsx

  mart/
    MartCategoryCard.tsx
    ProductCard.tsx
    ProductQuantityStepper.tsx

  offers/
    OfferCard.tsx
    PromoCodeCard.tsx
```

## Home Click Targets

Each clickable item on the current home screen should route to one feature entry screen.

| Home UI item | Route to create | Purpose |
| --- | --- | --- |
| PickU Wallet card | `/(drawer)/wallet` | Wallet overview, balance, points, transactions |
| Add Money | `/(drawer)/wallet/add-money` | Add wallet money using card/bank/cash options |
| 230 Points | `/(drawer)/wallet/points` | Points balance, earning history, redeem options |
| Search bar | `/(drawer)/ride/search-location` | Start a destination search |
| Home location chip | `/(drawer)/ride/saved-places` | Choose or manage saved places |
| PickU Ride | `/(drawer)/ride` | Car/mini/sedan booking start |
| PickU Bike | `/(drawer)/bike` | Bike taxi booking start |
| PickU Food | `/(drawer)/food` | Food delivery home |
| PickU Drop | `/(drawer)/drop` | Parcel delivery booking start |
| PickU Load | `/(drawer)/load` | Truck/lorries booking start |
| PickU Rent | `/(drawer)/rent` | Car rental listing/start |
| PickU Mart | `/(drawer)/mart` | Grocery and market home |
| PickU Offers | `/(drawer)/offers` | Offers and promo code list |
| Verified Drivers | `/(drawer)/support/faq` | Trust/safety information |
| Live Tracking | `/(drawer)/activities` | Active trips/orders |
| 24/7 Support | `/(drawer)/support` | Help center |
| Multiple Payments | `/(drawer)/payments` | Payment methods |
| Promo banner button | `/(drawer)/ride/search-location` | Start ride booking with promo context |
| Saved place card | `/(drawer)/ride/confirm-booking` | Start booking using saved place |
| Add Place | `/(drawer)/ride/saved-places` | Add/manage saved places |

## Screen Responsibilities

### Wallet Screens

```txt
wallet/index.tsx
```

Shows wallet balance, add money button, points summary, recent transactions, and payment method shortcut.

```txt
wallet/add-money.tsx
```

Lets the user select or enter an amount, choose payment method, and confirm top-up.

```txt
wallet/transactions.tsx
```

Lists wallet credits, debits, refunds, and ride/order payments.

```txt
wallet/points.tsx
```

Shows total points, earning history, redeem options, and rules.

### Ride Screens

```txt
ride/index.tsx
```

Entry screen for ride booking. Can reuse the search location UI.

```txt
ride/search-location.tsx
```

Pickup and destination search. Should show saved places and recent destinations.

```txt
ride/select-vehicle.tsx
```

Shows vehicle types, estimated time, fare range, capacity, and selected destination.

```txt
ride/confirm-booking.tsx
```

Shows final pickup/drop, selected vehicle, promo, payment method, and confirm button.

```txt
ride/finding-driver.tsx
```

Shows driver search state, cancel option, and loading animation.

```txt
ride/tracking.tsx
```

Shows live trip status, driver details, route/map placeholder, contact actions, and emergency/support actions.

```txt
ride/payment.tsx
```

Shows fare breakdown, payment method, wallet option, promo, and pay button.

```txt
ride/complete.tsx
```

Shows trip completed, paid amount, rating, receipt, and book again.

### Bike Screens

Bike can share many ride components. Keep a separate `bike` route only if the flow has different copy, pricing, or vehicle rules.

Minimum screens:

- `bike/index.tsx`
- `bike/search-location.tsx`
- `bike/confirm-booking.tsx`
- `bike/tracking.tsx`
- `bike/complete.tsx`

### Food Screens

```txt
food/index.tsx
```

Food home with restaurants, categories, offers, and search.

```txt
food/restaurant.tsx
```

Restaurant details and menu list.

```txt
food/cart.tsx
```

Selected items, quantities, delivery address, instructions.

```txt
food/checkout.tsx
```

Payment method, promo, delivery fee, confirm order.

```txt
food/tracking.tsx
```

Order accepted, preparing, picked up, delivered status.

### Drop Screens

For parcel delivery:

- `drop/index.tsx`: start parcel delivery.
- `drop/sender-details.tsx`: sender name, phone, pickup address.
- `drop/receiver-details.tsx`: receiver name, phone, delivery address.
- `drop/parcel-details.tsx`: parcel type, size, notes, fragile option.
- `drop/confirm-booking.tsx`: fare and payment confirmation.
- `drop/tracking.tsx`: courier tracking.
- `drop/complete.tsx`: delivery complete and receipt.

### Load Screens

For truck/lorries:

- `load/index.tsx`: truck service intro/start.
- `load/search-location.tsx`: pickup/drop locations.
- `load/select-truck.tsx`: truck size/category.
- `load/load-details.tsx`: weight, item type, helper requirement.
- `load/confirm-booking.tsx`: date/time, fare, payment.
- `load/tracking.tsx`: truck/driver tracking.
- `load/complete.tsx`: receipt and rating.

### Rent Screens

For rental cars:

- `rent/index.tsx`: available cars and filters.
- `rent/car-details.tsx`: car details, seats, price, rules.
- `rent/booking-details.tsx`: date/time, duration, pickup location.
- `rent/checkout.tsx`: payment and confirm.
- `rent/booking-complete.tsx`: booking summary.

### Mart Screens

For groceries:

- `mart/index.tsx`: categories, featured products, search.
- `mart/category.tsx`: products by category.
- `mart/product.tsx`: product detail.
- `mart/cart.tsx`: quantities and delivery address.
- `mart/checkout.tsx`: payment and confirm.
- `mart/tracking.tsx`: order tracking.
- `mart/order-complete.tsx`: receipt and rating.

### Offers Screens

- `offers/index.tsx`: all offers, promo codes, ride/food/mart filters.
- `offers/details.tsx`: offer details, terms, apply button.

### Support Screens

- `support/index.tsx`: help categories and quick actions.
- `support/chat.tsx`: live chat placeholder.
- `support/ticket.tsx`: create support ticket.
- `support/faq.tsx`: FAQ and safety/trust info.

## Shared Files To Add Later

Only add these when the same logic is needed by multiple screens.

```txt
frontend/app/constants/
  colors.ts
  spacing.ts
  routes.ts

frontend/app/types/
  location.ts
  wallet.ts
  ride.ts
  order.ts
  payment.ts

frontend/app/services/
  wallet.service.ts
  ride.service.ts
  payment.service.ts
  order.service.ts

frontend/app/hooks/
  useCurrentLocation.ts
  useWalletBalance.ts
  useSavedPlaces.ts
  usePaymentMethods.ts
```

## Navigation Rules

Use `router.push()` for forward actions:

```ts
router.push("/(drawer)/wallet/add-money");
```

Use `router.back()` for simple back behavior.

Use `router.replace()` only when the user should not return to the previous screen, such as after logout or after auth redirects.

Avoid placing feature flow screens inside `(tabs)` unless they should be visible as bottom tab items. For example, `scan.tsx` is a tab, but `wallet/add-money.tsx` should not be a tab.

## Suggested Implementation Order

1. Wallet flow
   - `wallet/index.tsx`
   - `wallet/add-money.tsx`
   - `wallet/transactions.tsx`
   - `wallet/points.tsx`

2. Ride flow
   - `ride/search-location.tsx`
   - `ride/select-vehicle.tsx`
   - `ride/confirm-booking.tsx`
   - `ride/tracking.tsx`

3. Saved places and payment methods
   - `ride/saved-places.tsx`
   - `payments/index.tsx`
   - `payments/add-card.tsx`

4. Parcel and load flows
   - `drop/*`
   - `load/*`

5. Food, mart, rent, offers
   - Add these after core ride/wallet flows are stable.

## Screen Design Consistency Rules

- Keep the authenticated screens under the drawer route group.
- Keep main tab pages only in `(drawer)/(tabs)`.
- Keep feature details outside tabs.
- Reuse the current green brand color `#22B36A` or `#20B768`.
- Use compact fonts similar to home:
  - Primary screen title: 22-28
  - Section title: 16-18
  - Card title: 13-15
  - Helper text: 11-13
- Use 18-24 radius for cards and panels to match the current app.
- Keep bottom padding around 100-120 on screens where the floating tab bar is visible.
- Create feature-specific components only when a UI block appears more than once inside that feature.
- Move a component to `components/ui` only when at least two different features use it.

## Example: Add Money Flow

Files:

```txt
frontend/app/(drawer)/wallet/index.tsx
frontend/app/(drawer)/wallet/add-money.tsx
frontend/app/(drawer)/wallet/transactions.tsx
frontend/app/components/wallet/WalletBalanceCard.tsx
frontend/app/components/wallet/AddMoneyAmountGrid.tsx
frontend/app/components/wallet/PaymentMethodRow.tsx
```

Screen flow:

```txt
Home WalletCard
  -> wallet/index.tsx
      -> add-money.tsx
          -> choose amount
          -> choose payment method
          -> confirm top-up
          -> success state
```

Home button route later:

```ts
router.push("/(drawer)/wallet/add-money");
```

## Example: PickU Ride Flow

Files:

```txt
frontend/app/(drawer)/ride/search-location.tsx
frontend/app/(drawer)/ride/select-vehicle.tsx
frontend/app/(drawer)/ride/confirm-booking.tsx
frontend/app/(drawer)/ride/finding-driver.tsx
frontend/app/(drawer)/ride/tracking.tsx
frontend/app/(drawer)/ride/complete.tsx
frontend/app/components/ride/LocationInputCard.tsx
frontend/app/components/ride/VehicleOptionCard.tsx
frontend/app/components/ride/FareSummary.tsx
frontend/app/components/ride/DriverCard.tsx
```

Screen flow:

```txt
Home SearchBar or PickU Ride
  -> ride/search-location.tsx
      -> select pickup/drop
      -> ride/select-vehicle.tsx
      -> ride/confirm-booking.tsx
      -> ride/finding-driver.tsx
      -> ride/tracking.tsx
      -> ride/complete.tsx
```

## Notes Before Coding

- First create empty route screens with clear headers and placeholder sections.
- Then connect home click actions one by one.
- Keep dummy data local at first.
- Add service/api files only when backend integration starts.
- Avoid making one giant screen file. If a screen grows beyond around 250 lines, move repeated cards/forms into feature components.
