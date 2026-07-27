import type {
  OutstandingPayment,
  PaymentResult,
  SavedCard,
} from "./paymentTypes";

/**
 * Passenger payment boundary.
 *
 * Replace these preview implementations with backend endpoints after the HNB
 * merchant flow is confirmed. Screens should not call HNB directly.
 */
export const paymentService = {
  async listCards(): Promise<SavedCard[]> {
    return [
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
  },

  async beginSecureCardSetup(): Promise<{ redirectUrl: string }> {
    return { redirectUrl: "preview://hnb-secure-card-setup" };
  },

  async beginRidePayment(_rideId: string, _amount: number): Promise<PaymentResult> {
    return {
      status: "requires_action",
      message:
        "Card payment is ready, but the secure HNB backend connection is not active yet.",
    };
  },

  async getPaymentResult(_rideId: string): Promise<PaymentResult> {
    return {
      status: "processing",
      message: "Waiting for secure payment confirmation.",
    };
  },

  async listOutstandingPayments(): Promise<OutstandingPayment[]> {
    return [];
  },
};

