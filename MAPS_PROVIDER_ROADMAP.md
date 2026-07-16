# Maps Provider Roadmap

## Current Mode: Google Maps Platform

The mobile apps use Google Maps Platform through a Laravel backend gateway:

1. Passenger searches for pickup/drop places through backend-proxied Places Autocomplete.
2. Passenger selection resolves coordinates through backend-proxied Place Details.
3. Backend Routes API computes distance, duration, and route polyline.
4. `react-native-maps` renders pickup, drop, route, and driver markers with Google as the provider.
5. Laravel computes authoritative ride estimates and persists booking route values.
6. DriverApp posts live location to Laravel; PassengerApp tracks it through realtime updates with snapshot polling fallback.

Required environment variables:

```env
# PassengerApp
GOOGLE_MAPS_ANDROID_API_KEY_PASSENGER=
GOOGLE_MAPS_IOS_API_KEY_PASSENGER=

# DriverApp
GOOGLE_MAPS_ANDROID_API_KEY_DRIVER=
GOOGLE_MAPS_IOS_API_KEY_DRIVER=

# backend-api
GOOGLE_MAPS_SERVER_API_KEY=
```

## Key Restrictions

- Native SDK keys should be restricted by Android package/SHA-1 or iOS bundle identifier.
- The backend server key should be restricted to backend hosts and the Places, Geocoding, and Routes APIs.
- Web-service calls stay on Laravel; mobile apps call only authenticated backend endpoints.
