import { apiClient } from "../api/client";
import type {
  NewCardInput,
  OutstandingPayment,
  PaymentCapabilities,
  PaymentResult,
  SavedCard,
  WebxpayCheckout,
  WebxpayCardSetup,
  WebxpaySavedCardPayment,
} from "./paymentTypes";

// Local mock-card testing only. `__DEV__` guarantees this cannot enable the
// mock card flow in a production build, even if the environment value is set.
export const CARD_PAYMENTS_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_MOCK_CARD_PAYMENTS === "true";

type RawPaymentMethod = {
  id: number | string;
  gateway: string;
  brand: string | null;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
};

/** Backend shape from PassengerPaymentMethodController (token is never exposed). */
type RawWebxpayCheckout = {
  payment_id: number;
  attempt_id: number | null;
  merchant_order_id?: string;
  amount: string;
  currency: string;
  checkout_url: string | null;
  expires_at: string | null;
};

type RawWebxpayCardSetup = {
  operation_id: string;
  setup_url: string;
  expires_at: string;
};

type RawWebxpaySavedCardPayment = {
  ride_id: number;
  payment_id: number;
  attempt_id: number;
  operation_id: number;
  payment_status: string;
  requires_3ds: boolean;
  three_ds_url: string | null;
};

type RawTrustedPaymentStatus = {
  ride_id: number;
  payment_method: string;
  final_fare: string;
  payment: RawPayment | null;
};

type RawPayment = {
  payment_status?: string;
  status?: string;
  gateway_reference?: string;
  failure_reason?: string;
};

