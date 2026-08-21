import { apiClient } from "../api/client";
import { resolveAssetUrl } from "../api/assetUrl";
import { API_ENDPOINTS } from "../api/config";
import type { Promotion, PromotionResult } from "./promotionTypes";

type RawPromotion = {
  id: number | string;
  image?: string | null;
  image_url?: string | null;
  title?: string;
  description?: string;
  button_label?: string;
  action_url?: string | null;
};

const mapPromotion = (raw: RawPromotion): Promotion => ({
  id: String(raw.id),
  imageUrl: resolveAssetUrl(raw.image_url || raw.image),
  title: raw.title || "",
  description: raw.description || "",
  buttonLabel: raw.button_label || "View",
  actionUrl: raw.action_url || null,
});

export const promotionService = {
  async getActive(): Promise<PromotionResult<Promotion[]>> {
    const response = await apiClient.get<RawPromotion[]>(
      API_ENDPOINTS.PROMOTIONS.LIST,
      { suppressErrorLog: true },
    );

    if (!response.success || !response.data) {
      return { success: false, message: response.message || "Unable to load promotions" };
    }

    return { success: true, data: response.data.map(mapPromotion) };
  },
};
