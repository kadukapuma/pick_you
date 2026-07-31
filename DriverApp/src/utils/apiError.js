const firstValidationMessage = (errors) => {
  if (!errors || typeof errors !== "object") return null;

  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (typeof value === "string" && value) return value;
  }

  return null;
};

export const getApiErrorMessage = (error, fallback) => {
  if (!error?.response) {
    if (error?.code === "ECONNABORTED") {
      return "The request took too long. Please try again.";
    }
    return "Unable to connect to the server. Check your internet connection and try again.";
  }

  const { status, data } = error.response;
  const serverMessage =
    firstValidationMessage(data?.errors) ||
    (typeof data?.message === "string" ? data.message : null);

  if (serverMessage) return serverMessage;
  if (status === 401) return "The email or password you entered is incorrect.";
  if (status === 422) return "Please check the information you entered and try again.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "The server is temporarily unavailable. Please try again later.";

  return fallback;
};

export const getFieldError = (error, field) => {
  const value = error?.response?.data?.errors?.[field];
  if (Array.isArray(value)) return value[0] ? String(value[0]) : "";
  return typeof value === "string" ? value : "";
};
