# Maps Provider Roadmap

## Current Mode: Mapbox Only

The mobile apps currently use Mapbox for the full maps flow:

1. Passenger searches for pickup/drop places.
2. Mapbox Geocoding returns coordinates and display addresses.
3. Mapbox Directions returns route distance, duration, and polyline geometry.
4. Mapbox Maps SDK renders pickup, drop, route, and driver markers.
5. Laravel backend receives ride coordinates for fare calculation and driver matching.
6. DriverApp posts live location to Laravel; PassengerApp tracks it through realtime updates with snapshot polling fallback.

Required current environment variable:

```env
EXPO_PUBLIC_MAPBOX_API_KEY=your_mapbox_public_token
```

## Future Hybrid Mode

When Google APIs are available, the passenger place-search flow should become:

```text
Passenger App
  -> Google Places API
  -> Place Details API
  -> Coordinates + Address
  -> Mapbox Maps SDK
  -> Show Pickup & Drop
  -> Laravel Backend API
  -> Fare Calculation
  -> Driver Matching
```

Mapbox should remain the map renderer in the future hybrid structure. Google should only own place search and place details.

Future environment variables:

```env
EXPO_PUBLIC_LOCATION_PROVIDER=google
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_key
EXPO_PUBLIC_MAPBOX_API_KEY=your_mapbox_public_token
```

## Implementation Notes For Later

- Add a provider adapter for passenger place search and place details.
- Keep the app-facing location result shape stable: `id`, `address`, `details`, `latitude`, `longitude`, `placeType`.
- Do not replace Mapbox map rendering with Google Maps.
- Keep Laravel ride, fare, matching, and live-location contracts unchanged unless backend requirements change.
