import type { NextConfig } from "next";

const storageBaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const storageImagePattern = storageBaseUrl
  ? (() => {
      const url = new URL(storageBaseUrl);
      return {
        protocol: url.protocol.slice(0, -1) as "http" | "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/api/storage/**",
      } satisfies NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];
    })()
  : null;

const nextConfig: NextConfig = {
  images: {
    // Placeholder artwork is local SVG; keep it sandboxed.
    remotePatterns: storageImagePattern ? [storageImagePattern] : [],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
};

export default nextConfig;
