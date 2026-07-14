import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STEP_TOPOLOGY_SCHEMA_VERSION } from "../../packages/cadjs/src/common/stepTopology.mjs";

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const heroGlbPath = path.join(docsRoot, "public/hero/planetary_gear_assembly.step.glb");

function readGlbJson(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", `${filePath} is not a GLB`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.toString("ascii", 16, 20);
  assert.equal(jsonChunkType, "JSON", `${filePath} is missing its JSON chunk`);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

const gltf = readGlbJson(heroGlbPath);
const topology = gltf.extensions?.STEP_topology;

assert.ok(topology, "Hero STEP GLB is missing the STEP_topology extension");
assert.equal(
  topology.schemaVersion,
  STEP_TOPOLOGY_SCHEMA_VERSION,
  `Hero STEP GLB uses STEP_topology schemaVersion ${topology.schemaVersion}; expected ${STEP_TOPOLOGY_SCHEMA_VERSION}`
);

console.log("Hero STEP asset schema is current.");
