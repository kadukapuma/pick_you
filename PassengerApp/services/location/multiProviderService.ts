/**
 * Mapbox-only location service.
 *
 * Future Google Places + Place Details support is intentionally documented in
 * MAPS_PROVIDER_ROADMAP.md instead of being shipped as disabled app code.
 */
export interface LocationSuggestion {
  id: string;
  address: string;
  details: string;
  latitude: number;
  longitude: number;
  placeType: "address" | "landmark" | "saved";
}

const MAPBOX_API_KEY = process.env.EXPO_PUBLIC_MAPBOX_API_KEY || "";
const REQUEST_CACHE = new Map<
  string,
  { data: LocationSuggestion[]; timestamp: number }
>();
const PENDING_REQUESTS = new Map<string, Promise<LocationSuggestion[]>>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const toSuggestion = (feature: any, fallbackId: string): LocationSuggestion => ({
  id: feature.id || fallbackId,
  address: feature.text || feature.place_name || "Location",
  details: feature.place_name || "Sri Lanka",
  latitude: feature.center?.[1] || 0,
  longitude: feature.center?.[0] || 0,
  placeType: "address",
});

const getCachedResult = (query: string): LocationSuggestion[] | null => {
  const cached = REQUEST_CACHE.get(query);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    REQUEST_CACHE.delete(query);
    return null;
  }
  return cached.data;
};

const searchMapbox = async (query: string): Promise<LocationSuggestion[]> => {
  if (!MAPBOX_API_KEY) {
    console.log("Mapbox API key is not configured");
    return [];
  }

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?country=lk` +
      `&limit=5` +
      `&autocomplete=true` +
      `&language=en` +
      `&access_token=${MAPBOX_API_KEY}`,
  );

  if (!response.ok) {
    console.log("Mapbox API error:", response.status);
    return [];
  }

  const data = await response.json();
  return (data.features || []).map((feature: any, index: number) =>
    toSuggestion(feature, `mapbox_${index}`),
  );
};

export const searchLocationSuggestions = async (
  query: string,
): Promise<LocationSuggestion[]> => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 3) return [];

  const cached = getCachedResult(normalizedQuery);
  if (cached) return cached;

  const pending = PENDING_REQUESTS.get(normalizedQuery);
  if (pending) return pending;

  const request = searchMapbox(normalizedQuery)
    .then((results) => {
      if (results.length > 0) {
        REQUEST_CACHE.set(normalizedQuery, {
          data: results,
          timestamp: Date.now(),
        });
      }
      return results;
    })
    .catch((error) => {
      console.log("Mapbox search error:", error);
      return [];
    })
    .finally(() => PENDING_REQUESTS.delete(normalizedQuery));

  PENDING_REQUESTS.set(normalizedQuery, request);
  return request;
};

export const getNearbyLocations = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  if (!MAPBOX_API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
        `limit=1` +
        `&language=en` +
        `&access_token=${MAPBOX_API_KEY}`,
    );

    if (!response.ok) return [];

    const data = await response.json();
    const feature = data.features?.[0];
    return feature ? [toSuggestion(feature, "mapbox_reverse")] : [];
  } catch (error) {
    console.log("Mapbox reverse geocode error:", error);
    return [];
  }
};

export const getProviderInfo = () => ({
  mapbox: {
    name: "Mapbox",
    status: MAPBOX_API_KEY ? "Configured" : "Missing API key",
  },
});

export const clearLocationCache = () => {
  REQUEST_CACHE.clear();
  PENDING_REQUESTS.clear();
};

export const getCacheStats = () => ({
  cachedQueries: REQUEST_CACHE.size,
  pendingRequests: PENDING_REQUESTS.size,
  cacheTTL: `${CACHE_TTL / 1000 / 60 / 60} hours`,
});

export const getDefaultLocations = (): LocationSuggestion[] => [];
