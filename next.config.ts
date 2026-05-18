import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:locale(en|ar)/companies",
        destination: "/:locale/sales-plan",
        permanent: false,
      },
      {
        source: "/:locale(en|ar)/calculator",
        destination: "/:locale/service-architecture/commercial-pricing",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
