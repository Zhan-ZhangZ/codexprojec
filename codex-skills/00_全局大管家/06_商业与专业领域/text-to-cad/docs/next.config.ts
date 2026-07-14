import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..");
const cadJsPackageRoot = path.join(repoRoot, "packages/cadjs/src");
const docsThreeRoot = "./node_modules/three";
const docsThreeExamplesRoot = "./node_modules/three/examples";
const docsGltfLoader =
  "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "www.skills.sh",
        protocol: "https",
      },
    ],
  },
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      "cadjs": cadJsPackageRoot,
      three: docsThreeRoot,
      "three/examples": docsThreeExamplesRoot,
      "three/examples/jsm/loaders/GLTFLoader.js": docsGltfLoader,
    },
  },
};

export default nextConfig;
