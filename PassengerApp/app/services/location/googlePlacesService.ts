/**
 * Google Places API Service
 * Handles location search and suggestions using Google Places Autocomplete
 *
 * SETUP INSTRUCTIONS:
 * 1. Get Google API Key:
 *    - Go to https://console.cloud.google.com/
 *    - Create a new project or select existing
 *    - Enable "Places API" and "Maps SDK for Android/iOS"
 *    - Create API Key (Credentials > Create > API Key)
 *    - Restrict to Android/iOS as needed
 *
 * 2. Add to your .env or config:
 *    GOOGLE_PLACES_API_KEY=your_api_key_here
 *
 * 3. Update environment variable in the app
 */

export interface LocationSuggestion {
  id: string;
  address: string;
  details: string;
  latitude: number;
  longitude: number;
  placeType: "address" | "landmark" | "saved";
}

// Cache for search results
const REQUEST_CACHE = new Map<string, LocationSuggestion[]>();

/**
 * Get Google Places API key from environment
 * TODO: Set this in your environment variables
 */
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";

/**
 * Search for locations using Google Places API
 * More reliable and has better rate limiting than Nominatim
 */
export const searchLocationSuggestions = async (
  query: string,
): Promise<LocationSuggestion[]> => {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  // Check cache first
  if (REQUEST_CACHE.has(query)) {
    console.log("Cache hit for:", query);
    return REQUEST_CACHE.get(query) || [];
  }

  if (!GOOGLE_API_KEY) {
    console.log(
      "Google API Key not configured. Using GooglePlacesAutocomplete component instead.",
    );
    return [];
  }

  try {
    // Google Places Text Search API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
        `query=${encodeURIComponent(query)} Sri Lanka` +
        `&key=${GOOGLE_API_KEY}`,
    );

    if (!response.ok) {
      console.log("Google Places API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.log("Google Places response:", data.status);
      return [];
    }

    // Transform Google results to our format
    const suggestions: LocationSuggestion[] = (data.results || []).map(
      (item: any, index: number) => ({
        id: item.place_id || `loc_${index}`,
        address: item.name || "",
        details: item.formatted_address || "",
        latitude: item.geometry.location.lat,
        longitude: item.geometry.location.lng,
        placeType: "address" as const,
      }),
    );

    // Cache results
    REQUEST_CACHE.set(query, suggestions);
    console.log(
      "Google Places search results for:",
      query,
      "found:",
      suggestions.length,
    );

    return suggestions;
  } catch (error) {
    console.log("Google Places search error:", error);
    return [];
  }
};

/**
 * Reverse geocoding using Google Places API
 * Convert coordinates to address
 */
export const getNearbyLocations = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  if (!GOOGLE_API_KEY) {
    console.log("Google API Key not configured");
    return [];
  }

  try {
    // Google Geocoding API (reverse geocoding)
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}` +
        `&key=${GOOGLE_API_KEY}`,
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results.length) {
      return [];
    }

    const result = data.results[0];

    return [
      {
        id: result.place_id,
        address: result.name || "Current Location",
        details: result.formatted_address || "",
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeType: "address",
      },
    ];
  } catch (error) {
    console.log("Reverse geocoding error:", error);
    return [];
  }
};

/**
 * Get default locations - empty for production
 * Uses real API only
 */
export const getDefaultLocations = (): LocationSuggestion[] => {
  return [];
};

/**
 * Get location by ID
 */
export const getLocationById = async (
  placeId: string,
): Promise<LocationSuggestion | null> => {
  if (!GOOGLE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=name,formatted_address,geometry,place_id` +
        `&key=${GOOGLE_API_KEY}`,
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      return null;
    }

    const result = data.result;

    return {
      id: result.place_id,
      address: result.name || "",
      details: result.formatted_address || "",
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeType: "address",
    };
  } catch (error) {
    console.log("Get location error:", error);
    return null;
  }
};
