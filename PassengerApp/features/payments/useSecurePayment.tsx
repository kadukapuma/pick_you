import { useCallback, useEffect, useRef, useState } from "react";
import SecurePaymentModal from "./SecurePaymentModal";
import type { SecurePaymentSession } from "./securePaymentNavigation";

export function useSecurePayment() {
  const [session, setSession] = useState<SecurePaymentSession | null>(null);
  const pending = useRef<((url: string | null) => void) | null>(null);
  const open = useCallback((next: SecurePaymentSession) => {
    if (pending.current) return Promise.reject(new Error("Verification is already open."));
    return new Promise<string | null>(resolve => {
      pending.current = resolve;
      setSession(next);
    });
  }, []);
  const finish = useCallback((url: string | null) => {
    const resolve = pending.current;
    pending.current = null;
    setSession(null);
    resolve?.(url);
  }, []);
  useEffect(() => () => {
    pending.current?.(null);
    pending.current = null;
  }, []);
  return {
    open,
    modal: session ? <SecurePaymentModal session={session} onFinish={finish} /> : null,
  };
}