function detectBrand(cardNumber: string): SavedCard["brand"] {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

function toSavedCard(raw: RawPaymentMethod): SavedCard {
  const brand = (raw.brand as SavedCard["brand"]) || "unknown";
  const month = String(raw.exp_month).padStart(2, "0");
  const year = String(raw.exp_year).slice(-2);

  return {
    id: String(raw.id),
    brand: ["visa", "mastercard", "amex"].includes(brand) ? brand : "unknown",
    last4: raw.last4,
    expiryLabel: `${month}/${year}`,
    isDefault: !!raw.is_default,
  };
}

function toPaymentResult(
  raw: RawPayment | undefined,
  fallbackMessage: string,
): PaymentResult {
  const status = String(raw?.payment_status || raw?.status || "").toUpperCase();

  if (status === "COMPLETED") {
    return { status: "completed", reference: raw?.gateway_reference };
  }
  if (["FAILED", "DECLINED", "CANCELLED"].includes(status)) {
    return {
      status: "failed",
      message: raw?.failure_reason || "Card payment failed.",
    };
  }
  return { status: "processing", message: fallbackMessage };
}

/**
 * Passenger payment boundary.
 *
 * Backed by the mock gateway until a real processor (PayHere/HNB) is wired up
 * server-side - see PaymentGatewayServiceProvider. Screens should not call
 * any gateway directly; everything goes through the backend so the double-
 * entry ledger stays the single source of truth for what was actually paid.
 */
export const paymentService = {
  async getCapabilities(): Promise<PaymentCapabilities> {
    const response = await apiClient.get<PaymentCapabilities>(
      "/payment-capabilities",
    );

    if (!response.success || !response.data) {
      return {
        cash: true,
        card: false,
        wallet: false,
        gateway: "unavailable",
        environment: "unknown",
      };
    }

    return response.data;
  },

  async prepareWebxpayCheckout(rideId: string): Promise<{
    success: boolean;
    message?: string;
    checkout?: WebxpayCheckout;
  }> {
    const response = await apiClient.post<RawWebxpayCheckout>(
      `/rides/${rideId}/payments/webxpay/checkout`,
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        message:
          response.message || "Could not prepare the secure WEBXPAY checkout.",
      };
    }

    const raw = response.data;

    return {
      success: true,
      message: response.message,
      checkout: {
        paymentId: raw.payment_id,
        attemptId: raw.attempt_id,
        merchantOrderId: raw.merchant_order_id,
        amount: raw.amount,
        currency: "LKR",
        checkoutUrl: raw.checkout_url,
        expiresAt: raw.expires_at,
      },
    };
  },

  async listCards(): Promise<SavedCard[]> {
    const webxpay = await apiClient.get<RawPaymentMethod[]>(
      "/payment-methods/webxpay",
    );

    if (webxpay.success && webxpay.data) {
      return webxpay.data.map(toSavedCard);
    }

    const legacy = await apiClient.get<RawPaymentMethod[]>("/payment-methods");
    if (!legacy.success || !legacy.data) return [];

    return legacy.data.map(toSavedCard);
  },

  async startWebxpaySavedCardPayment(
    rideId: string,
    attemptId: number,
    cardId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    payment?: WebxpaySavedCardPayment;
  }> {
    const response = await apiClient.post<RawWebxpaySavedCardPayment>(
      `/rides/${rideId}/payments/webxpay/attempts/${attemptId}/saved-card`,
      { payment_method_id: Number(cardId) },
      {
        headers: {
          "Idempotency-Key": `webxpay-token-attempt-${attemptId}-card-${cardId}`,
        },
      },
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        message: response.message || "Could not start saved-card payment.",
      };
    }

    return {
      success: true,
      message: response.message,
      payment: {
        rideId: response.data.ride_id,
        paymentId: response.data.payment_id,
        attemptId: response.data.attempt_id,
        operationId: response.data.operation_id,
        paymentStatus: response.data.payment_status,
        requiresThreeDs: response.data.requires_3ds,
        threeDsUrl: response.data.three_ds_url,
      },
    };
  },

  async listWebxpayCards(): Promise<SavedCard[]> {
    const response = await apiClient.get<RawPaymentMethod[]>(
      "/payment-methods/webxpay",
    );

    if (!response.success || !response.data) return [];

    return response.data.map(toSavedCard);
  },

  async prepareWebxpayCardSetup(): Promise<{
    success: boolean;
    message?: string;
    setup?: WebxpayCardSetup;
  }> {
    const response = await apiClient.post<RawWebxpayCardSetup>(
      "/payment-methods/webxpay/setup",
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        message: response.message || "Could not prepare secure card setup.",
      };
    }

    return {
      success: true,
      message: response.message,
      setup: {
        operationId: response.data.operation_id,
        setupUrl: response.data.setup_url,
        expiresAt: response.data.expires_at,
      },
    };
  },

  async getCard(cardId: string): Promise<SavedCard | null> {
    const cards = await this.listCards();

    return cards.find((card) => card.id === cardId) || null;
  },

  /**
   * TEST-MODE card entry. This posts the raw number to our backend, which
   * tokenizes it (via the mock gateway right now) and discards everything
   * except the token and last4 - see PassengerPaymentMethodController::store.
   * This is NOT the intended production posture (a bank-hosted form that
   * never sends the PAN to us at all); it exists so the card ledger path can
   * be exercised without a live gateway.
   */
  async saveCard(
    input: NewCardInput,
  ): Promise<{ success: boolean; message?: string; card?: SavedCard }> {
    const response = await apiClient.post<RawPaymentMethod>(
      "/payment-methods",
      {
        number: input.number.replace(/\s/g, ""),
        exp_month: input.expMonth,
        exp_year: input.expYear,
        cvv: input.cvv,
        brand: detectBrand(input.number),
        is_default: input.isDefault,
      },
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        message: response.message || "Could not save this card.",
      };
    }

    return { success: true, card: toSavedCard(response.data) };
  },

  async setDefaultCard(cardId: string): Promise<boolean> {
    const response = await apiClient.post(`/payment-methods/${cardId}/default`);
    return response.success;
  },

  async deleteCard(cardId: string): Promise<boolean> {
    const response = await apiClient.delete(
      `/payment-methods/webxpay/${cardId}`,
    );
    return response.success;
  },

  async removeCard(cardId: string): Promise<boolean> {
    return this.deleteCard(cardId);
  },

  /**
   * Confirms payment for a completed ride. Safe to call even if the driver
   * app already triggered it (POST /payments/{ride} returns the existing
   * payment instead of charging twice).
   */
  async beginRidePayment(
    rideId: string,
    _amount: number,
  ): Promise<PaymentResult> {
    const response = await apiClient.post<RawPayment>(`/payments/${rideId}`);

    if (!response.success) {
      // 402 = card declined/errored server-side; anything else is unexpected.
      return {
        status: "failed",
        message: response.message || "Card payment failed. Please try again.",
      };
    }

    return toPaymentResult(response.data, "Waiting for payment confirmation.");
  },

  async getPaymentResult(rideId: string): Promise<PaymentResult> {
    const response = await apiClient.get<RawTrustedPaymentStatus>(
      `/rides/${rideId}/payment`,
    );

    if (!response.success) {
      return {
        status: "processing",
        message: "Waiting for secure payment confirmation.",
      };
    }

    return toPaymentResult(
      response.data?.payment || undefined,
      "Waiting for secure payment confirmation.",
    );
  },

  async listOutstandingPayments(): Promise<OutstandingPayment[]> {
    return [];
  },
};
