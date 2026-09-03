#!/usr/bin/env node

"use strict";

const { RUNTIME_CONTRACT } = require("./ensure-runtime.cjs");

const REQUIRED_STUDIO_CAPABILITIES = RUNTIME_CONTRACT.studioCapabilities;
const REQUIRED_MARKERS = [
  "data-studio-extension-view",
  "data-koubo-cut-timeline",
  "data-managed-timeline-editing",
];
const CAPABILITY_PATH = "/chengfeng-videocut-capabilities.json";
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_ASSETS = 8;
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const PRODUCT_PORT = "5190";
const DEVELOPMENT_STUDIO_PORT = "5400";

function isLoopbackHost(hostname) {
  const value = String(hostname || "").toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "::1" || value === "[::1]";
}

function assertSafeStudioUrl(url, label) {
  if (!/^https?:$/.test(url.protocol)) throw new Error(`${label} 只允许 http/https`);
  if (url.username || url.password) throw new Error(`${label} 禁止包含 URL 凭据`);
  if (!isLoopbackHost(url.hostname)) throw new Error(`${label} 只允许本机 loopback 地址`);
  if (url.pathname !== "/") throw new Error(`${label} 只允许根路径 /`);
}

function parseArgs(argv) {
  const options = { json: false, view: "koubo" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (["--url", "--studio-origin", "--view"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} 缺少值`);
      }
      options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
      continue;
    }
    throw new Error(`未知参数: ${arg}`);
  }
  if (!options.url) throw new Error("必须提供 --url");
  if (!/^[a-z0-9-]+$/i.test(options.view)) throw new Error("--view 格式无效");
  options.view = options.view.toLowerCase();
  return options;
}

function output(payload, json) {
  const stream = payload.ok || json ? process.stdout : process.stderr;
  stream.write(json ? `${JSON.stringify(payload)}\n` : `${payload.ok ? payload.studio.url : payload.error.message}\n`);
}

function resolveStudioUrl(productUrl, studioOrigin, view) {
  const target = new URL(productUrl);
  assertSafeStudioUrl(target, "Studio URL");

  if (studioOrigin) {
    const origin = new URL(studioOrigin);
    assertSafeStudioUrl(origin, "Studio origin");
    target.protocol = origin.protocol;
    target.username = "";
    target.password = "";
    target.host = origin.host;
    if (origin.pathname && origin.pathname !== "/") target.pathname = origin.pathname;
  }

  target.searchParams.set("view", view);
  return target;
}

async function fetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { accept: "text/html,application/json,text/javascript" },
    });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}

function declaredViews(manifest) {
  const candidates = [
    manifest?.features?.topLevelViews,
    manifest?.studio?.topLevelViews,
    manifest?.topLevelViews,
  ];
  const views = candidates.find(Array.isArray);
  return views ? views.map((value) => String(value).toLowerCase()) : [];
}

function declaredFeatureValues(manifest, name) {
  return [
    manifest?.features?.[name],
    manifest?.studio?.[name],
    manifest?.[name],
  ].filter((value) => value !== undefined);
}

function declaredFeatureArrays(manifest, name) {
  return declaredFeatureValues(manifest, name)
    .filter(Array.isArray)
    .map((values) => values.map((value) => String(value).toLowerCase()));
}

function inspectManifest(manifest, requiredView) {
  if (!manifest || typeof manifest !== "object") return null;
  if (manifest.product !== "chengfeng-videocut") return null;
  if (manifest.schemaVersion !== 1) return null;
  if (typeof manifest.studioVersion !== "string" || !manifest.studioVersion.trim()) return null;
  const views = declaredViews(manifest);
  if (views.length === 0) return null;
  const requestedView = requiredView.toLowerCase();
  const missingRequiredViews = REQUIRED_STUDIO_CAPABILITIES.topLevelViews.filter(
    (view) => !views.includes(view),
  );
  const legacyDeclarations = declaredFeatureValues(manifest, "legacyWorkbenchPanel");
  const timelineDeclarations = declaredFeatureValues(manifest, "managedTimelineEditing");
  const timelineOperationDeclarations = declaredFeatureArrays(manifest, "managedTimelineOperations");
  const legacyDisabled = legacyDeclarations.length > 0 &&
    legacyDeclarations.every((value) => value === REQUIRED_STUDIO_CAPABILITIES.legacyWorkbenchPanel);
  const managedTimelineEditing = timelineDeclarations.length > 0 &&
    timelineDeclarations.every((value) => value === REQUIRED_STUDIO_CAPABILITIES.managedTimelineEditing);
  const managedTimelineOperations = timelineOperationDeclarations.length > 0 &&
    timelineOperationDeclarations.every((operations) =>
      REQUIRED_STUDIO_CAPABILITIES.managedTimelineOperations.every((operation) =>
        operations.includes(operation)));
  const requestedViewPresent = views.includes(requestedView);
  const ok = requestedViewPresent &&
    missingRequiredViews.length === 0 &&
    legacyDisabled &&
    managedTimelineEditing &&
    managedTimelineOperations;
  let reason;
  if (!requestedViewPresent) reason = "required_view_missing";
  else if (missingRequiredViews.length > 0) reason = "required_view_set_missing";
  else if (!legacyDisabled) reason = "legacy_fallback_not_disabled";
  else if (!managedTimelineEditing) reason = "managed_timeline_editing_missing";
  else if (!managedTimelineOperations) reason = "managed_timeline_operations_missing";
  return {
    ok,
    mode: "manifest",
    views,
    studioVersion: manifest.studioVersion,
    managedTimelineEditing,
    managedTimelineOperations,
    missingRequiredViews,
    reason: ok ? undefined : reason,
  };
}

function scriptSources(html, baseUrl) {
  const sources = [];
  const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.origin === baseUrl.origin && !sources.includes(url.href)) sources.push(url.href);
    } catch {
      // Ignore malformed script URLs; another valid module may still provide the marker.
    }
  }
  return sources.slice(0, MAX_ASSETS);
}

async function inspectStudio(studioUrl, requiredView, options = {}) {
  const base = new URL(studioUrl);
  base.hash = "";
  base.search = "";
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  try {
    assertSafeStudioUrl(base, "Studio URL");
  } catch (error) {
    return { ok: false, mode: "unsafe-url", origin: base.origin, reason: "unsafe_studio_url", detail: error.message };
  }

  let page;
  try {
    page = await fetchText(base, timeoutMs);
  } catch (error) {
    return {
      ok: false,
      mode: "unreachable",
      origin: base.origin,
      reason: "studio_unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!page.response.ok) {
    return { ok: false, mode: "http", origin: base.origin, reason: `studio_http_${page.response.status}` };
  }

  try {
    const manifestUrl = new URL(CAPABILITY_PATH, base);
    const { response, text } = await fetchText(manifestUrl, timeoutMs);
    if (response.ok && text.trim().startsWith("{")) {
      try {
        const result = inspectManifest(JSON.parse(text), requiredView);
        if (result) return { ...result, origin: base.origin, page: base.href, source: manifestUrl.href };
      } catch {
        // A SPA may return non-manifest JSON. Fall through to the development marker check.
      }
    }
  } catch {
    // Capability manifests are optional during the local migration.
  }

  if (!options.allowBundleMarker) {
    return {
      ok: false,
      mode: "manifest-required",
      origin: base.origin,
      reason: "capability_manifest_missing",
    };
  }

  const sources = scriptSources(page.text, base);
  let bundle = page.text;
  const inspectedAssets = [];
  for (const source of sources) {
    try {
      const asset = await fetchText(source, timeoutMs);
      if (!asset.response.ok || Buffer.byteLength(asset.text) > MAX_ASSET_BYTES) continue;
      bundle += `\n${asset.text}`;
      inspectedAssets.push(source);
      if (REQUIRED_MARKERS.every((marker) => bundle.includes(marker))) break;
    } catch {
      // Keep checking the remaining same-origin entry assets.
    }
  }

  const missingMarkers = REQUIRED_MARKERS.filter((marker) => !bundle.includes(marker));
  const supportedViews = missingMarkers.length === 0 ? ["koubo"] : [];
  return {
    ok: supportedViews.includes(requiredView),
    mode: "bundle-marker",
    origin: base.origin,
    views: supportedViews,
    managedTimelineEditing: missingMarkers.length === 0,
    source: inspectedAssets,
    reason: missingMarkers.length > 0 ? "top_level_koubo_view_missing" : "required_view_missing",
    missingMarkers,
  };
}

async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    output({ ok: false, error: { code: "invalid_argument", message: error.message } }, argv.includes("--json"));
    return 2;
  }

  let target;
  try {
    const explicitStudioOrigin = options.studioOrigin || process.env.CHENGFENG_VIDEOCUT_STUDIO_ORIGIN;
    const productTarget = new URL(options.url);
    if (productTarget.port !== PRODUCT_PORT) {
      throw new Error(`产品 Studio 只允许端口 ${PRODUCT_PORT}`);
    }
    if (explicitStudioOrigin) {
      const developmentTarget = new URL(explicitStudioOrigin);
      if (developmentTarget.port !== DEVELOPMENT_STUDIO_PORT) {
        throw new Error(`开发 Studio 覆盖只允许端口 ${DEVELOPMENT_STUDIO_PORT}`);
      }
    }
    target = resolveStudioUrl(
      options.url,
      explicitStudioOrigin,
      options.view,
    );
    options.allowBundleMarker = Boolean(explicitStudioOrigin) && target.port === DEVELOPMENT_STUDIO_PORT;
  } catch (error) {
    output({ ok: false, error: { code: "invalid_studio_url", message: error.message } }, options.json);
    return 2;
  }

  const capability = await inspectStudio(target.href, options.view, {
    allowBundleMarker: options.allowBundleMarker,
  });
  if (!capability.ok) {
    output({
      ok: false,
      error: {
        code: "studio_capability_missing",
        message: `当前 Studio 不满足 ${RUNTIME_CONTRACT.releaseTag} 的视图与可编辑时间线合同；已阻止打开旧版界面。`,
        details: capability,
      },
    }, options.json);
    return 20;
  }

  output({
    ok: true,
    studio: {
      url: target.href,
      origin: target.origin,
      requiredView: options.view,
      verificationMode: capability.mode,
      views: capability.views,
      studioVersion: capability.studioVersion || null,
      managedTimelineEditing: capability.managedTimelineEditing === true,
      managedTimelineOperations: capability.managedTimelineOperations === true,
    },
  }, options.json);
  return 0;
}

module.exports = {
  CAPABILITY_PATH,
  REQUIRED_MARKERS,
  REQUIRED_STUDIO_CAPABILITIES,
  assertSafeStudioUrl,
  declaredFeatureValues,
  declaredFeatureArrays,
  declaredViews,
  inspectManifest,
  inspectStudio,
  isLoopbackHost,
  main,
  resolveStudioUrl,
  scriptSources,
};

if (require.main === module) {
  main().then((code) => { process.exitCode = code; });
}
