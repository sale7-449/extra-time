import type { MediaItem } from "@/lib/types";

export interface MediaProvider {
  getLatestMedia(limit: number): Promise<MediaItem[]>;
}
