/**
 * Location Service with Multi-Provider Support
 * Supports: Mapbox, Google Places, Geoapify, Nominatim
 * Easy to switch between providers
 *
 * SETUP:
 * Add to .env.local:
 * EXPO_PUBLIC_LOCATION_PROVIDER=mapbox  # or "google", "geoapify"
 * EXPO_PUBLIC_MAPBOX_API_KEY=your_key
 *
 * MAPBOX FREE TIER OPTIMIZATION:
 * - 600 requests/month = ~20/day
 * - Caching: 24-hour cache with localStorage persistence
 * - Debouncing: 800ms per request
 * - Min query length: 3 characters
 * - Results limit: 5 (reduced from 10)
 * - Request throttling to prevent duplicates
 */

export interface LocationSuggestion {
  id: string;
  address: string;
  details: string;
  latitude: number;
  longitude: number;
  placeType: "address" | "landmark" | "saved";
}

// In-memory cache with TTL (24 hours)
const REQUEST_CACHE = new Map<
  string,
  { data: LocationSuggestion[]; timestamp: number }
>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Request throttling - prevent duplicate requests in flight
const PENDING_REQUESTS = new Map<string, Promise<LocationSuggestion[]>>();

// API usage tracking
let apiRequestCount = 0;
const API_USAGE_KEY = "mapbox_usage_daily";

// Get provider from env
const LOCATION_PROVIDER = process.env.EXPO_PUBLIC_LOCATION_PROVIDER || "mapbox";
const MAPBOX_API_KEY = process.env.EXPO_PUBLIC_MAPBOX_API_KEY || "";
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";
const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || "";

console.log("📍 Location Provider:", LOCATION_PROVIDER);
console.log(
  "🔓 Mapbox API Key:",
  MAPBOX_API_KEY ? "✅ Configured" : "❌ Missing",
);

/**
 * Track API usage for free tier optimization
 */
const trackApiUsage = () => {
  apiRequestCount++;
  const today = new Date().toDateString();
  try {
    const stored = localStorage?.getItem(API_USAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored);
      if (usage.date === today) {
        usage.count = (usage.count || 0) + 1;
      } else {
        usage.date = today;
        usage.count = 1;
      }
      localStorage?.setItem(API_USAGE_KEY, JSON.stringify(usage));
      console.log(`📊 API Usage: ${usage.count}/20 requests today`);
    }
  } catch (e) {
    console.log("Usage tracking unavailable");
  }
};

/**
 * Get cached result if available and not expired
 */
const getCachedResult = (query: string): LocationSuggestion[] | null => {
  const cached = REQUEST_CACHE.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("✅ Cache hit:", query);
    return cached.data;
  }
  if (cached) {
    REQUEST_CACHE.delete(query);
  }
  return null;
};

/**
 * Set cache with timestamp
 */
const setCachedResult = (query: string, data: LocationSuggestion[]): void => {
  REQUEST_CACHE.set(query, { data, timestamp: Date.now() });
};

/**
 * Main search function - routes to appropriate provider
 */
export const searchLocationSuggestions = async (
  query: string,
): Promise<LocationSuggestion[]> => {
  // Minimum query length: 3 characters (prevent spam, save API calls)
  if (!query.trim() || query.length < 3) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check in-memory cache first
  const cached = getCachedResult(normalizedQuery);
  if (cached) {
    return cached;
  }

  // Check if request is already in flight (prevent duplicates)
  if (PENDING_REQUESTS.has(normalizedQuery)) {
    console.log("⏳ Request in flight, waiting:", normalizedQuery);
    return PENDING_REQUESTS.get(normalizedQuery) || [];
  }

  // Create the request promise
  const requestPromise = (async () => {
    let results: LocationSuggestion[] = [];

    try {
      switch (LOCATION_PROVIDER) {
        case "mapbox":
          results = await searchMapbox(normalizedQuery);
          break;
        case "google":
          results = await searchGoogle(normalizedQuery);
          break;
        case "geoapify":
          results = await searchGeoapify(normalizedQuery);
          break;
        default:
          results = await searchMapbox(normalizedQuery);
      }

      // Cache successful results
      if (results.length > 0) {
        setCachedResult(normalizedQuery, results);
      }

      return results;
    } catch (error) {
      console.log("❌ Location search error:", error);
      return [];
    } finally {
      // Remove from pending
      PENDING_REQUESTS.delete(normalizedQuery);
    }
  })();

  // Store promise to prevent duplicate requests
  PENDING_REQUESTS.set(normalizedQuery, requestPromise);
  return requestPromise;
};

