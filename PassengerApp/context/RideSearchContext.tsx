import React, { createContext, useContext, useState } from "react";
import type { LocationSuggestion } from "../services/location/locationSuggestionsService";

// Re-export for convenience
export type { LocationSuggestion };

export interface RideOption {
  id: string;
  name: string;
  icon: "car" | "bicycle" | "bus";
  price: number;
  eta: string;
  rating: number;
}

export type TripType = "oneway" | "return";

interface Trip {
  pickup: LocationSuggestion | null;
  dropoff: LocationSuggestion | null;
  selectedRide: RideOption | null;
}

interface RideSearchContextType {
  // Trip Type
  tripType: TripType;
  setTripType: (type: TripType) => void;

  // Outbound Trip
  outboundTrip: Trip;
  setOutboundPickup: (location: LocationSuggestion) => void;
  setOutboundDropoff: (location: LocationSuggestion) => void;
  setOutboundRide: (ride: RideOption) => void;

  // Return Trip (only for return trips)
  returnTrip: Trip;
  setReturnPickup: (location: LocationSuggestion) => void;
  setReturnDropoff: (location: LocationSuggestion) => void;
  setReturnRide: (ride: RideOption) => void;

  // Reset
  resetTrip: () => void;

  // Booking state
  isSearchingForDriver: boolean;
  setIsSearchingForDriver: (value: boolean) => void;
  activeRideId: number | null;
  activeRideStatus: string | null;
  setActiveRide: (rideId: number | null, status?: string | null) => void;
}

const RideSearchContext = createContext<RideSearchContextType | undefined>(
  undefined,
);

export function RideSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tripType, setTripType] = useState<TripType>("oneway");
  const [outboundTrip, setOutboundTrip] = useState<Trip>({
    pickup: null,
    dropoff: null,
    selectedRide: null,
  });
  const [returnTrip, setReturnTrip] = useState<Trip>({
    pickup: null,
    dropoff: null,
    selectedRide: null,
  });
  const [isSearchingForDriver, setIsSearchingForDriver] = useState(false);
  const [activeRideId, setActiveRideId] = useState<number | null>(null);
  const [activeRideStatus, setActiveRideStatus] = useState<string | null>(null);

  const setOutboundPickup = (location: LocationSuggestion) => {
    setOutboundTrip((prev) => ({ ...prev, pickup: location }));
  };

  const setOutboundDropoff = (location: LocationSuggestion) => {
    setOutboundTrip((prev) => ({ ...prev, dropoff: location }));
  };

  const setOutboundRide = (ride: RideOption) => {
    setOutboundTrip((prev) => ({ ...prev, selectedRide: ride }));
  };

  const setReturnPickup = (location: LocationSuggestion) => {
    setReturnTrip((prev) => ({ ...prev, pickup: location }));
  };

  const setReturnDropoff = (location: LocationSuggestion) => {
    setReturnTrip((prev) => ({ ...prev, dropoff: location }));
  };

  const setReturnRide = (ride: RideOption) => {
    setReturnTrip((prev) => ({ ...prev, selectedRide: ride }));
  };

  const resetTrip = () => {
    setTripType("oneway");
    setOutboundTrip({ pickup: null, dropoff: null, selectedRide: null });
    setReturnTrip({ pickup: null, dropoff: null, selectedRide: null });
    setIsSearchingForDriver(false);
    setActiveRideId(null);
    setActiveRideStatus(null);
  };

  const setActiveRide = (rideId: number | null, status: string | null = null) => {
    setActiveRideId(rideId);
    setActiveRideStatus(status);
  };

  const value: RideSearchContextType = {
    tripType,
    setTripType,
    outboundTrip,
    setOutboundPickup,
    setOutboundDropoff,
    setOutboundRide,
    returnTrip,
    setReturnPickup,
    setReturnDropoff,
    setReturnRide,
    resetTrip,
    isSearchingForDriver,
    setIsSearchingForDriver,
    activeRideId,
    activeRideStatus,
    setActiveRide,
  };

  return (
    <RideSearchContext.Provider value={value}>
      {children}
    </RideSearchContext.Provider>
  );
}

export function useRideSearch() {
  const context = useContext(RideSearchContext);
  if (!context) {
    throw new Error("useRideSearch must be used within RideSearchProvider");
  }
  return context;
}
