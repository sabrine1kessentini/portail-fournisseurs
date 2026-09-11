import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  // Le moteur Prisma (.so.node) n'est jamais importé statiquement (résolu au
  // runtime selon la plateforme) : le traceur de fichiers de Next ne le
  // détecte pas seul, il faut l'inclure explicitement pour qu'il soit
  // embarqué dans la fonction serverless Vercel.
  outputFileTracingIncludes: {
    "/**": ["./lib/generated/prisma/*.node"],
  },
};

export default nextConfig;
