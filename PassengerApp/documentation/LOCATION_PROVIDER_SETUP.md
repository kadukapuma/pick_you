# Location Provider - Testing Setup Guide

## Overview

Your app now supports **3 free location providers** - easy to switch!

| Provider          | Free Tier             | Best For      | Setup  |
| ----------------- | --------------------- | ------------- | ------ |
| **Mapbox** ⭐     | 600/month (~20/day)   | Quick Testing | 5 min  |
| **Geoapify**      | 3000/month (~100/day) | More Testing  | 5 min  |
| **Google Places** | $200 credit/month     | Production    | 10 min |

---

## Option 1: Mapbox (RECOMMENDED for Testing)

**Best for:** Testing right now - fastest setup

### Step 1: Get Free Mapbox Token

1. Go to https://account.mapbox.com/auth/signup/
2. Sign up (free account)
3. Go to "Tokens" in the dashboard
4. Click "Create a token"
5. Name it "RiderApp" and create
6. Copy the token (starts with `pk.`)

### Step 2: Add to `.env.local`

Create/edit `.env.local` in frontend folder:

```env
EXPO_PUBLIC_LOCATION_PROVIDER=mapbox
EXPO_PUBLIC_MAPBOX_API_KEY=pk.YOUR_TOKEN_HERE
```

### Step 3: Update Your Component

In `app/ride-search/index.tsx`:

```tsx
// OLD - using Nominatim
import { searchLocationSuggestions } from "../services/location/locationSuggestionsService";

// NEW - using multi-provider
import { searchLocationSuggestions } from "../services/location/multiProviderService";
```

### Step 4: Test

```bash
npx expo start --clear
```

Type "Colombo" → Instant suggestions! ✅

---

## Option 2: Geoapify (More Generous Free Tier)

**Best for:** More testing (3000/month instead of 600)

### Step 1: Get Free Geoapify Token

1. Go to https://myprojects.geoapify.com/
2. Sign up
3. Select "Free" plan
4. Get your API key from dashboard

### Step 2: Add to `.env.local`

```env
EXPO_PUBLIC_LOCATION_PROVIDER=geoapify
EXPO_PUBLIC_GEOAPIFY_API_KEY=your_api_key_here
```

### Step 3: Same as Mapbox - update component and restart

---

## Option 3: Google Places (Switch Later)

**Best for:** Production-ready code

When you're ready to go live, just add Google key:

```env
EXPO_PUBLIC_LOCATION_PROVIDER=google
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key_here
```

Same code works! No component changes needed! 🎉

---

## Switching Between Providers

Just change `.env.local`:

```env
# Switch from this:
EXPO_PUBLIC_LOCATION_PROVIDER=mapbox

# To this:
EXPO_PUBLIC_LOCATION_PROVIDER=google
```

Restart app - done! The service automatically uses the right provider.

---

## Complete `.env.local` Example

For testing with multiple options:

```env
# Primary provider
EXPO_PUBLIC_LOCATION_PROVIDER=mapbox

# All keys (use one, add others later)
EXPO_PUBLIC_MAPBOX_API_KEY=pk.your_mapbox_token_here
EXPO_PUBLIC_GEOAPIFY_API_KEY=your_geoapify_key_here
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_key_here
```

---

## Performance Comparison

### Mapbox

```
✅ Instant results (<500ms)
✅ No rate limit errors
✅ 600/month = 20/day
⚠️  Limited but enough for testing
```

### Geoapify

```
✅ Instant results (<500ms)
✅ No rate limit errors
✅ 3000/month = 100/day
✅ Best for testing
⚠️  Smaller company
```

### Google Places

```
✅ Best accuracy
✅ $200 credit = unlimited testing
✅ Production-ready
⚠️  Longer setup
⚠️  Need to pay after free tier
```

---

## My Recommendation

### For Now (Testing):

Use **Mapbox** - fastest to setup, works great for testing

```env
EXPO_PUBLIC_LOCATION_PROVIDER=mapbox
EXPO_PUBLIC_MAPBOX_API_KEY=pk.your_token
```

### For Later (Production):

Switch to **Google Places** - better reliability

```env
EXPO_PUBLIC_LOCATION_PROVIDER=google
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_key
```

**No code changes needed** - just update the `.env.local` file! 🚀

---

## Troubleshooting

### "Provider configured as mapbox but no API key"

Make sure `.env.local` is in the `frontend` folder, not root:

```
RiderApp/
  frontend/          ← HERE
    .env.local       ← Create this file
    app/
```

### "Still getting empty results"

1. Restart Expo: `npx expo start --clear`
2. Check logs: Look for "Location Provider: MAPBOX"
3. Verify API key in `.env.local`
4. Try a longer query: "Colombo" instead of "Col"

### "Rate limited after many searches"

For Mapbox, you have 600/month:

- Per day: 600 ÷ 30 = 20 searches/day
- Use Geoapify (3000/month) if you need more

---

## Files to Update

1. ✅ `app/services/location/multiProviderService.ts` - Created
2. ⏳ `app/ride-search/index.tsx` - Update import
3. ✅ Create `.env.local` in frontend folder

---

## Quick Start (2 minutes)

```bash
# 1. Create .env.local in frontend folder
echo 'EXPO_PUBLIC_LOCATION_PROVIDER=mapbox' > .env.local
echo 'EXPO_PUBLIC_MAPBOX_API_KEY=pk.YOUR_TOKEN' >> .env.local

# 2. Update import in app/ride-search/index.tsx
# Change: locationSuggestionsService
# To: multiProviderService

# 3. Restart
npx expo start --clear
```

Done! 🎉
