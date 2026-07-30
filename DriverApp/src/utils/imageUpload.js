import { Platform } from "react-native";

const MIME_EXTENSION = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};

export const imageAssetToFormFile = (asset, fallbackName = "image") => {
  const uri = asset?.uri;
  if (!uri) return null;

  const type = asset.mimeType || "image/jpeg";
  const fallbackExtension = MIME_EXTENSION[type] || "jpg";
  const rawName = asset.fileName || uri.split("/").pop() || `${fallbackName}.${fallbackExtension}`;
  const cleanName = rawName.split("?")[0];
  const name = cleanName.includes(".")
    ? cleanName
    : `${cleanName}.${fallbackExtension}`;

  return {
    uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
    name,
    type,
  };
};
