import type {
  OutstandingPayment,
  PaymentResult,
  SavedCard,
} from "./paymentTypes";
import { PREVIEW_CARDS } from "./paymentPreviewData";

/** Keep false until the server-side sandbox and callback flow are ready. */
export const CARD_PAYMENTS_ENABLED = false;

/**
 * Passenger payment boundary.
 *
 * Replace these preview implementations with backend endpoints after the
 * merchant flow is confirmed. Screens should not call the provider directly.
 */
export const paymentService = {
  async listCards(): Promise<SavedCard[]> {
    return PREVIEW_CARDS;
  },

  async getCard(cardId: string): Promise<SavedCard | null> {
    return PREVIEW_CARDS.find((card) => card.id === cardId) || null;
  },

  async setDefaultCard(_cardId: string): Promise<void> {
    return;
  },

  async removeCard(_cardId: string): Promise<void> {
    return;
  },

  async beginSecureCardSetup(): Promise<{ redirectUrl: string }> {
    return { redirectUrl: "preview://hnb-secure-card-setup" };
  },

  async beginRidePayment(_rideId: string, _amount: number): Promise<PaymentResult> {
    return {
      status: "requires_action",
      message:
        "Card payments are not available while the secure payment connection is being configured.",
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

