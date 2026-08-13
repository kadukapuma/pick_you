export type CreditTransactionType =
  | "CREDIT_AWARD"
  | "CREDIT_RESERVATION"
  | "CREDIT_CONSUMED"
  | "CREDIT_RELEASED"
  | "RIDE_DEBIT"
  | string;

export type PickuCreditTransaction = {
  id: number;
  type: CreditTransactionType;
  amount: string;
  status: string;
  reference: string | null;
  reason: string | null;
  balanceAfter: string | null;
  rideId: number | null;
  createdAt: string;
};

export type CreditPagination = {
  currentPage: number;
  lastPage: number;
  total: number;
};

export type PickuCreditSummary = {
  availableBalance: string;
  reservedBalance: string;
  transactions: PickuCreditTransaction[];
  pagination: CreditPagination;
};

export type CreditResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};
