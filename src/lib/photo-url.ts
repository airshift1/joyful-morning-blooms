const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function productPhotoUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/product-photos/${path}`;
}

export function reviewPhotoUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/review-photos/${path}`;
}
