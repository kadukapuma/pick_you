import React, { createContext, useCallback, useContext, useState } from "react";
import Toast, { ToastType } from "../components/ui/Toast";

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        message: "",
        type: "info",
    });

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        // Reset then show (allows rapid successive toasts)
        setToast({ visible: false, message: "", type });
        setTimeout(() => setToast({ visible: true, message, type }), 50);
    }, []);

    const hide = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hide}
            />
        </ToastContext.Provider>
    );
}

export function useToastContext(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToastContext must be used within ToastProvider");
    return ctx;
}