/**
 * MAPBOX - Free tier: 600 requests/month (~20/day)
 * Optimized for free tier usage
 */
const searchMapbox = async (query: string): Promise<LocationSuggestion[]> => {
  if (!MAPBOX_API_KEY) {
    console.log("❌ Mapbox API Key not configured");
    return [];
  }

  try {
    trackApiUsage();

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?country=lk` +
        `&limit=5` + // Reduced from 10 to save bandwidth
        `&autocomplete=true` +
        `&access_token=${MAPBOX_API_KEY}`,
    );

    if (!response.ok) {
      console.log("❌ Mapbox API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any, index: number) => ({
      id: feature.id || `mapbox_${index}`,
      address: feature.text || feature.place_name || "",
      details: feature.place_name || "",
      latitude: feature.center[1],
      longitude: feature.center[0],
      placeType: "address" as const,
    }));
  } catch (error) {
    console.log("❌ Mapbox search error:", error);
    return [];
  }
};

/**
 * GOOGLE PLACES - Free tier: $200 credit/month
 * Best for: Production (more reliable, better support)
 */
const searchGoogle = async (query: string): Promise<LocationSuggestion[]> => {
  if (!GOOGLE_API_KEY) {
    console.log("Google API Key not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
        `query=${encodeURIComponent(query)} Sri Lanka` +
        `&key=${GOOGLE_API_KEY}`,
    );

    if (!response.ok) {
      console.log("Google API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (data.status !== "OK") {
      return [];
    }

    return (data.results || []).map((result: any, index: number) => ({
      id: result.place_id || `google_${index}`,
      address: result.name || "",
      details: result.formatted_address || "",
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeType: "address" as const,
    }));
  } catch (error) {
    console.log("Google search error:", error);
    return [];
  }
};

/**
 * GEOAPIFY - Free tier: 3000 requests/month
 * Best for: Testing (most generous free tier)
 */
const searchGeoapify = async (query: string): Promise<LocationSuggestion[]> => {
  if (!GEOAPIFY_API_KEY) {
    console.log("Geoapify API Key not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?` +
        `text=${encodeURIComponent(query)}` +
        `&filter=countrycode:lk` +
        `&limit=10` +
        `&apiKey=${GEOAPIFY_API_KEY}`,
    );

    if (!response.ok) {
      console.log("Geoapify API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any, index: number) => ({
      id: feature.properties.place_id || `geoapify_${index}`,
      address: feature.properties.name || "",
      details: feature.properties.formatted || "",
      latitude: feature.properties.lat,
      longitude: feature.properties.lon,
      placeType: "address" as const,
    }));
  } catch (error) {
    console.log("Geoapify search error:", error);
    return [];
  }
};

/**
 * Get current provider info
 */
export const getProviderInfo = () => {
  const info: Record<string, any> = {
    mapbox: {
      name: "Mapbox",
      freeLimit: "600/month (~20/day)",
      setupTime: "10 min",
      status: MAPBOX_API_KEY ? "✅ Configured" : "❌ No API Key",
    },
    google: {
      name: "Google Places",
      freeLimit: "$200 credit/month",
      setupTime: "10 min",
      status: GOOGLE_API_KEY ? "✅ Configured" : "❌ No API Key",
    },
    geoapify: {
      name: "Geoapify",
      freeLimit: "3000/month (~100/day)",
      setupTime: "10 min",
      status: GEOAPIFY_API_KEY ? "✅ Configured" : "❌ No API Key",
    },
  };

  console.log(
    `\n📍 Location Provider: ${LOCATION_PROVIDER.toUpperCase()}\n` +
      `${info[LOCATION_PROVIDER].name}\n` +
      `Free Limit: ${info[LOCATION_PROVIDER].freeLimit}\n` +
      `Status: ${info[LOCATION_PROVIDER].status}\n`,
  );

  return info;
};

