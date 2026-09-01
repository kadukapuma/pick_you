import React, { createContext, useCallback, useContext, useState } from "react";
import type { LocationSuggestion } from "../../services/maps/locationSuggestions";
import type { SavedCard } from "../../services/payments/paymentTypes";

// Re-export for convenience
export type { LocationSuggestion };

export interface RideOption {
  id: string;
  name: string;
  icon: "car" | "bicycle" | "bus";
  price: number;
  eta: string;
  rating: number;
  passengerCount: number;
}

export type TripType = "oneway" | "return";
export type PaymentMethod = "cash" | "card";

interface Trip {
  pickup: LocationSuggestion | null;
  dropoff: LocationSuggestion | null;
  selectedRide: RideOption | null;
}

interface RideSearchContextType {
  // Trip Type
  tripType: TripType;
  setTripType: (type: TripType) => void;

  // The single trip on this booking. For a return trip, `dropoff` holds the
  // destination (B) — the ride always drops the passenger back at `pickup`,
  // which the backend derives automatically (never a separately-picked address).
  outboundTrip: Trip;
  setOutboundPickup: (location: LocationSuggestion) => void;
  setOutboundDropoff: (location: LocationSuggestion) => void;
  setOutboundRide: (ride: RideOption) => void;

  // Booking preferences
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  selectedPaymentCard: SavedCard | null;
  setSelectedPaymentCard: (card: SavedCard | null) => void;
  usePickuCredit: boolean;
  setUsePickuCredit: (value: boolean) => void;
  promoCode: string | null;
  setPromoCode: (code: string | null) => void;
  scheduledAt: string | null;
  setScheduledAt: (value: string | null) => void;

  // Book for a friend: the friend is picked up, but this account stays the
  // payer/account holder for wallet, loyalty, and rating purposes.
  isForFriend: boolean;
  setIsForFriend: (value: boolean) => void;
  friendName: string;
  setFriendName: (value: string) => void;
  friendPhone: string;
  setFriendPhone: (value: string) => void;

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
  const [isSearchingForDriver, setIsSearchingForDriver] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedPaymentCard, setSelectedPaymentCard] =
    useState<SavedCard | null>(null);
  const [usePickuCredit, setUsePickuCredit] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isForFriend, setIsForFriend] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
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

  const resetTrip = () => {
    setTripType("oneway");
    setOutboundTrip({ pickup: null, dropoff: null, selectedRide: null });
    setIsSearchingForDriver(false);
    setPaymentMethod("cash");
    setSelectedPaymentCard(null);
    setUsePickuCredit(false);
    setPromoCode(null);
    setScheduledAt(null);
    setIsForFriend(false);
    setFriendName("");
    setFriendPhone("");
    setActiveRideId(null);
    setActiveRideStatus(null);
  };

  const setActiveRide = useCallback(
    (rideId: number | null, status: string | null = null) => {
      setActiveRideId(rideId);
      setActiveRideStatus(status);
    },
    [],
  );

  const value: RideSearchContextType = {
    tripType,
    setTripType,
    outboundTrip,
    setOutboundPickup,
    setOutboundDropoff,
    setOutboundRide,
    paymentMethod,
    setPaymentMethod,
    selectedPaymentCard,
    setSelectedPaymentCard,
    usePickuCredit,
    setUsePickuCredit,
    promoCode,
    setPromoCode,
    scheduledAt,
    setScheduledAt,
    isForFriend,
    setIsForFriend,
    friendName,
    setFriendName,
    friendPhone,
    setFriendPhone,
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
