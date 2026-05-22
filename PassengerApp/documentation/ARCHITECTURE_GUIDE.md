# 🚗 RiderApp - Clean Architecture & Implementation Guide

**Version:** 1.0  
**Date:** May 2026  
**Status:** Frontend Complete - Ready for Backend Connection

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Data Flow](#data-flow)
4. [Component Documentation](#component-documentation)
5. [Context API Usage](#context-api-usage)
6. [Map Integration Guide](#map-integration-guide)
7. [Backend Connection Strategy](#backend-connection-strategy)
8. [User Journey](#user-journey)

---

## 🏗️ Architecture Overview

This app follows a **clean, scalable architecture** with these principles:

### Key Features:

- ✅ **Centralized State Management** via Context API (RideSearchContext)
- ✅ **Reusable Components** (LocationDualPicker, ride cards)
- ✅ **Separation of Concerns** (each screen has one responsibility)
- ✅ **Easy Backend Integration** (all data pre-structured for API calls)
- ✅ **One-way and Return Trip Support** (fully implemented)
- ✅ **Type-Safe** (TypeScript throughout)

---

## 📁 File Structure

```
app/
├─ _layout.tsx                          (Root layout - Wraps with RideSearchProvider)
├─ context/
│  └─ RideSearchContext.tsx             ⭐ Central state management
├─ components/ride/
│  └─ LocationDualPicker.tsx            ⭐ Reusable location picker (pickup + dropoff)
└─ ride-search/
   ├─ index.tsx                         ⭐ Step 1: Trip type + Locations
   ├─ select-ride.tsx                   ⭐ Step 2: Ride selection (outbound)
   ├─ return-trip-location.tsx          ⭐ Step 3: Return trip locations (if return)
   ├─ select-ride-return.tsx            ⭐ Step 4: Return ride selection (if return)
   └─ confirmation.tsx                  ⭐ Step 5: Final booking confirmation
```

---

## 🔄 Data Flow

### One-Way Trip Flow:

```
index.tsx (Select Trip Type & Locations)
   ↓ (stores: tripType="oneway", pickup, dropoff)
   ↓
select-ride.tsx (Choose Ride)
   ↓ (stores: selectedRide)
   ↓
confirmation.tsx (Show Summary & Book)
```

### Return Trip Flow:

```
index.tsx (Select Trip Type & Locations)
   ↓ (stores: tripType="return", pickup, dropoff)
   ↓
select-ride.tsx (Choose Outbound Ride)
   ↓ (stores: outboundSelectedRide)
   ↓
return-trip-location.tsx (Select Return Locations)
   ↓ (stores: returnPickup, returnDropoff)
   ↓
select-ride-return.tsx (Choose Return Ride)
   ↓ (stores: returnSelectedRide)
   ↓
confirmation.tsx (Show Summary & Book)
```

---

## 💾 State Structure (RideSearchContext)

```typescript
{
  // Trip type
  tripType: "oneway" | "return"
  setTripType: (type: TripType) => void

  // Outbound trip data
  outboundTrip: {
    pickup: LocationSuggestion | null
    dropoff: LocationSuggestion | null
    selectedRide: RideOption | null
  }
  setOutboundPickup: (location) => void
  setOutboundDropoff: (location) => void
  setOutboundRide: (ride) => void

  // Return trip data (only for return trips)
  returnTrip: {
    pickup: LocationSuggestion | null
    dropoff: LocationSuggestion | null
    selectedRide: RideOption | null
  }
  setReturnPickup: (location) => void
  setReturnDropoff: (location) => void
  setReturnRide: (ride) => void

  // Utilities
  resetTrip: () => void
}
```

---

## 🧩 Component Documentation

### 1. **RideSearchContext** (`app/context/RideSearchContext.tsx`)

**Purpose:** Centralized state management for all ride search data

**Key Exports:**

- `RideSearchProvider` - Wraps app to provide context
- `useRideSearch()` - Hook to access context

**Usage:**

```typescript
import { useRideSearch } from "../context/RideSearchContext";

const MyComponent = () => {
  const { tripType, outboundTrip, setOutboundPickup } = useRideSearch();
  // Use context data
};
```

---

### 2. **LocationDualPicker** (`app/components/ride/LocationDualPicker.tsx`)

**Purpose:** Reusable component for selecting 2 locations (pickup + dropoff)

**Props:**

```typescript
interface LocationDualPickerProps {
  initialPickup?: LocationSuggestion | null; // Pre-fill with location
  onConfirm: (pickup, dropoff) => void; // Callback when both selected
  pickupLabel?: string; // Label for first input
  dropoffLabel?: string; // Label for second input
}
```

**Features:**

- ✅ Real-time location search
- ✅ "Use current location" button
- ✅ Swap locations button
- ✅ Loading states
- ✅ Suggestion list with details
- ✅ Clear button in inputs

**Usage:**

```typescript
<LocationDualPicker
  initialPickup={currentLocation}
  onConfirm={(pickup, dropoff) => {
    setOutboundPickup(pickup);
    setOutboundDropoff(dropoff);
    router.push('/ride-search/select-ride');
  }}
  pickupLabel="Pickup"
  dropoffLabel="Drop-off"
/>
```

---

### 3. **Index Screen** (`app/ride-search/index.tsx`)

**Screens:**

- Trip type selection (One-way / Return trip)
- Location selection (pickup + dropoff)

**Functionality:**

- Toggle between one-way and return trips
- Visual feedback on selected trip type
- Location picker with dual inputs
- Save to context and navigate

---

### 4. **Select Ride Screen** (`app/ride-search/select-ride.tsx`)

**Features:**

- Map view with pickup/dropoff markers
- Horizontal scrollable ride cards
- Ride selection with visual feedback
- Cash payment display
- Add note & promo code buttons
- Conditional button text (for return trips vs one-way)

---

### 5. **Return Trip Location** (`app/ride-search/return-trip-location.tsx`)

**Features:**

- Auto-fills pickup with previous dropoff
- Same location picker as index screen
- Info box explaining pre-fill behavior
- Similar UI for consistency

---

### 6. **Select Ride Return** (`app/ride-search/select-ride-return.tsx`)

**Features:**

- Same as select-ride.tsx but with green theme (not blue)
- Labeled as "Return Trip"
- For return trip ride selection

---

### 7. **Confirmation Screen** (`app/ride-search/confirmation.tsx`)

**Features:**

- Shows full booking summary
- Displays both trips (if return)
- Location visualization with dots
- Ride icons and details
- Price summary
- Total price calculation
- Confirm & Pay button

---

## 🌍 Map Integration Guide

### Current Status:

✅ Basic map markers working with `react-native-maps`

### For Production: FREE Options

#### **Option 1: Google Maps (Recommended)**

**Steps:**

1. Get API key from [Google Cloud Console](https://console.cloud.google.com)
2. Install package: Already done! (`react-native-google-places-autocomplete`)
3. Update `LocationDualPicker.tsx`:

```typescript
import GooglePlacesInput from 'react-native-google-places-autocomplete';

// Replace TextInput with:
<GooglePlacesInput
  placeholder="Search location"
  onPress={(data, details = null) => {
    const location = {
      address: data.main_text,
      latitude: details?.geometry.location.lat,
      longitude: details?.geometry.location.lng,
      details: data.secondary_text,
    };
    handleSelectPickup(location);
  }}
  query={{ key: YOUR_GOOGLE_API_KEY }}
  currentLocation={true}
  radius={30000}
  rankResults
/>
```

**Cost:** Free tier includes 25,000 requests/month

---

#### **Option 2: OpenStreetMap + Nominatim (Free Alternative)**

```typescript
const searchLocations = async (query: string) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`,
    );
    const data = await response.json();
    return data.map((item) => ({
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      details: item.type,
    }));
  } catch (error) {
    console.error("Search error:", error);
  }
};
```

**Cost:** Completely FREE, no API key needed

---

#### **Option 3: Mapbox (Feature-Rich)**

```typescript
// Add to package.json
npm install @mapbox/search-js-react-native

// Usage
import MapboxSearchBox from '@mapbox/search-js-react-native';

<MapboxSearchBox
  accessToken="YOUR_MAPBOX_TOKEN"
  onFeatureSelect={(feature) => {
    // Handle selection
  }}
/>
```

**Cost:** 100,000 free requests/month

---

### Map Features to Add Later:

```typescript
// Enhanced MapView with:
// 1. Route visualization
<MapView.Polyline
  coordinates={[
    {latitude: pickup.lat, longitude: pickup.lng},
    {latitude: dropoff.lat, longitude: dropoff.lng}
  ]}
  strokeColor="#0B7BDC"
  strokeWidth={3}
/>

// 2. ETA display on map
// 3. Driver location (live tracking)
// 4. Distance calculation
// 5. Multiple route options
```

---

## 🔌 Backend Connection Strategy

### Phase 1: Prepare Frontend Data (✅ DONE)

Your app now provides structured data ready for API:

```typescript
// When user confirms booking:
const bookingData = {
  tripType: "oneway" | "return",
  outboundTrip: {
    pickup: { address, latitude, longitude },
    dropoff: { address, latitude, longitude },
    selectedRide: { name, price, eta },
  },
  returnTrip: {
    // only if return
    pickup: { address, latitude, longitude },
    dropoff: { address, latitude, longitude },
    selectedRide: { name, price, eta },
  },
};
```

---

### Phase 2: Connect Backend APIs

**Update `confirmation.tsx` to call API:**

```typescript
const handleConfirmBooking = async () => {
  try {
    const response = await fetch("YOUR_BACKEND_URL/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripType,
        outbound: outboundTrip,
        return: tripType === "return" ? returnTrip : null,
      }),
    });

    const booking = await response.json();

    if (booking.id) {
      // Navigate to payment or success screen
      router.push({
        pathname: "/ride-search/payment",
        params: { bookingId: booking.id },
      });
    }
  } catch (error) {
    console.error("Booking failed:", error);
  }
};
```

---

### Phase 3: Required Backend Endpoints

```
1. POST /api/bookings
   - Create new booking
   - Input: tripType, outbound, return
   - Output: bookingId, totalPrice, estimatedDuration

2. GET /api/bookings/:id
   - Get booking details
   - For payment status, driver info, etc.

3. POST /api/bookings/:id/confirm-payment
   - Finalize booking after payment
   - Input: bookingId, paymentToken
   - Output: success/error

4. GET /api/locations/search
   - Alternative: use this if you want backend-side search
   - Input: query, latitude, longitude
   - Output: array of location suggestions
```

---

### Phase 4: Create Service Layer

**Create: `services/api/bookingService.ts`**

```typescript
import axios from "axios";

const API_BASE = "https://your-backend.com/api";

export const bookingService = {
  createBooking: async (tripData) => {
    const response = await axios.post(`${API_BASE}/bookings`, tripData);
    return response.data;
  },

  getBooking: async (bookingId) => {
    const response = await axios.get(`${API_BASE}/bookings/${bookingId}`);
    return response.data;
  },

  confirmPayment: async (bookingId, paymentToken) => {
    const response = await axios.post(
      `${API_BASE}/bookings/${bookingId}/confirm-payment`,
      { paymentToken },
    );
    return response.data;
  },
};
```

---

## 👤 User Journey

### One-Way Trip (5 Steps):

```
Step 1: Home Screen
  → User taps "Book a ride"

Step 2: Ride Search (index.tsx)
  → Select "One way" (default)
  → Enter Pickup location
  → Enter Drop-off location
  → Click "Continue"

Step 3: Select Ride (select-ride.tsx)
  → See map with route
  → Choose between Tuk/Bike/Flex
  → View ETA and price
  → Click "Confirm Ride"

Step 4: Review & Confirm (confirmation.tsx)
  → See full booking details
  → View locations and ride
  → See total price
  → Click "Confirm & Pay"

Step 5: Payment (Future)
  → Process payment
  → Show booking confirmation
```

### Return Trip (8 Steps):

```
Step 1: Home Screen
  → User taps "Book a ride"

Step 2: Ride Search (index.tsx)
  → Select "Return trip"
  → Enter Pickup location
  → Enter Drop-off location
  → Click "Continue"

Step 3: Outbound Ride (select-ride.tsx)
  → Choose ride for outbound journey
  → Click "Continue to Return"

Step 4: Return Locations (return-trip-location.tsx)
  → First location auto-filled with previous drop-off
  → Enter new drop-off location
  → Click "Continue"

Step 5: Return Ride (select-ride-return.tsx)
  → Choose ride for return journey
  → Click "Review Booking"

Step 6: Review & Confirm (confirmation.tsx)
  → See both outbound AND return trips
  → View all locations and rides
  → See total price for both
  → Click "Confirm & Pay"

Step 7: Payment (Future)
  → Process payment
  → Show booking confirmation
```

---

## 🚀 Quick Start Checklist

### ✅ Already Done:

- [x] Context API setup
- [x] LocationDualPicker component
- [x] All 5 screens created
- [x] State management
- [x] Type safety with TypeScript
- [x] Clean file structure
- [x] One-way & return trip support

### 📋 Next Steps:

- [ ] **Connect Google Maps** (or choose alternative)
- [ ] **Create backend endpoints**
- [ ] **Add payment integration** (Stripe/PayPal)
- [ ] **Create payment screen**
- [ ] **Add user authentication**
- [ ] **Add booking history screen**
- [ ] **Add driver tracking (live)**
- [ ] **Add ratings & reviews**

---

## 🎨 Design System

### Colors Used:

- **Primary:** `#0B7BDC` (Blue)
- **Secondary (Return):** `#10B981` (Green)
- **Accent:** `#FBBF24` (Amber - buttons)
- **Pickup Marker:** `#2563EB` (Dark Blue)
- **Drop-off Marker:** `#F97316` (Orange)
- **Background:** `#F4FBFF` (Light Blue)

---

## 📞 Support & Extension Points

### To Add New Ride Types:

```typescript
// Update RideOption interface and RIDE_OPTIONS array
// in select-ride.tsx and select-ride-return.tsx
```

### To Add New Payment Methods:

```typescript
// Create: app/components/PaymentMethod.tsx
// Update confirmation.tsx to show options
```

### To Add User Preferences:

```typescript
// Extend RideSearchContext with preferred ride type
// Add to user profile in context
```

---

## 📝 Notes

- **Architecture is backend-agnostic** - Works with any REST API
- **Context data is preserved** during navigation within ride-search
- **All components are reusable** - Can be imported elsewhere
- **Type-safe throughout** - Full TypeScript support
- **Ready for dark mode** - Update color values in styles
- **Performance optimized** - No unnecessary re-renders

---

**Created:** May 19, 2026  
**Last Updated:** May 19, 2026  
**Status:** Production Ready for Frontend Integration
