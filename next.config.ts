import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@electric-sql/pglite-pgvector",
    "pdf-parse",
  ],
  turbopack: { root: process.cwd() },
};
export default config;
