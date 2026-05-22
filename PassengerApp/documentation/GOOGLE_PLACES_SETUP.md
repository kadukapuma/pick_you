# Google Places API Setup Guide

## Step 1: Get Google API Key

### Option A: Using Google Cloud Console (Recommended)

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable APIs:
   - Go to "APIs & Services" → "Library"
   - Search for "Places API" → Click → Enable
   - Search for "Maps SDK for Android" → Click → Enable
   - Search for "Maps SDK for iOS" → Click → Enable
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the key
5. (Optional) Restrict the key:
   - Click on the key to edit
   - Under "Key restrictions" → Select "Android" or "iOS"
   - Add your app's package name and SHA-1 fingerprint

### Option B: Quick Test (Development)

You can use a free tier key without restrictions during development.

---

## Step 2: Add API Key to Your App

### Option A: Environment Variable (Recommended)

Create or edit `.env.local` in the frontend folder:

```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_actual_api_key_here
```

**Important:** Use `EXPO_PUBLIC_` prefix so Expo exposes it to the app.

### Option B: Hardcode (Development Only)

In `app/components/ride/LocationDualPickerGoogle.tsx`, replace:

```typescript
const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";
```

With:

```typescript
const googleApiKey = "YOUR_API_KEY_HERE";
```

**⚠️ DO NOT commit API keys to Git!**

---

## Step 3: Switch to Google Places in Your App

Replace the old `LocationDualPicker` with the new `LocationDualPickerGoogle`:

In `app/ride-search/index.tsx`, change:

```tsx
// OLD
import LocationDualPicker from "../components/ride/LocationDualPicker";

// NEW
import LocationDualPicker from "../components/ride/LocationDualPickerGoogle";
```

---

## Step 4: Test It Out

1. Start the app: `npx expo start`
2. Type "Colombo" in pickup field
3. You should see suggestions immediately
4. No more rate limiting errors! ✅

---

## Pricing

**Free Tier:**

- $200/month free credit
- Covers ~28,000+ API calls/month
- Perfect for development and small apps

**Usage Limits:**

- 5 QPS (queries per second) - can request higher
- No per-request cost, charged per 1000 requests

See: https://developers.google.com/maps/billing-and-pricing

---

## Troubleshooting

### "Google Places API Key not configured"

- Make sure `.env.local` has the key
- Restart the Expo server: `npx expo start --clear`
- Check: `echo $EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

### "Zero results" even with valid key

- Check API is enabled in Google Cloud Console
- Verify key restrictions allow your app
- Check query parameters are correct

### "Over quota"

- Wait 30 seconds (QPS limit)
- Or upgrade to paid plan
- Or use lower `minLength` to reduce requests

---

## Files Changed

- ✅ `app/services/location/googlePlacesService.ts` - Google API wrapper
- ✅ `app/components/ride/LocationDualPickerGoogle.tsx` - New autocomplete component
- ⏳ `app/ride-search/index.tsx` - Need to import new component

---

## Next: Switch in Your Routes

When ready, just update the import in `index.tsx` and you're done! 🎉
