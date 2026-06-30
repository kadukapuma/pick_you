// services/location/locationSuggestionsService.ts

export interface LocationSuggestion {
  id: string;
  address: string;
  details: string;
  latitude: number;
  longitude: number;
  placeType: "address" | "landmark" | "saved";
}

// Get Mapbox token from .env
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_API_KEY || "";

// Cache search results
const searchCache: Record<string, LocationSuggestion[]> = {};

/**
 * Search Sri Lankan locations using Mapbox
 */
export const searchLocationSuggestions = async (
  query: string,
): Promise<LocationSuggestion[]> => {
  try {
    const cleanQuery = query.trim();

    // Prevent unnecessary requests
    if (cleanQuery.length < 3) {
      return [];
    }

    // Use lowercase cache key
    const cacheKey = cleanQuery.toLowerCase();

    // Return cached results
    if (searchCache[cacheKey]) {
      return searchCache[cacheKey];
    }

    // Build Mapbox request URL
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(cleanQuery)}.json?` +
      `country=lk` +
      `&autocomplete=true` +
      `&limit=6` +
      `&language=en` +
      `&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log("Mapbox API Error:", response.status);

      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    // Transform API response
    const suggestions: LocationSuggestion[] = data.features.map(
      (feature: any) => ({
        id: feature.id,

        address: feature.text || "Unknown Location",

        details: feature.place_name || "Sri Lanka",

        latitude: feature.center?.[1] || 0,

        longitude: feature.center?.[0] || 0,

        placeType: "address",
      }),
    );

    // Save cache
    searchCache[cacheKey] = suggestions;

    return suggestions;
  } catch (error) {
    console.log("Mapbox Search Error:", error);

    return [];
  }
};

/**
 * Reverse Geocoding
 * Convert coordinates -> readable address
 */
export const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion | null> => {
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${longitude},${latitude}.json?` +
      `limit=1` +
      `&language=en` +
      `&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log("Reverse Geocode Error:", response.status);

      return null;
    }

    const data = await response.json();

    const feature = data.features?.[0];

    if (!feature) {
      return null;
    }

    return {
      id: feature.id,

      address: feature.text || "Current Location",

      details: feature.place_name || "Sri Lanka",

      latitude,

      longitude,

      placeType: "address",
    };
  } catch (error) {
    console.log("Mapbox Reverse Error:", error);

    return null;
  }
};
