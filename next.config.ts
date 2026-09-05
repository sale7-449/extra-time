import type { NextConfig } from "next";
import { REMOTE_IMAGE_HOSTS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: REMOTE_IMAGE_HOSTS.map(({ hostname }) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default nextConfig;
