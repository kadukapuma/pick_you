import { apiClient } from "../api/client";

export interface LocationSuggestion {
  id: string;
  address: string;
  details: string;
  latitude: number;
  longitude: number;
  placeType: "address" | "landmark" | "saved";
  placeId?: string | null;
  provider?: "google" | "local";
}

type SearchOptions = {
  sessionToken?: string;
  latitude?: number;
  longitude?: number;
};

const REQUEST_CACHE = new Map<
  string,
  { data: LocationSuggestion[]; timestamp: number }
>();
const PENDING_REQUESTS = new Map<string, Promise<LocationSuggestion[]>>();
const CACHE_TTL = 5 * 60 * 1000;

export const createPlacesSessionToken = () =>
  "places_" +
  Date.now().toString(36) +
  "_" +
  Math.random().toString(36).slice(2, 12);

const isResolved = (location: LocationSuggestion) =>
  Number.isFinite(location.latitude) && Number.isFinite(location.longitude);

const queryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.append(key, String(value));
  });
  return search.toString();
};

export const searchLocationSuggestions = async (
  query: string,
  options: SearchOptions = {},
): Promise<LocationSuggestion[]> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const sessionToken = options.sessionToken || createPlacesSessionToken();
  const cacheKey = [
    normalizedQuery.toLowerCase(),
    sessionToken,
    options.latitude?.toFixed(3),
    options.longitude?.toFixed(3),
  ].join(":");

  const cached = REQUEST_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const pending = PENDING_REQUESTS.get(cacheKey);
  if (pending) return pending;

  const request = apiClient
    .get<LocationSuggestion[]>(
      `/maps/places/autocomplete?${queryString({
        input: normalizedQuery,
        session_token: sessionToken,
        latitude: options.latitude,
        longitude: options.longitude,
      })}`,
      { suppressErrorLog: true },
    )
    .then((response) => {
      if (!response.success) {
        console.log("Google Places autocomplete failed:", response.message);
        return [];
      }

      const results = Array.isArray(response.data) ? response.data : [];
      REQUEST_CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
    })
    .catch((error) => {
      console.log("Google Places autocomplete error:", error);
      return [];
    })
    .finally(() => PENDING_REQUESTS.delete(cacheKey));

  PENDING_REQUESTS.set(cacheKey, request);
  return request;
};

export const resolveLocationSuggestion = async (
  suggestion: LocationSuggestion,
  sessionToken?: string,
): Promise<LocationSuggestion | null> => {
  if (isResolved(suggestion)) return suggestion;
  if (!suggestion.placeId || !sessionToken) return null;

  const response = await apiClient.get<LocationSuggestion>(
    `/maps/places/details?${queryString({
      place_id: suggestion.placeId,
      session_token: sessionToken,
    })}`,
    { suppressErrorLog: true },
  );

  if (!response.success) {
    console.log("Google Places details failed:", response.message);
    return null;
  }

  return response.data || null;
};

export const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion | null> => {
  const response = await apiClient.post<LocationSuggestion>("/maps/geocode/reverse", {
    latitude,
    longitude,
  });

  if (!response.success) {
    console.log("Google reverse geocode failed:", response.message);
    return null;
  }

  return response.data || null;
};

export const getNearbyLocations = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  const result = await reverseGeocodeLocation(latitude, longitude);
  return result ? [result] : [];
};

export const getProviderInfo = () => ({
  google: {
    name: "Google Maps Platform",
    status: "Backend proxy",
  },
});

export const clearLocationCache = () => {
  REQUEST_CACHE.clear();
  PENDING_REQUESTS.clear();
};

export const getCacheStats = () => ({
  cachedQueries: REQUEST_CACHE.size,
  pendingRequests: PENDING_REQUESTS.size,
  cacheTTL: `${CACHE_TTL / 1000 / 60} minutes`,
});

export const getDefaultLocations = (): LocationSuggestion[] => [];
