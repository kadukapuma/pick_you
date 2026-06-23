import { apiClient } from "../api/apiClient";
import { API_CONFIG, API_ENDPOINTS } from "../api/config";
import { StorageService, StoredUser } from "./storageService";

export interface PassengerProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  profileImage: string | null;
  walletBalance: number | null;
}

export interface ProfileServiceResponse {
  success: boolean;
  data?: PassengerProfile;
  message?: string;
}

export interface UpdatePassengerProfilePayload {
  firstName: string;
  lastName: string;
  email?: string | null;
}

function mapUserToProfile(user: any): PassengerProfile {
  return {
    id: Number(user?.id || 0),
    firstName: String(user?.first_name ?? user?.firstName ?? ""),
    lastName: String(user?.last_name ?? user?.lastName ?? ""),
    email: user?.email ? String(user.email) : null,
    phone: String(user?.phone || ""),
    profileImage: user?.profile_picture
      ? String(user.profile_picture)
      : user?.profileImage
        ? String(user.profileImage)
        : null,
    walletBalance:
      user?.wallet_balance !== undefined && user?.wallet_balance !== null
        ? Number(user.wallet_balance)
        : null,
  };
}

async function syncStoredUser(profile: PassengerProfile): Promise<void> {
  const existingUser = await StorageService.getUser();
  if (!existingUser) {
    return;
  }

  await StorageService.saveUser({
    ...existingUser,
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email ?? "",
    phone: profile.phone,
    profile_picture_path: profile.profileImage ?? undefined,
  });
}

export class ProfileService {
  static async getProfile(): Promise<ProfileServiceResponse> {
    try {
      const response = await apiClient.get<any>(
        API_ENDPOINTS.PASSENGER.PROFILE,
      );

      if (response.success && response.data) {
        const mappedProfile = mapUserToProfile(response.data);
        await syncStoredUser(mappedProfile);

        return {
          success: true,
          data: mappedProfile,
          message: response.message,
        };
      }

      const localUser = await StorageService.getUser();
      if (localUser) {
        return {
          success: true,
          data: mapUserToProfile(localUser),
          message: "Loaded from local storage",
        };
      }

      return {
        success: false,
        message: response.message || "Failed to load profile",
      };
    } catch (error: any) {
      const localUser = await StorageService.getUser();

      if (localUser) {
        return {
          success: true,
          data: mapUserToProfile(localUser),
          message: "Loaded from local storage",
        };
      }

      return {
        success: false,
        message: error?.message || "Failed to load profile",
      };
    }
  }

  static async updateProfile(
    payload: UpdatePassengerProfilePayload,
  ): Promise<ProfileServiceResponse> {
    try {
      const response = await apiClient.put<any>(
        API_ENDPOINTS.PASSENGER.UPDATE_PROFILE,
        {
          first_name: payload.firstName,
          last_name: payload.lastName,
          email:
            payload.email && payload.email.trim().length > 0
              ? payload.email
              : null,
        },
      );

      if (response.success && response.data) {
        const mappedProfile = mapUserToProfile(response.data);
        await syncStoredUser(mappedProfile);

        return {
          success: true,
          data: mappedProfile,
          message: response.message || "Profile updated successfully",
        };
      }

      return {
        success: false,
        message: response.message || "Failed to update profile",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update profile",
      };
    }
  }

  static async uploadProfilePicture(
    imageUri: string,
  ): Promise<ProfileServiceResponse> {
    try {
      const token = await StorageService.getToken();
      const formData = new FormData();

      formData.append("profile_picture", {
        uri: imageUri,
        name: `passenger_profile_${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PASSENGER.PROFILE_PICTURE}`,
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
          message: payload?.message || "Failed to upload profile picture",
        };
      }

      const profileData = payload?.data ?? payload;
      const mappedProfile = mapUserToProfile(profileData);
      await syncStoredUser(mappedProfile);

      return {
        success: true,
        data: mappedProfile,
        message: payload?.message || "Profile picture updated successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to upload profile picture",
      };
    }
  }

  static fromStoredUser(user: StoredUser): PassengerProfile {
    return mapUserToProfile(user);
  }
}
