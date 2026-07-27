export const paymentTheme = {
  green: "#059669",
  deepGreen: "#064E3B",
  mint: "#ECFDF5",
  ink: "#10231D",
  muted: "#64748B",
  line: "#E2E8F0",
  background: "#F5FAF8",
  danger: "#DC2626",
  warning: "#D97706",
  white: "#FFFFFF",
};

export function formatLkr(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return `LKR ${Number.isFinite(amount) ? amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : "0.00"}`;
}

