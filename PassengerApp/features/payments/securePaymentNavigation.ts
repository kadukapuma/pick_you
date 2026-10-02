export type SecurePaymentSession = {
  url: string;
  returnPath: "card-result" | "result";
  reference: string;
};

export function isExpectedPaymentReturn(url: string, session: SecurePaymentSession): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "picku:" && parsed.hostname === "payments" &&
      parsed.pathname === `/${session.returnPath}` &&
      parsed.searchParams.get(session.returnPath === "card-result" ? "operation_id" : "ride_id") === session.reference;
  } catch {
    return false;
  }
}

export function isSecurePaymentPage(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}