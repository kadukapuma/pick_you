export type Promotion = {
  id: string;
  imageUrl: string | null;
  title: string;
  description: string;
  buttonLabel: string;
  /** Route path (e.g. "/ride-booking") or absolute URL to open on press */
  actionUrl: string | null;
};

export type PromotionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };
