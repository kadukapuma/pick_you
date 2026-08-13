export type PaymentMethodId = "cash" | "wallet" | "card";

export type SavedCard = {
  id: string;
  brand: "visa" | "mastercard" | "amex" | "unknown";
  last4: string;
  expiryLabel: string;
  isDefault: boolean;
};

export type NewCardInput = {
  number: string;
  expMonth: number;
  expYear: number;
  cvv: string;
  isDefault?: boolean;
};

export type PaymentResultStatus =
  | "processing"
  | "completed"
  | "failed"
  | "requires_action";

export type PaymentResult = {
  status: PaymentResultStatus;
  reference?: string;
  message?: string;
};

export type OutstandingPayment = {
  rideId: string;
  rideCode: string;
  amount: number;
  currency: "LKR";
  reason: string;
  createdAtLabel: string;
};

export type PaymentCapabilities = {
  cash: boolean;
  card: boolean;
  wallet: boolean;
  gateway: string;
  environment: string;
};

export type WebxpayCheckout = {
  paymentId: number;
  attemptId: number | null;
  merchantOrderId?: string;
  amount: string;
  currency: "LKR";
  checkoutUrl: string | null;
  expiresAt: string | null;
};

export type WebxpayCardSetup = {
  operationId: string;
  setupUrl: string;
  expiresAt: string;
};

export type WebxpaySavedCardPayment = {
  rideId: number;
  paymentId: number;
  attemptId: number;
  operationId: number;
  paymentStatus: string;
  requiresThreeDs: boolean;
  threeDsUrl: string | null;
};
