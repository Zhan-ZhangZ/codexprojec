#!/usr/bin/env node

import { createInterface } from "node:readline";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { drawioInstallHint, resolveDrawioExecutable } from "./drawio-path.mjs";

const execFileAsync = promisify(execFile);
const SERVER_NAME = "drawio-scientific-illustrator";
const SERVER_VERSION = "1.0.0";
const DRAWIO = resolveDrawioExecutable();
const MAX_XML_BYTES = 12 * 1024 * 1024;
const SUPPORTED_PROTOCOLS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);

const DEFAULT_VERTEX_STYLE =
  "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#1f2937;";
const DEFAULT_EDGE_STYLE =
  "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;";

const tools = [
  {
    name: "drawio_status",
    description: "Check the local draw.io desktop CLI, version, default output directory, and supported operations.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "drawio_create_diagram",
    description:
      "Create an editable uncompressed .drawio file from structured vertices and edges. Use absolute output paths. Supports common scientific-diagram shapes, text, embedded local images, custom draw.io styles, groups/layers, and routed arrows.",
    inputSchema: {
      type: "object",
      required: ["output_path", "vertices"],
      properties: {
        output_path: { type: "string", description: "Absolute .drawio output path." },
        title: { type: "string", default: "Scientific figure" },
        page_name: { type: "string", default: "Figure" },
        canvas: {
          type: "object",
          properties: {
            width: { type: "number", minimum: 100, maximum: 20000, default: 1600 },
            height: { type: "number", minimum: 100, maximum: 20000, default: 1000 },
            background: { type: "string", description: "Hex color such as #ffffff." },
            grid: { type: "boolean", default: true },
          },
          additionalProperties: false,
        },
        layers: {
          type: "array",
          maxItems: 50,
          items: {
            type: "object",
            required: ["id", "name"],
            properties: { id: { type: "string" }, name: { type: "string" } },
            additionalProperties: false,
          },
        },
        vertices: {
          type: "array",
          maxItems: 1000,
          items: {
            type: "object",
            required: ["id", "x", "y", "width", "height"],
            properties: {
              id: { type: "string" },
              label: { type: "string", default: "" },
              shape: {
                type: "string",
                enum: ["rectangle", "rounded", "ellipse", "diamond", "cylinder", "hexagon", "triangle", "parallelogram", "cloud", "text", "image", "group", "swimlane"],
                default: "rounded",
              },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number", exclusiveMinimum: 0 },
              height: { type: "number", exclusiveMinimum: 0 },
              parent: { type: "string", default: "1" },
              style: { type: "string", description: "Full draw.io style override." },
              custom_style: { type: "string", description: "Style entries appended to the generated style." },
              fill_color: { type: "string" },
              stroke_color: { type: "string" },
              font_color: { type: "string" },
              font_size: { type: "number", minimum: 1, maximum: 200 },
              font_style: { type: "integer", minimum: 0, maximum: 7 },
              stroke_width: { type: "number", minimum: 0, maximum: 50 },
              opacity: { type: "number", minimum: 0, maximum: 100 },
              rotation: { type: "number", minimum: -360, maximum: 360 },
              dashed: { type: "boolean" },
              image_path: { type: "string", description: "Absolute local path for an embedded image vertex." },
              locked: { type: "boolean", default: false },
            },
            additionalProperties: false,
          },
        },
        edges: {
          type: "array",
          maxItems: 2000,
          default: [],
          items: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "string" },
              label: { type: "string", default: "" },
              source: { type: "string" },
              target: { type: "string" },
              parent: { type: "string", default: "1" },
              style: { type: "string", description: "Full draw.io edge style override." },
              custom_style: { type: "string" },
              color: { type: "string" },
              width: { type: "number", minimum: 0, maximum: 50 },
              dashed: { type: "boolean" },
              curved: { type: "boolean" },
              animated: { type: "boolean" },
              start_arrow: { type: "string" },
              end_arrow: { type: "string" },
              exit_x: { type: "number", minimum: 0, maximum: 1 },
              exit_y: { type: "number", minimum: 0, maximum: 1 },
              entry_x: { type: "number", minimum: 0, maximum: 1 },
              entry_y: { type: "number", minimum: 0, maximum: 1 },
              source_point: { $ref: "#/$defs/point" },
              target_point: { $ref: "#/$defs/point" },
              waypoints: { type: "array", maxItems: 100, items: { $ref: "#/$defs/point" } },
            },
            additionalProperties: false,
          },
        },
        overwrite: { type: "boolean", default: false },
      },
      $defs: {
        point: {
          type: "object",
          required: ["x", "y"],
          properties: { x: { type: "number" }, y: { type: "number" } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_create_trace_document",
    description:
      "Create a .drawio tracing document with a local PNG/JPEG/SVG reference embedded as a locked, low-opacity background and an editable drawing layer above it. Useful after visually decomposing a static scientific figure.",
    inputSchema: {
      type: "object",
      required: ["reference_path", "output_path"],
      properties: {
        reference_path: { type: "string", description: "Absolute path to a PNG, JPEG, or SVG reference image." },
        output_path: { type: "string", description: "Absolute .drawio output path." },
        opacity: { type: "number", minimum: 1, maximum: 100, default: 25 },
        max_dimension: { type: "number", minimum: 200, maximum: 5000, default: 1600 },
        overwrite: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_write_xml",
    description:
      "Validate and write full uncompressed mxGraph XML to a .drawio file for high-fidelity diagrams that exceed the structured tool's shape vocabulary.",
    inputSchema: {
      type: "object",
      required: ["output_path", "xml"],
      properties: {
        output_path: { type: "string", description: "Absolute .drawio output path." },
        xml: { type: "string", description: "Uncompressed XML beginning with <mxfile>." },
        overwrite: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_validate",
    description: "Validate an existing uncompressed .drawio file and report structural errors, warnings, pages, vertices, and edges.",
    inputSchema: {
      type: "object",
      required: ["input_path"],
      properties: { input_path: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_inspect",
    description: "Inspect an existing .drawio file and return a compact inventory of pages, labels, geometry, styles, vertices, and edges for targeted edits.",
    inputSchema: {
      type: "object",
      required: ["input_path"],
      properties: {
        input_path: { type: "string" },
        max_cells: { type: "integer", minimum: 1, maximum: 1000, default: 200 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_update_cells",
    description:
      "Apply targeted edits to existing cells in an uncompressed .drawio file while preserving the rest of the tuned layout. Update labels, styles, and geometry by cell id after using drawio_inspect.",
    inputSchema: {
      type: "object",
      required: ["input_path", "patches"],
      properties: {
        input_path: { type: "string" },
        output_path: { type: "string", description: "Defaults to input_path for in-place edits." },
        patches: {
          type: "array",
          minItems: 1,
          maxItems: 500,
          items: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              style: { type: "string", description: "Replace the complete style string." },
              style_updates: {
                type: "object",
                description: "Map of draw.io style keys to new values; null removes a key.",
                additionalProperties: { type: ["string", "number", "boolean", "null"] },
              },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number", exclusiveMinimum: 0 },
              height: { type: "number", exclusiveMinimum: 0 },
            },
            additionalProperties: false,
          },
        },
        overwrite: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_export",
    description:
      "Export a .drawio file with the installed draw.io desktop CLI. Preview PNGs should use width=2000 and embed=false; final PNG/SVG/PDF can use embed=true. Embedded PNGs are repaired automatically if draw.io truncates IEND.",
    inputSchema: {
      type: "object",
      required: ["input_path", "format"],
      properties: {
        input_path: { type: "string" },
        format: { type: "string", enum: ["png", "svg", "pdf", "jpg"] },
        output_path: { type: "string" },
        embed: { type: "boolean", default: false },
        scale: { type: "number", minimum: 0.1, maximum: 10 },
        width: { type: "integer", minimum: 100, maximum: 10000 },
        height: { type: "integer", minimum: 100, maximum: 10000 },
        border: { type: "integer", minimum: 0, maximum: 500, default: 10 },
        transparent: { type: "boolean", default: false },
        page_index: { type: "integer", minimum: 0 },
        overwrite: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
  },
  {
    name: "drawio_open",
    description: "Open a .drawio file in the installed draw.io desktop application for manual fine-tuning.",
    inputSchema: {
      type: "object",
      required: ["input_path"],
      properties: { input_path: { type: "string" } },
      additionalProperties: false,
    },
  },
];

function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function toolResult(value, isError = false) {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
    ...(typeof value === "object" && value !== null ? { structuredContent: value } : {}),
    isError,
  };
}

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\r\n", "&#xa;")
    .replaceAll("\n", "&#xa;")
    .replaceAll("\r", "&#xa;");
}

function ensureStyle(style) {
  if (!style) return "";
  return style.endsWith(";") ? style : `${style};`;
}

function setStyle(style, key, value) {
  if (value === undefined || value === null) return style;
  const normalized = ensureStyle(style);
  const re = new RegExp(`(?:^|;)${key}=[^;]*;`);
  const entry = `${key}=${value};`;
  return re.test(normalized) ? normalized.replace(re, (m) => `${m.startsWith(";") ? ";" : ""}${entry}`) : `${normalized}${entry}`;
}

function shapeStyle(shape = "rounded") {
  const common = "whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#1f2937;";
  const shapes = {
    rectangle: `rounded=0;${common}`,
    rounded: `rounded=1;${common}`,
    ellipse: `ellipse;${common}`,
    diamond: `rhombus;${common}`,
    cylinder: `shape=cylinder3;boundedLbl=1;backgroundOutline=1;${common}`,
    hexagon: `shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1;${common}`,
    triangle: `triangle;${common}`,
    parallelogram: `shape=parallelogram;perimeter=parallelogramPerimeter;${common}`,
    cloud: `ellipse;shape=cloud;${common}`,
    text: "text;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;html=1;fontColor=#1f2937;",
    image: "shape=image;verticalLabelPosition=bottom;verticalAlign=top;imageAspect=0;aspect=fixed;html=1;",
    group: "group;pointerEvents=0;",
    swimlane: "swimlane;startSize=30;rounded=0;html=1;whiteSpace=wrap;fillColor=#f5f5f5;strokeColor=#666666;",
  };
  return shapes[shape] || DEFAULT_VERTEX_STYLE;
}

function normalizeOutputPath(filePath, extension = ".drawio") {
  if (!filePath || typeof filePath !== "string") throw new Error("A file path is required.");
  const expanded = filePath.startsWith("~/") || filePath.startsWith("~\\") ? path.join(os.homedir(), filePath.slice(2)) : filePath;
  const resolved = path.resolve(expanded);
  if (extension && path.extname(resolved).toLowerCase() !== extension.toLowerCase()) {
    throw new Error(`Expected a ${extension} path: ${resolved}`);
  }
  return resolved;
}

async function assertWritable(target, overwrite) {
  try {
    await fs.access(target);
    if (!overwrite) throw new Error(`Output already exists; pass overwrite=true to replace it: ${target}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
}

function parseAttributes(tag) {
  const attrs = {};
  const re = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = re.exec(tag))) attrs[match[1]] = match[2] ?? match[3] ?? "";
  return attrs;
}

function decodeXml(value = "") {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setTagAttribute(tag, key, value) {
  const attrRe = new RegExp(`\\s${regexEscape(key)}\\s*=\\s*(?:"[^"]*"|'[^']*')`);
  if (value === undefined) return tag;
  if (value === null) return tag.replace(attrRe, "");
  const encoded = xmlEscape(value);
  if (attrRe.test(tag)) return tag.replace(attrRe, ` ${key}="${encoded}"`);
  return tag.replace(/\s*(\/?>)$/, ` ${key}="${encoded}" $1`);
}

function removeStyle(style, key) {
  const entries = ensureStyle(style).split(";").filter(Boolean);
  return entries.filter((entry) => entry.split("=", 1)[0] !== key).join(";") + (entries.length ? ";" : "");
}

function patchCellBlock(block, patch) {
  const startEnd = block.indexOf(">");
  if (startEnd < 0) throw new Error(`Malformed mxCell '${patch.id}'.`);
  let startTag = block.slice(0, startEnd + 1);
  let remainder = block.slice(startEnd + 1);
  const attrs = parseAttributes(startTag);
  if (patch.label !== undefined) startTag = setTagAttribute(startTag, "value", patch.label);
  let style = patch.style !== undefined ? patch.style : decodeXml(attrs.style || "");
  if (patch.style_updates) {
    for (const [key, value] of Object.entries(patch.style_updates)) {
      style = value === null ? removeStyle(style, key) : setStyle(style, key, typeof value === "boolean" ? (value ? 1 : 0) : value);
    }
  }
  if (patch.style !== undefined || patch.style_updates) startTag = setTagAttribute(startTag, "style", ensureStyle(style));
  let updated = startTag + remainder;
  const geometryUpdates = ["x", "y", "width", "height"].filter((key) => patch[key] !== undefined);
  if (geometryUpdates.length) {
    const geometryRe = /<mxGeometry\b[^>]*>/;
    const geometryMatch = updated.match(geometryRe);
    if (!geometryMatch) throw new Error(`Cell '${patch.id}' has no mxGeometry to update.`);
    let geometryTag = geometryMatch[0];
    for (const key of geometryUpdates) geometryTag = setTagAttribute(geometryTag, key, patch[key]);
    updated = updated.replace(geometryRe, geometryTag);
  }
  return updated;
}

function patchDiagramXml(xml, patches) {
  let updated = xml;
  for (const patch of patches) {
    const id = regexEscape(patch.id);
    const cellRe = new RegExp(`<mxCell\\b(?=[^>]*\\bid\\s*=\\s*(?:"${id}"|'${id}'))[^>]*(?:\\/\\s*>|>[\\s\\S]*?<\\/mxCell>)`, "g");
    const matches = [...updated.matchAll(cellRe)];
    if (matches.length === 0) throw new Error(`Cell id '${patch.id}' was not found.`);
    if (matches.length > 1) throw new Error(`Cell id '${patch.id}' appears more than once; use full XML editing for multi-page duplicate ids.`);
    updated = updated.replace(cellRe, (block) => patchCellBlock(block, patch));
  }
  return updated;
}

function inspectXml(xml) {
  const errors = [];
  const warnings = [];
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) errors.push(`XML exceeds ${MAX_XML_BYTES} bytes.`);
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<mxfile\b/.test(xml)) errors.push("Document must begin with an <mxfile> root element.");
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(xml)) errors.push("XML contains an unescaped ampersand.");
  for (const comment of xml.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (comment[1].includes("--")) errors.push("XML comments may not contain '--'.");
  }

  const tokens = xml.match(/<[^>]+>/g) || [];
  const stack = [];
  const pages = [];
  let currentPage = null;
  let currentCell = null;

  for (const token of tokens) {
    if (/^<\?|^<!/.test(token)) continue;
    const closing = token.match(/^<\/\s*([\w:.-]+)/);
    if (closing) {
      const expected = stack.pop();
      if (!expected || expected.name !== closing[1]) errors.push(`Mismatched closing tag </${closing[1]}>.`);
      if (closing[1] === "mxCell") currentCell = stack.toReversed().find((x) => x.name === "mxCell")?.cell || null;
      if (closing[1] === "diagram") currentPage = null;
      continue;
    }
    const opening = token.match(/^<\s*([\w:.-]+)/);
    if (!opening) continue;
    const name = opening[1];
    const selfClosing = /\/\s*>$/.test(token);
    const attrs = parseAttributes(token);
    const entry = { name };

    if (name === "diagram") {
      currentPage = { id: attrs.id || "", name: decodeXml(attrs.name || ""), cells: [], order: [] };
      pages.push(currentPage);
      if (!currentPage.id) errors.push("Every <diagram> needs a non-empty id attribute.");
    } else if (name === "mxCell" && currentPage) {
      const cell = {
        id: attrs.id,
        value: decodeXml(attrs.value || ""),
        style: attrs.style || "",
        parent: attrs.parent,
        source: attrs.source,
        target: attrs.target,
        vertex: attrs.vertex === "1",
        edge: attrs.edge === "1",
        geometry: null,
        hasSourcePoint: false,
        hasTargetPoint: false,
      };
      currentPage.cells.push(cell);
      currentPage.order.push(cell.id);
      currentCell = cell;
      entry.cell = cell;
    } else if (name === "mxGeometry" && currentCell) {
      currentCell.geometry = {
        x: attrs.x === undefined ? undefined : Number(attrs.x),
        y: attrs.y === undefined ? undefined : Number(attrs.y),
        width: attrs.width === undefined ? undefined : Number(attrs.width),
        height: attrs.height === undefined ? undefined : Number(attrs.height),
        relative: attrs.relative === "1",
      };
    } else if (name === "mxPoint" && currentCell) {
      if (attrs.as === "sourcePoint") currentCell.hasSourcePoint = true;
      if (attrs.as === "targetPoint") currentCell.hasTargetPoint = true;
    }

    if (!selfClosing) stack.push(entry);
    if (selfClosing && name === "mxCell") currentCell = stack.toReversed().find((x) => x.name === "mxCell")?.cell || null;
  }
  if (stack.length) errors.push(`Unclosed XML tags: ${stack.map((x) => x.name).join(", ")}.`);
  if (!pages.length) errors.push("No <diagram> pages found. Compressed draw.io pages are not accepted; save as uncompressed XML.");

  for (const page of pages) {
    const ids = new Set();
    for (const cell of page.cells) {
      if (!cell.id) errors.push(`Page '${page.name || page.id}' has an mxCell without id.`);
      else if (ids.has(cell.id)) errors.push(`Page '${page.name || page.id}' has duplicate id '${cell.id}'.`);
      else ids.add(cell.id);
    }
    if (page.order[0] !== "0" || page.order[1] !== "1") errors.push(`Page '${page.name || page.id}' must start with cells id=0 and id=1.`);
    const root1 = page.cells.find((c) => c.id === "1");
    if (!root1 || root1.parent !== "0") errors.push(`Page '${page.name || page.id}' requires cell id=1 parent=0.`);
    for (const cell of page.cells) {
      if (cell.id !== "0" && cell.parent && !ids.has(cell.parent)) errors.push(`Cell '${cell.id}' has missing parent '${cell.parent}'.`);
      if (cell.vertex && !cell.geometry) errors.push(`Vertex '${cell.id}' is missing mxGeometry.`);
      if (cell.edge) {
        if (!cell.geometry) errors.push(`Edge '${cell.id}' is missing mxGeometry.`);
        const connected = cell.source && cell.target && ids.has(cell.source) && ids.has(cell.target);
        const floating = cell.hasSourcePoint && cell.hasTargetPoint;
        if (!connected && !floating) errors.push(`Edge '${cell.id}' needs valid source/target ids or sourcePoint/targetPoint.`);
      }
    }
    if (!page.cells.some((c) => c.vertex && /fontSize=(?:1[6-9]|[2-9]\d)/.test(c.style))) warnings.push(`Page '${page.name || page.id}' has no obvious title text cell.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      cells: p.cells.length,
      vertices: p.cells.filter((c) => c.vertex).length,
      edges: p.cells.filter((c) => c.edge).length,
    })),
    _pages: pages,
  };
}

async function imageDataUri(imagePath) {
  const resolved = path.resolve(imagePath);
  const data = await fs.readFile(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : null;
  if (!mime) throw new Error(`Unsupported image format '${ext}'. Use PNG, JPEG, or SVG.`);
  return { dataUri: `data:${mime};base64,${data.toString("base64")}`, data, ext };
}

function readImageSize(data, ext) {
  if (ext === ".png" && data.length >= 24 && data.toString("ascii", 1, 4) === "PNG") {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) { offset += 1; continue; }
      const marker = data[offset + 1];
      const len = data.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
      }
      if (!len) break;
      offset += 2 + len;
    }
  }
  if (ext === ".svg") {
    const text = data.toString("utf8");
    const viewBox = text.match(/viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
    const w = text.match(/\bwidth\s*=\s*["']([\d.]+)/i);
    const h = text.match(/\bheight\s*=\s*["']([\d.]+)/i);
    if (w && h) return { width: Number(w[1]), height: Number(h[1]) };
    if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }
  return { width: 1200, height: 800 };
}

async function vertexXml(v) {
  if (!v.id) throw new Error("Every vertex requires a non-empty id.");
  let style = v.style ? ensureStyle(v.style) : shapeStyle(v.shape);
  if (v.image_path) {
    const { dataUri } = await imageDataUri(v.image_path);
    style = setStyle(style, "image", dataUri);
  }
  style = setStyle(style, "fillColor", v.fill_color);
  style = setStyle(style, "strokeColor", v.stroke_color);
  style = setStyle(style, "fontColor", v.font_color);
  style = setStyle(style, "fontSize", v.font_size);
  style = setStyle(style, "fontStyle", v.font_style);
  style = setStyle(style, "strokeWidth", v.stroke_width);
  style = setStyle(style, "opacity", v.opacity);
  style = setStyle(style, "rotation", v.rotation);
  if (v.dashed !== undefined) style = setStyle(style, "dashed", v.dashed ? 1 : 0);
  if (v.locked) {
    for (const [k, val] of Object.entries({ locked: 1, movable: 0, resizable: 0, rotatable: 0, deletable: 0 })) style = setStyle(style, k, val);
  }
  style = `${ensureStyle(style)}${ensureStyle(v.custom_style)}`;
  return `        <mxCell id="${xmlEscape(v.id)}" value="${xmlEscape(v.label || "")}" style="${xmlEscape(style)}" vertex="1" parent="${xmlEscape(v.parent || "1")}">\n          <mxGeometry x="${Number(v.x)}" y="${Number(v.y)}" width="${Number(v.width)}" height="${Number(v.height)}" as="geometry" />\n        </mxCell>`;
}

function edgeXml(e) {
  if (!e.id) throw new Error("Every edge requires a non-empty id.");
  const floating = e.source_point && e.target_point;
  if (!floating && (!e.source || !e.target)) throw new Error(`Edge '${e.id}' requires source and target, or source_point and target_point.`);
  let style = e.style ? ensureStyle(e.style) : DEFAULT_EDGE_STYLE;
  style = setStyle(style, "strokeColor", e.color);
  style = setStyle(style, "strokeWidth", e.width);
  if (e.dashed !== undefined) style = setStyle(style, "dashed", e.dashed ? 1 : 0);
  if (e.curved !== undefined) style = setStyle(style, "curved", e.curved ? 1 : 0);
  if (e.animated !== undefined) style = setStyle(style, "flowAnimation", e.animated ? 1 : 0);
  style = setStyle(style, "startArrow", e.start_arrow);
  style = setStyle(style, "endArrow", e.end_arrow);
  style = setStyle(style, "exitX", e.exit_x);
  style = setStyle(style, "exitY", e.exit_y);
  style = setStyle(style, "entryX", e.entry_x);
  style = setStyle(style, "entryY", e.entry_y);
  style = `${ensureStyle(style)}${ensureStyle(e.custom_style)}`;
  const connection = floating ? "" : ` source="${xmlEscape(e.source)}" target="${xmlEscape(e.target)}"`;
  const points = [];
  if (floating) {
    points.push(`            <mxPoint x="${Number(e.source_point.x)}" y="${Number(e.source_point.y)}" as="sourcePoint" />`);
    points.push(`            <mxPoint x="${Number(e.target_point.x)}" y="${Number(e.target_point.y)}" as="targetPoint" />`);
  }
  if (e.waypoints?.length) {
    points.push("            <Array as=\"points\">");
    for (const p of e.waypoints) points.push(`              <mxPoint x="${Number(p.x)}" y="${Number(p.y)}" />`);
    points.push("            </Array>");
  }
  const geometry = points.length
    ? `          <mxGeometry relative="1" as="geometry">\n${points.join("\n")}\n          </mxGeometry>`
    : "          <mxGeometry relative=\"1\" as=\"geometry\" />";
  return `        <mxCell id="${xmlEscape(e.id)}" value="${xmlEscape(e.label || "")}" style="${xmlEscape(style)}" edge="1" parent="${xmlEscape(e.parent || "1")}"${connection}>\n${geometry}\n        </mxCell>`;
}

async function buildDiagram(args) {
  const canvas = { width: 1600, height: 1000, grid: true, ...(args.canvas || {}) };
  const layers = args.layers?.length ? args.layers : [];
  const layerXml = layers.map((l) => `        <mxCell id="${xmlEscape(l.id)}" value="${xmlEscape(l.name)}" parent="0" />`);
  const vertices = [];
  for (const vertex of args.vertices || []) vertices.push(await vertexXml(vertex));
  const edges = (args.edges || []).map(edgeXml);
  const titleId = "__figure_title__";
  const allIds = new Set([...(args.vertices || []).map((v) => v.id), ...(args.edges || []).map((e) => e.id), ...layers.map((l) => l.id)]);
  if (allIds.has("0") || allIds.has("1") || allIds.has(titleId)) throw new Error("Ids 0, 1, and __figure_title__ are reserved.");
  const title = `        <mxCell id="${titleId}" value="${xmlEscape(args.title || "Scientific figure")}" style="text;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;html=1;fontSize=22;fontStyle=1;fontColor=#111827;" vertex="1" parent="1">\n          <mxGeometry x="40" y="20" width="${Math.max(200, canvas.width - 80)}" height="40" as="geometry" />\n        </mxCell>`;
  const backgroundAttr = canvas.background ? ` background="${xmlEscape(canvas.background)}"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="Electron" modified="${new Date().toISOString()}" version="30.3.6">\n  <diagram id="page-1" name="${xmlEscape(args.page_name || "Figure")}">\n    <mxGraphModel dx="1422" dy="762" grid="${canvas.grid ? 1 : 0}" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${Number(canvas.width)}" pageHeight="${Number(canvas.height)}" math="0" shadow="0"${backgroundAttr}>\n      <root>\n        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n${layerXml.join("\n")}${layerXml.length ? "\n" : ""}${title}\n${vertices.join("\n")}\n${edges.join("\n")}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n`;
}

async function writeValidatedXml(outputPath, xml, overwrite) {
  const target = normalizeOutputPath(outputPath);
  const report = inspectXml(xml);
  if (!report.valid) throw new Error(`Invalid draw.io XML:\n${report.errors.join("\n")}`);
  await assertWritable(target, overwrite);
  await fs.writeFile(target, xml, "utf8");
  return { output_path: target, bytes: Buffer.byteLength(xml, "utf8"), validation: { valid: true, warnings: report.warnings, pages: report.pages } };
}

async function createTraceDocument(args) {
  const reference = path.resolve(args.reference_path);
  const target = normalizeOutputPath(args.output_path);
  const { dataUri, data, ext } = await imageDataUri(reference);
  const original = readImageSize(data, ext);
  const maxDimension = args.max_dimension || 1600;
  const scale = Math.min(1, maxDimension / Math.max(original.width, original.height));
  const width = Math.max(1, Math.round(original.width * scale));
  const height = Math.max(1, Math.round(original.height * scale));
  const pageWidth = width + 80;
  const pageHeight = height + 140;
  const opacity = args.opacity ?? 25;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="Electron" modified="${new Date().toISOString()}" version="30.3.6">\n  <diagram id="trace-page" name="Trace">\n    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">\n      <root>\n        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n        <mxCell id="reference-layer" value="Reference (${opacity}% opacity)" parent="0" />\n        <mxCell id="drawing-layer" value="Editable drawing" parent="0" />\n        <mxCell id="trace-title" value="Trace and rebuild on the Editable drawing layer" style="text;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;html=1;fontSize=20;fontStyle=1;fontColor=#111827;" vertex="1" parent="drawing-layer">\n          <mxGeometry x="40" y="20" width="${width}" height="40" as="geometry" />\n        </mxCell>\n        <mxCell id="reference-image" value="" style="shape=image;imageAspect=0;aspect=fixed;html=1;image=${xmlEscape(dataUri)};opacity=${opacity};locked=1;movable=0;resizable=0;rotatable=0;deletable=0;selectable=0;" vertex="1" parent="reference-layer">\n          <mxGeometry x="40" y="80" width="${width}" height="${height}" as="geometry" />\n        </mxCell>\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n`;
  const result = await writeValidatedXml(target, xml, args.overwrite);
  return { ...result, reference_path: reference, original_size: original, embedded_size: { width, height }, opacity, drawing_layer: "drawing-layer" };
}

async function drawioVersion() {
  try {
    const { stdout, stderr } = await execFileAsync(DRAWIO.executable, ["--version"], { timeout: 15000, windowsHide: true });
    return { available: true, path: DRAWIO.executable, detection: DRAWIO.source, version: `${stdout}${stderr}`.trim() || "unknown" };
  } catch (error) {
    return { available: false, path: DRAWIO.executable, detection: DRAWIO.source, error: `${error.message}. ${drawioInstallHint()}` };
  }
}

function defaultExportPath(input, format, embed) {
  const base = input.toLowerCase().endsWith(".drawio") ? input.slice(0, -7) : input;
  return embed && ["png", "svg", "pdf"].includes(format) ? `${base}.drawio.${format}` : `${base}.${format}`;
}

async function repairPng(filePath) {
  const png = await fs.readFile(filePath);
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (png.subarray(-12).equals(iend)) return false;
  if (png.subarray(-4).equals(Buffer.alloc(4))) await fs.appendFile(filePath, iend.subarray(4));
  else await fs.appendFile(filePath, iend);
  return true;
}

async function exportDiagram(args) {
  const input = normalizeOutputPath(args.input_path);
  await fs.access(input);
  const format = args.format;
  const output = path.resolve(args.output_path || defaultExportPath(input, format, Boolean(args.embed)));
  if (args.width && args.scale) throw new Error("Do not combine width and scale.");
  if (args.height && args.scale) throw new Error("Do not combine height and scale.");
  await assertWritable(output, args.overwrite);
  const argv = ["-x", "-f", format];
  if (args.embed) argv.push("-e");
  if (args.scale !== undefined) argv.push("-s", String(args.scale));
  if (args.width !== undefined) argv.push("--width", String(args.width));
  if (args.height !== undefined) argv.push("--height", String(args.height));
  if (args.border !== undefined) argv.push("-b", String(args.border));
  if (args.transparent && format === "png") argv.push("-t");
  if (args.page_index !== undefined) argv.push("--page-index", String(args.page_index));
  argv.push("-o", output, input);
  try {
    const { stdout, stderr } = await execFileAsync(DRAWIO.executable, argv, { timeout: 120000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    await fs.access(output);
    const repaired = Boolean(args.embed && format === "png") ? await repairPng(output) : false;
    const stat = await fs.stat(output);
    return { input_path: input, output_path: output, format, embed: Boolean(args.embed), repaired_png_iend: repaired, bytes: stat.size, drawio_output: `${stdout}${stderr}`.trim() };
  } catch (error) {
    await fs.rm(output, { force: true }).catch(() => {});
    throw new Error(`draw.io export failed: ${error.stderr || error.stdout || error.message}`);
  }
}

async function handleTool(name, args = {}) {
  switch (name) {
    case "drawio_status":
      return { ...(await drawioVersion()), server_version: SERVER_VERSION, node: process.version, default_output_directory: path.join(os.homedir(), "Documents"), supported_formats: ["drawio", "png", "svg", "pdf", "jpg"] };
    case "drawio_create_diagram": {
      const xml = await buildDiagram(args);
      return writeValidatedXml(args.output_path, xml, args.overwrite);
    }
    case "drawio_create_trace_document":
      return createTraceDocument(args);
    case "drawio_write_xml":
      return writeValidatedXml(args.output_path, args.xml, args.overwrite);
    case "drawio_validate": {
      const input = normalizeOutputPath(args.input_path);
      const xml = await fs.readFile(input, "utf8");
      const { _pages, ...report } = inspectXml(xml);
      return { input_path: input, ...report };
    }
    case "drawio_inspect": {
      const input = normalizeOutputPath(args.input_path);
      const xml = await fs.readFile(input, "utf8");
      const report = inspectXml(xml);
      const maxCells = args.max_cells || 200;
      return {
        input_path: input,
        valid: report.valid,
        errors: report.errors,
        warnings: report.warnings,
        pages: report._pages.map((p) => ({
          id: p.id,
          name: p.name,
          cells: p.cells.slice(0, maxCells).map((c) => ({
            id: c.id,
            type: c.vertex ? "vertex" : c.edge ? "edge" : "container",
            label: c.value,
            parent: c.parent,
            source: c.source,
            target: c.target,
            geometry: c.geometry,
            style: c.style.length > 500 ? `${c.style.slice(0, 500)}...` : c.style,
          })),
          truncated: p.cells.length > maxCells,
        })),
      };
    }
    case "drawio_update_cells": {
      const input = normalizeOutputPath(args.input_path);
      const output = normalizeOutputPath(args.output_path || input);
      const xml = await fs.readFile(input, "utf8");
      const updated = patchDiagramXml(xml, args.patches);
      const overwrite = output === input ? true : Boolean(args.overwrite);
      const result = await writeValidatedXml(output, updated, overwrite);
      return { ...result, input_path: input, patches_applied: args.patches.length };
    }
    case "drawio_export":
      return exportDiagram(args);
    case "drawio_open": {
      const input = normalizeOutputPath(args.input_path);
      await fs.access(input);
      const child = spawn(DRAWIO.executable, [input], { detached: true, stdio: "ignore", windowsHide: false });
      child.unref();
      return { opened: true, input_path: input, application: DRAWIO.executable };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleMessage(message) {
  const { id, method, params } = message;
  if (method === "initialize") {
    const requested = params?.protocolVersion;
    const protocolVersion = SUPPORTED_PROTOCOLS.has(requested) ? requested : "2025-06-18";
    return rpcResult(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions: "Use absolute paths. Visually analyze reference images first, then create editable draw.io geometry, export a non-embedded PNG preview, inspect it, iterate, and finally export an embedded deliverable.",
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools });
  if (method === "tools/call") {
    try {
      const value = await handleTool(params?.name, params?.arguments || {});
      return rpcResult(id, toolResult(value));
    } catch (error) {
      return rpcResult(id, toolResult({ error: error.message, tool: params?.name }, true));
    }
  }
  if (method?.startsWith("notifications/")) return null;
  return rpcError(id, -32601, `Method not found: ${method}`);
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(rpcError(null, -32700, "Parse error", error.message))}\n`);
    return;
  }
  try {
    const response = await handleMessage(message);
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(rpcError(message.id, -32603, "Internal error", error.message))}\n`);
  }
});

process.on("uncaughtException", (error) => process.stderr.write(`[${SERVER_NAME}] ${error.stack || error.message}\n`));
process.on("unhandledRejection", (error) => process.stderr.write(`[${SERVER_NAME}] ${error?.stack || error}\n`));
