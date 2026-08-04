import type { SavedCard } from "./paymentTypes";

export const PREVIEW_RIDE = {
  rideId: "PY10291",
  estimatedFare: 1200,
  finalFare: 1350,
  currency: "LKR" as const,
};

export const PREVIEW_CARDS: SavedCard[] = [
  {
    id: "preview-visa-6492",
    brand: "visa",
    last4: "6492",
    expiryLabel: "11/30",
    isDefault: true,
  },
  {
    id: "preview-mastercard-7294",
    brand: "mastercard",
    last4: "7294",
    expiryLabel: "01/28",
    isDefault: false,
  },
  {
    id: "preview-amex-8321",
    brand: "amex",
    last4: "8321",
    expiryLabel: "05/28",
    isDefault: false,
  },
];

export const PREVIEW_DEFAULT_CARD = PREVIEW_CARDS[0];
