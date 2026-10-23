import { COMMUNITY_POST_IMAGE_BUCKET } from "@/features/account/constants";

export function isValidAdminPlaceImageUrl(imageUrl: string, userId: string): boolean {
  try {
    const url = new URL(imageUrl);
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    if (!baseUrl || url.origin !== new URL(baseUrl).origin) return false;

    const prefix = `/api/storage/buckets/${COMMUNITY_POST_IMAGE_BUCKET}/objects/${userId}/places/`;
    if (!url.pathname.startsWith(prefix)) return false;

    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    return key.length > 0 && !key.includes("/");
  } catch {
    return false;
  }
}
