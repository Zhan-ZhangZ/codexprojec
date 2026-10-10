import os from "node:os";
import path from "node:path";

// Cache the models.dev catalog in the OS temp dir so the package stays
// self-contained and coupled to nothing.
export function cacheDir(): string {
  return path.join(os.tmpdir(), "openlive-model-catalog");
}
