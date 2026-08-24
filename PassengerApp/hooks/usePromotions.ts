import { useCallback, useEffect, useState } from "react";
import { promotionService } from "../services/promotions/promotionService";
import type { Promotion } from "../services/promotions/promotionTypes";

// Shown until /passenger/promotions returns real data. Remove once the
// backend endpoint is live and always returns at least one active promotion.
const FALLBACK_PROMOTIONS: Promotion[] = [
  {
    id: "fallback-cashback",
    imageUrl: null,
    title: "Rs.100 Cashback",
    description: "On your first 2 rides. Book now and save on your next trip.",
    buttonLabel: "Book a Ride",
    actionUrl: "/ride-booking",
  },
];

export function usePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>(FALLBACK_PROMOTIONS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await promotionService.getActive();
    if (result.success && result.data.length > 0) {
      setPromotions(result.data);
    }
    // On failure or an empty list, keep showing the local fallback promo.
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { promotions, loading, reload: load };
}
