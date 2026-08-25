import { apiClient } from "../api/client";
import type { CreditResult } from "./creditTypes";

type RawLoyaltySummary = {
  available_balance?: string | number;
  reserved_balance?: string | number;
};

export type LoyaltyPointsSummary = {
  availableBalance: string;
  reservedBalance: string;
};

const safeMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

const friendlyFailure = (message?: string) => {
  if (/timeout|network|fetch|offline/i.test(message || "")) {
    return "Check your connection and try again.";
  }
  return "We couldn’t load your loyalty points. Please try again.";
};

export const loyaltyService = {
  async getSummary(): Promise<CreditResult<LoyaltyPointsSummary>> {
    const response = await apiClient.get<RawLoyaltySummary>(
      "/passenger/loyalty-points",
      { suppressErrorLog: true },
    );

    if (!response.success || !response.data) {
      return { success: false, message: friendlyFailure(response.message) };
    }

    return {
      success: true,
      data: {
        availableBalance: safeMoney(response.data.available_balance),
        reservedBalance: safeMoney(response.data.reserved_balance),
      },
    };
  },
};
