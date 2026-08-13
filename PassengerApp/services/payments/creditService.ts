import { apiClient } from "../api/client";
import type {
  CreditResult,
  PickuCreditSummary,
  PickuCreditTransaction,
} from "./creditTypes";

type RawTransaction = {
  id: number;
  type?: string;
  amount?: string | number;
  status?: string;
  reference?: string | null;
  reason?: string | null;
  balance_after?: string | number | null;
  ride_id?: number | null;
  created_at?: string;
};

type RawPage = {
  data?: RawTransaction[];
  current_page?: number;
  last_page?: number;
  total?: number;
};

type RawSummary = {
  available_balance?: string | number;
  reserved_balance?: string | number;
  transactions?: RawPage;
};

const safeMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

const mapTransaction = (raw: RawTransaction): PickuCreditTransaction => ({
  id: Number(raw.id),
  type: String(raw.type || "UNKNOWN").toUpperCase(),
  amount: safeMoney(raw.amount),
  status: String(raw.status || "UNKNOWN").toUpperCase(),
  reference: raw.reference || null,
  reason: raw.reason || null,
  balanceAfter:
    raw.balance_after === null || raw.balance_after === undefined
      ? null
      : safeMoney(raw.balance_after),
  rideId: raw.ride_id ? Number(raw.ride_id) : null,
  createdAt: raw.created_at || "",
});

const friendlyFailure = (message?: string) => {
  if (/timeout|network|fetch|offline/i.test(message || "")) {
    return "Check your connection and try again.";
  }
  return "We couldn’t load your PickU credit. Please try again.";
};

export const creditService = {
  async getSummary(page = 1): Promise<CreditResult<PickuCreditSummary>> {
    const response = await apiClient.get<RawSummary>(
      `/passenger/credits?page=${Math.max(1, page)}`,
      { suppressErrorLog: true },
    );

    if (!response.success || !response.data) {
      return { success: false, message: friendlyFailure(response.message) };
    }

    const rawPage = response.data.transactions || {};
    return {
      success: true,
      data: {
        availableBalance: safeMoney(response.data.available_balance),
        reservedBalance: safeMoney(response.data.reserved_balance),
        transactions: (rawPage.data || []).map(mapTransaction),
        pagination: {
          currentPage: Number(rawPage.current_page || page),
          lastPage: Number(rawPage.last_page || 1),
          total: Number(rawPage.total || 0),
        },
      },
    };
  },

  async getTransaction(id: string): Promise<CreditResult<PickuCreditTransaction>> {
    const response = await apiClient.get<RawTransaction>(
      `/wallet-transactions/${encodeURIComponent(id)}`,
      { suppressErrorLog: true },
    );
    if (!response.success || !response.data) {
      return { success: false, message: friendlyFailure(response.message) };
    }
    return { success: true, data: mapTransaction(response.data) };
  },
};
