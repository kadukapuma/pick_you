import { API_CONFIG } from "./config";

const API_ORIGIN = API_CONFIG.BASE_URL.replace(/\/api\/?$/, "");

export function resolveAssetUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = String(value).trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.pathname.startsWith("/storage/") ||
        parsed.pathname.startsWith("/uploads/")
      ) {
        return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }

    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalizedPath =
    path.startsWith("/storage/") || path.startsWith("/uploads/")
      ? path
      : `/storage${path}`;

  return `${API_ORIGIN}${normalizedPath}`;
}
