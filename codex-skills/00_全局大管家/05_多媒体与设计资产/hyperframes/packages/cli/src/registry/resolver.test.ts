import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { RegistryItem, RegistryManifest } from "@hyperframes/core";
import { listRegistryItems, loadAllItems, resolveItem } from "./resolver.js";

const MANIFEST: RegistryManifest = {
  $schema: "https://hyperframes.heygen.com/schema/registry.json",
  name: "test",
  homepage: "https://example.com",
  items: [
    { name: "alpha", type: "hyperframes:example" },
    { name: "beta", type: "hyperframes:example" },
    { name: "gamma", type: "hyperframes:block" },
  ],
};

function buildItem(name: string, type: "hyperframes:example" | "hyperframes:block"): RegistryItem {
  if (type === "hyperframes:example") {
    return {
      name,
      type,
      title: name.toUpperCase(),
      description: `${name} desc`,
      dimensions: { width: 1920, height: 1080 },
      duration: 10,
      files: [{ path: "index.html", target: "index.html", type: "hyperframes:composition" }],
    };
  }
  return {
    name,
    type,
    title: name.toUpperCase(),
    description: `${name} desc`,
    dimensions: { width: 1080, height: 1350 },
    duration: 6,
    files: [
      {
        path: `${name}.html`,
        target: `compositions/${name}.html`,
        type: "hyperframes:composition",
      },
    ],
  };
}

function mockFetch(overrides: Record<string, unknown> = {}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (urlInput: string | URL) => {
      const url = typeof urlInput === "string" ? urlInput : urlInput.toString();
      if (url.endsWith("/registry.json") && !overrides.registryFails) {
        return new Response(JSON.stringify(MANIFEST), { status: 200 });
      }
      const m = /\/(examples|blocks|components)\/([^/]+)\/registry-item\.json$/.exec(url);
      if (m && !(overrides.missing as string[] | undefined)?.includes(m[2]!)) {
        const type = m[1] === "examples" ? "hyperframes:example" : "hyperframes:block";
        return new Response(JSON.stringify(buildItem(m[2]!, type)), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

function uniqueBaseUrl(): string {
  // Unique per-test so the 24h on-disk cache doesn't pollute sibling tests.
  return `https://test.invalid/${crypto.randomUUID()}`;
}

describe("registry resolver", () => {
  beforeEach(() => mockFetch());
  afterEach(() => vi.unstubAllGlobals());

  describe("listRegistryItems", () => {
    it("returns all items when no filter is given", async () => {
      const items = await listRegistryItems(undefined, { baseUrl: uniqueBaseUrl() });
      expect(items.map((i) => i.name)).toEqual(["alpha", "beta", "gamma"]);
    });

    it("filters by type", async () => {
      const baseUrl = uniqueBaseUrl();
      const examples = await listRegistryItems({ type: "hyperframes:example" }, { baseUrl });
      expect(examples.map((i) => i.name)).toEqual(["alpha", "beta"]);

      const blocks = await listRegistryItems({ type: "hyperframes:block" }, { baseUrl });
      expect(blocks.map((i) => i.name)).toEqual(["gamma"]);
    });

    it("returns empty on unreachable registry", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("oops", { status: 500 })),
      );
      const items = await listRegistryItems(undefined, { baseUrl: uniqueBaseUrl() });
      expect(items).toEqual([]);
    });
  });

  describe("loadAllItems", () => {
    it("loads manifests in parallel", async () => {
      const baseUrl = uniqueBaseUrl();
      const entries = await listRegistryItems(undefined, { baseUrl });
      const items = await loadAllItems(entries, { baseUrl });
      expect(items.map((i) => i.name).sort()).toEqual(["alpha", "beta", "gamma"]);
      expect(items.find((i) => i.name === "alpha")?.title).toBe("ALPHA");
    });

    it("skips items whose manifest fails to load (warning, not failure)", async () => {
      mockFetch({ missing: ["beta"] });
      const baseUrl = uniqueBaseUrl();
      const warnings: string[] = [];
      const entries = await listRegistryItems(undefined, { baseUrl });
      const items = await loadAllItems(entries, { baseUrl, onWarn: (m) => warnings.push(m) });
      expect(items.map((i) => i.name).sort()).toEqual(["alpha", "gamma"]);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("beta"))).toBe(true);
    });
  });

  describe("resolveItem", () => {
    it("returns the full manifest for a known item", async () => {
      const baseUrl = uniqueBaseUrl();
      const item = await resolveItem("alpha", { baseUrl });
      expect(item.name).toBe("alpha");
      expect(item.type).toBe("hyperframes:example");
      expect(item.files).toHaveLength(1);
    });

    it("throws with an `Available:` list when the name is unknown", async () => {
      const baseUrl = uniqueBaseUrl();
      await expect(resolveItem("nonexistent", { baseUrl })).rejects.toThrow(
        /Available: alpha, beta, gamma/,
      );
    });

    it("throws a clear message when the registry itself is unreachable", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("down", { status: 500 })),
      );
      const baseUrl = uniqueBaseUrl();
      await expect(resolveItem("alpha", { baseUrl })).rejects.toThrow(/unreachable/);
    });
  });
});
