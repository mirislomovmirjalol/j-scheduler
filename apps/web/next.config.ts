import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Logo files are local, trusted assets (not user-uploaded), so it's
    // safe to opt in to next/image serving SVGs — blocked by default
    // since an untrusted SVG can carry a <script>.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