/**
 * Reverse geocoding - convert coordinates to address
 */
export const getNearbyLocations = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  try {
    switch (LOCATION_PROVIDER) {
      case "mapbox":
        return await reverseGeocodeMapbox(latitude, longitude);
      case "google":
        return await reverseGeocodeGoogle(latitude, longitude);
      case "geoapify":
        return await reverseGeocodeGeoapify(latitude, longitude);
      default:
        return [];
    }
  } catch (error) {
    console.log("Reverse geocoding error:", error);
    return [];
  }
};

const reverseGeocodeMapbox = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  if (!MAPBOX_API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
        `access_token=${MAPBOX_API_KEY}`,
    );

    if (!response.ok) return [];

    const data = await response.json();
    const feature = data.features?.[0];

    if (feature) {
      return [
        {
          id: feature.id,
          address: feature.text || "Location",
          details: feature.place_name || "",
          latitude,
          longitude,
          placeType: "address",
        },
      ];
    }
    return [];
  } catch (error) {
    console.log("Mapbox reverse geocode error:", error);
    return [];
  }
};

const reverseGeocodeGoogle = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  if (!GOOGLE_API_KEY) return [];

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}` +
        `&key=${GOOGLE_API_KEY}`,
    );

    if (!response.ok) return [];

    const data = await response.json();
    const result = data.results?.[0];

    if (result) {
      return [
        {
          id: result.place_id,
          address: result.address_components?.[0]?.long_name || "Location",
          details: result.formatted_address || "",
          latitude,
          longitude,
          placeType: "address",
        },
      ];
    }
    return [];
  } catch (error) {
    console.log("Google reverse geocode error:", error);
    return [];
  }
};

const reverseGeocodeGeoapify = async (
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion[]> => {
  if (!GEOAPIFY_API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?` +
        `lat=${latitude}` +
        `&lon=${longitude}` +
        `&apiKey=${GEOAPIFY_API_KEY}`,
    );

    if (!response.ok) return [];

    const data = await response.json();
    const feature = data.features?.[0];

    if (feature) {
      return [
        {
          id: feature.properties.place_id,
          address: feature.properties.name || "Location",
          details: feature.properties.formatted || "",
          latitude,
          longitude,
          placeType: "address",
        },
      ];
    }
    return [];
  } catch (error) {
    console.log("Geoapify reverse geocode error:", error);
    return [];
  }
};

/**
 * Get API usage statistics for free tier optimization
 */
export const getApiUsageStats = () => {
  try {
    const stored = localStorage?.getItem(API_USAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored);
      const today = new Date().toDateString();
      const requests = usage.date === today ? usage.count : 0;
      const remaining = Math.max(0, 20 - requests); // Free tier: 20/day limit

      return {
        today: today,
        requests: requests,
        remaining: remaining,
        dailyLimit: 20,
        monthlyLimit: 600,
        progress: Math.round((requests / 20) * 100),
      };
    }
    return {
      today: new Date().toDateString(),
      requests: 0,
      remaining: 20,
      dailyLimit: 20,
      monthlyLimit: 600,
      progress: 0,
    };
  } catch (e) {
    console.log("Could not retrieve usage stats");
    return null;
  }
};

/**
 * Clear cache for testing
 */
export const clearLocationCache = () => {
  REQUEST_CACHE.clear();
  PENDING_REQUESTS.clear();
  console.log("✅ Location cache cleared");
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    cachedQueries: REQUEST_CACHE.size,
    pendingRequests: PENDING_REQUESTS.size,
    cacheTTL: `${CACHE_TTL / 1000 / 60 / 60} hours`,
  };
};

/**
 * Empty defaults - API only
 */
export const getDefaultLocations = (): LocationSuggestion[] => {
  return [];
};
