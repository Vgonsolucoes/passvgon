const DEFAULT_CORS_ORIGIN = process.env.APP_ENV === "production" ? process.env.NEXTAUTH_URL ?? "*" : "*";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: []
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    },
    serverComponentsExternalPackages: ["@node-rs/argon2", "bcryptjs", "otplib"]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignora pacotes nativos opcionais ausentes do @node-rs/argon2 (plataformas não usadas)
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "@node-rs/argon2-openharmony-arm64": false,
        "@node-rs/argon2-openharmony-x64": false,
        "@node-rs/argon2-openharmony-arm": false,
        "@node-rs/argon2-wasm32-wasi": false,
        "@node-rs/argon2-android-arm-eabi": false,
        "@node-rs/argon2-android-arm64": false,
        "@node-rs/argon2-android-x64": false,
        "@node-rs/argon2-darwin-x64": false,
        "@node-rs/argon2-darwin-arm64": false,
        "@node-rs/argon2-freebsd-x64": false,
        "@node-rs/argon2-linux-arm-gnueabihf": false,
        "@node-rs/argon2-linux-arm64-gnu": false,
        "@node-rs/argon2-linux-x64-gnu": false
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Access-Control-Allow-Origin", value: DEFAULT_CORS_ORIGIN },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
          },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Max-Age", value: "86400" }
        ]
      }
    ];
  },
  async rewrites() {
    return [];
  }
};

export default nextConfig;
