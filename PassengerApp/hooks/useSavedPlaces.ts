import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "@picku_saved_places";

export type PlaceType = "home" | "office" | "other";

export type SavedPlace = {
  id: string;
  type: PlaceType;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

const PLACE_CONFIGS: Record<PlaceType, { icon: any; color: string; bg: string }> = {
  home: { icon: "home", color: "#22B36A", bg: "#DDF5EC" },
  office: { icon: "business", color: "#3BAAE8", bg: "#E6F4FB" },
  other: { icon: "location", color: "#F59E0B", bg: "#FFF1D8" },
};

export function getPlaceConfig(type: PlaceType) {
  return PLACE_CONFIGS[type];
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPlaces(JSON.parse(raw));
      } else {
        setPlaces([]);
      }
    } catch {
      // ignore read errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  // Reload whenever the screen that contains this hook regains focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = useCallback(async (updated: SavedPlace[]) => {
    setPlaces(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, []);

  /** Returns true if add was successful, false if singleton already exists */
  const addPlace = useCallback(
    async (data: Omit<SavedPlace, "id">): Promise<boolean> => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedPlace[] = current ? JSON.parse(current) : [];

      // Enforce singleton for Home and Office
      if (data.type === "home" || data.type === "office") {
        if (list.some((p) => p.type === data.type)) return false;
      }
      const newPlace: SavedPlace = { id: genId(), ...data };
      await persist([...list, newPlace]);
      return true;
    },
    [persist]
  );

  const updatePlace = useCallback(
    async (id: string, data: Omit<SavedPlace, "id">): Promise<boolean> => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedPlace[] = current ? JSON.parse(current) : [];

      // Enforce singleton: if changing type to home/office, ensure no other entry has that type
      if (data.type === "home" || data.type === "office") {
        if (list.some((p) => p.type === data.type && p.id !== id)) return false;
      }
      const updated = list.map((p) => (p.id === id ? { ...p, ...data } : p));
      await persist(updated);
      return true;
    },
    [persist]
  );

  const deletePlace = useCallback(
    async (id: string) => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedPlace[] = current ? JSON.parse(current) : [];
      await persist(list.filter((p) => p.id !== id));
    },
    [persist]
  );

  const homePlace = places.find((p) => p.type === "home") ?? null;
  const officePlace = places.find((p) => p.type === "office") ?? null;
  const otherPlaces = places.filter((p) => p.type === "other");

  return {
    places,
    homePlace,
    officePlace,
    otherPlaces,
    loading,
    addPlace,
    updatePlace,
    deletePlace,
    reload: load,
  };
}
