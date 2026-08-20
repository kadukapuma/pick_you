import { apiClient } from "../api/client";
import { resolveAssetUrl } from "../api/assetUrl";
import { API_CONFIG, API_ENDPOINTS } from "../api/config";
import { StorageService } from "./authStorage";

export type StudentVerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface StudentVerificationDetails {
  status: StudentVerificationStatus;
  universityName: string | null;
  cardFront: string | null;
  cardBack: string | null;
  rejectionReason: string | null;
}

export interface StudentVerificationResponse {
  success: boolean;
  data?: StudentVerificationDetails;
  message?: string;
}

function mapVerification(data: any): StudentVerificationDetails {
  return {
    status: (data?.status as StudentVerificationStatus) || "none",
    universityName: data?.university_name ?? null,
    cardFront: resolveAssetUrl(data?.card_front ?? null),
    cardBack: resolveAssetUrl(data?.card_back ?? null),
    rejectionReason: data?.rejection_reason ?? null,
  };
}

export class StudentVerificationService {
  static async getStatus(): Promise<StudentVerificationResponse> {
    try {
      const response = await apiClient.get<any>(
        API_ENDPOINTS.PASSENGER.STUDENT_VERIFICATION,
      );

      if (response.success) {
        return {
          success: true,
          data: mapVerification(response.data),
          message: response.message,
        };
      }

      return {
        success: false,
        message: response.message || "Failed to load student verification status",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to load student verification status",
      };
    }
  }

  static async submit(
    universityName: string,
    cardFrontUri: string,
    cardBackUri: string,
  ): Promise<StudentVerificationResponse> {
    try {
      const token = await StorageService.getToken();
      const formData = new FormData();
      formData.append("university_name", universityName);
      formData.append("card_front", {
        uri: cardFrontUri,
        name: `student-card-front-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);
      formData.append("card_back", {
        uri: cardBackUri,
        name: `student-card-back-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PASSENGER.STUDENT_VERIFICATION}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: payload?.message || "Failed to submit student application",
        };
      }

      return {
        success: true,
        data: mapVerification(payload?.data ?? payload),
        message: payload?.message || "Student application submitted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to submit student application",
      };
    }
  }
}
