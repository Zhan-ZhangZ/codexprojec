# Local Library Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a neutral ASM local library where skills can be installed once and activated into provider/project folders via symlinks.

**Architecture:** Add a focused `src/library.ts` module for library paths, metadata, install copies, listing, and activation symlinks. Reuse existing install discovery/review logic in `src/cli.ts`; `--library` changes only the final target from provider path to ASM library path. Activation is symlink-only and uses the existing provider config resolver.

**Tech Stack:** TypeScript, Node `fs/promises`, Vitest, existing ASM CLI parser and install/link patterns.

---

## File Map

- Create `src/library.ts`: library root helpers, lock read/write, install copy, list records, activate symlink.
- Create `src/library.test.ts`: focused unit tests for library lock, install copy, and activation behavior.
- Modify `src/config.ts`: expose `getLibraryDir()`, `getLibrarySkillsDir()`, and `getLibraryLockPath()`.
- Modify `src/utils/types.ts`: add `library` flag to install options/parsed flags and define library lock entry types.
- Modify `src/cli.ts`: parse `--library`; add `cmdLibrary`; add `cmdActivate`; route commands; call library install path from `cmdInstall`.
- Modify `src/cli.test.ts`: parser and CLI integration tests for `install --library`, `library list`, and `activate`.

## Task 1: Library Storage Module

**Files:**

- Create: `src/library.ts`
- Test: `src/library.test.ts`
- Modify: `src/config.ts`
- Modify: `src/utils/types.ts`

- [ ] **Step 1: Write failing tests for empty library lock and path helpers**

Add this to `src/library.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { emptyLibraryLock, readLibraryLock, writeLibraryLock } from "./library";

describe("library lock", () => {
  let tempDir: string;
  let lockPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asm-library-test-"));
    lockPath = join(tempDir, "library-lock.json");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("readLibraryLock returns an empty lock when the file is missing", async () => {
    await expect(readLibraryLock(lockPath)).resolves.toEqual({
      version: 1,
      skills: {},
    });
  });

  test("writeLibraryLock persists a versioned lock file", async () => {
    const lock = emptyLibraryLock();
    lock.skills.brainstorming = {
      name: "brainstorming",
      version: "1.0.0",
      source: "github:obra/superpowers",
      sourceType: "github",
      commitHash: "abc123",
      ref: "main",
      skillPath: "skills/brainstorming",
      libraryPath: join(tempDir, "skills", "brainstorming"),
      installedAt: "2026-06-18T00:00:00.000Z",
    };

    await writeLibraryLock(lock, lockPath);

    await expect(readLibraryLock(lockPath)).resolves.toEqual(lock);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/library.test.ts
```

Expected: FAIL because `src/library.ts` does not exist.

- [ ] **Step 3: Add library types and path helpers**

In `src/utils/types.ts`, add these types near the lock types:

```ts
export interface LibrarySkillEntry {
  name: string;
  version: string;
  source: string;
  commitHash: string;
  ref: string | null;
  skillPath: string;
  libraryPath: string;
  installedAt: string;
  sourceType?: "registry" | "github" | "local";
}

export interface LibraryLockFile {
  version: 1;
  skills: Record<string, LibrarySkillEntry>;
}
```

In `src/config.ts`, add constants after `INDEX_DIR`:

```ts
const LIBRARY_DIR = join(CONFIG_DIR, "library");
const LIBRARY_SKILLS_DIR = join(LIBRARY_DIR, "skills");
const LIBRARY_LOCK_PATH = join(LIBRARY_DIR, "library-lock.json");
```

Add exports near the other getters:

```ts
export function getLibraryDir(): string {
  return LIBRARY_DIR;
}

export function getLibrarySkillsDir(): string {
  return LIBRARY_SKILLS_DIR;
}

export function getLibraryLockPath(): string {
  return LIBRARY_LOCK_PATH;
}
```

- [ ] **Step 4: Implement lock read/write**

Create `src/library.ts`:

```ts
import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { getLibraryLockPath } from "./config";
import { debug } from "./logger";
import type { LibraryLockFile } from "./utils/types";

export function emptyLibraryLock(): LibraryLockFile {
  return { version: 1, skills: {} };
}

export async function readLibraryLock(
  path: string = getLibraryLockPath(),
): Promise<LibraryLockFile> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      debug("library: lock file not found, returning empty lock");
      return emptyLibraryLock();
    }
    throw err;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed.version !== 1 ||
      typeof parsed.skills !== "object" ||
      parsed.skills === null
    ) {
      throw new Error("invalid schema");
    }
    return parsed as LibraryLockFile;
  } catch {
    const backupPath = path + ".bak";
    try {
      await copyFile(path, backupPath);
    } catch {
      // best effort backup
    }
    console.error(
      `Warning: library-lock.json was corrupted. Backup saved to ${backupPath}. Starting fresh.`,
    );
    return emptyLibraryLock();
  }
}

export async function writeLibraryLock(
  lock: LibraryLockFile,
  path: string = getLibraryLockPath(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(lock, null, 2) + "\n", "utf-8");
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npx vitest run src/library.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/library.ts src/library.test.ts src/config.ts src/utils/types.ts
git commit -m "Add local library lock storage"
```

## Task 2: Library Install Primitives

**Files:**

- Modify: `src/library.ts`
- Modify: `src/library.test.ts`

- [ ] **Step 1: Write failing tests for installing a skill into the library**

Append to `src/library.test.ts`:

```ts
import { mkdir, readFile, writeFile, lstat } from "fs/promises";
import { installLibrarySkill } from "./library";

describe("installLibrarySkill", () => {
  let tempDir: string;
  let lockPath: string;
  let skillsDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asm-library-install-"));
    lockPath = join(tempDir, "library-lock.json");
    skillsDir = join(tempDir, "skills");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("copies a skill directory and writes source metadata", async () => {
    const sourceDir = join(tempDir, "source", "skills", "brainstorming");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, "SKILL.md"),
      "---\nname: brainstorming\nversion: 1.2.3\n---\n# Brainstorming\n",
    );

    const result = await installLibrarySkill(
      {
        sourceDir,
        libraryName: "brainstorming",
        source: "github:obra/superpowers",
        sourceType: "github",
        commitHash: "abc123",
        ref: "main",
        skillPath: "skills/brainstorming",
        force: false,
      },
      { skillsDir, lockPath },
    );

    expect(result.name).toBe("brainstorming");
    expect(result.version).toBe("1.2.3");
    expect(
      await readFile(join(result.libraryPath, "SKILL.md"), "utf-8"),
    ).toContain("Brainstorming");

    const lock = await readLibraryLock(lockPath);
    expect(lock.skills.brainstorming).toMatchObject({
      name: "brainstorming",
      version: "1.2.3",
      source: "github:obra/superpowers",
      sourceType: "github",
      commitHash: "abc123",
      ref: "main",
      skillPath: "skills/brainstorming",
      libraryPath: result.libraryPath,
    });
  });

  test("refuses to overwrite an existing library skill without force", async () => {
    const sourceDir = join(tempDir, "source", "skills", "brainstorming");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, "SKILL.md"),
      "---\nname: brainstorming\nversion: 1.0.0\n---\n# Body\n",
    );

    await installLibrarySkill(
      {
        sourceDir,
        libraryName: "brainstorming",
        source: "local:/tmp/source",
        sourceType: "local",
        commitHash: "unknown",
        ref: null,
        skillPath: "skills/brainstorming",
        force: false,
      },
      { skillsDir, lockPath },
    );

    await expect(
      installLibrarySkill(
        {
          sourceDir,
          libraryName: "brainstorming",
          source: "local:/tmp/source",
          sourceType: "local",
          commitHash: "unknown",
          ref: null,
          skillPath: "skills/brainstorming",
          force: false,
        },
        { skillsDir, lockPath },
      ),
    ).rejects.toThrow(/already exists/);

    await expect(lstat(join(skillsDir, "brainstorming"))).resolves.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/library.test.ts
```

Expected: FAIL because `installLibrarySkill` is not exported.

- [ ] **Step 3: Implement installLibrarySkill**

Add imports in `src/library.ts`:

```ts
import { access, cp, rm } from "fs/promises";
import { join } from "path";
import { parseFrontmatter, resolveVersion } from "./utils/frontmatter";
```

Add interfaces and function:

```ts
export interface InstallLibrarySkillPlan {
  sourceDir: string;
  libraryName: string;
  source: string;
  commitHash: string;
  ref: string | null;
  skillPath: string;
  force: boolean;
  sourceType?: "registry" | "github" | "local";
}

export interface LibraryPaths {
  skillsDir?: string;
  lockPath?: string;
}

export async function installLibrarySkill(
  plan: InstallLibrarySkillPlan,
  paths: LibraryPaths = {},
): Promise<{ name: string; version: string; libraryPath: string }> {
  const skillsDir = paths.skillsDir ?? getLibrarySkillsDir();
  const lockPath = paths.lockPath ?? getLibraryLockPath();
  const libraryPath = join(skillsDir, plan.libraryName);

  try {
    await access(libraryPath);
    if (!plan.force) {
      throw new Error(
        `Library skill already exists: ${libraryPath}. Use --force to overwrite.`,
      );
    }
    await rm(libraryPath, { recursive: true, force: true });
  } catch (err: any) {
    if (err?.message?.includes("--force")) throw err;
  }

  await mkdir(skillsDir, { recursive: true });
  await cp(plan.sourceDir, libraryPath, { recursive: true });
  await rm(join(libraryPath, ".git"), { recursive: true, force: true });

  const content = await readFile(join(libraryPath, "SKILL.md"), "utf-8");
  const fm = parseFrontmatter(content);
  const name = fm.name || plan.libraryName;
  const version = resolveVersion(fm);

  const lock = await readLibraryLock(lockPath);
  lock.skills[plan.libraryName] = {
    name,
    version,
    source: plan.source,
    sourceType: plan.sourceType,
    commitHash: plan.commitHash,
    ref: plan.ref,
    skillPath: plan.skillPath,
    libraryPath,
    installedAt: new Date().toISOString(),
  };
  await writeLibraryLock(lock, lockPath);

  return { name, version, libraryPath };
}
```

Ensure `src/library.ts` imports `getLibrarySkillsDir` and `getLibraryLockPath` from `./config`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/library.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/library.ts src/library.test.ts
git commit -m "Add local library skill installs"
```

## Task 3: CLI Parser and Install --library

**Files:**

- Modify: `src/utils/types.ts`
- Modify: `src/cli.ts`
- Modify: `src/cli.test.ts`

- [ ] **Step 1: Write failing parser test for --library**

In `src/cli.test.ts`, inside `describe("parseArgs: install", ...)`, add:

```ts
test("parses install --library", () => {
  const result = parse("install", "github:user/repo", "--library");
  expect(result.command).toBe("install");
  expect(result.subcommand).toBe("github:user/repo");
  expect(result.flags.library).toBe(true);
});
```

- [ ] **Step 2: Run parser test to verify it fails**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: FAIL because `flags.library` does not exist or `--library` is unknown.

- [ ] **Step 3: Add parser support**

In `src/utils/types.ts`, extend `InstallOptions`:

```ts
library: boolean;
```

Find the `ParsedArgs` flags type in `src/cli.ts` and add:

```ts
library: boolean;
```

In the default `flags` object in `parseArgs`, add:

```ts
      library: false,
```

In `parseArgs`, add this branch near other boolean flags:

```ts
    } else if (arg === "--library") {
      result.flags.library = true;
```

- [ ] **Step 4: Run parser test to verify it passes**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing CLI integration test for library install**

In `src/cli.test.ts`, create a new describe block near install integration tests:

```ts
describe("CLI integration: install --library", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asm-library-cli-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function runCLIWithHome(
    home: string,
    ...args: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const res = await spawnCollect(["npx", "tsx", CLI_BIN, ...args], {
      env: { ...process.env, NO_COLOR: "1", HOME: home },
    });
    return {
      stdout: res.stdout.trim(),
      stderr: res.stderr.trim(),
      exitCode: res.exitCode,
    };
  }

  test("installs all selected skills into the library without provider-visible installs", async () => {
    const source = join(tempDir, "source");
    await mkdir(join(source, "skills", "one"), { recursive: true });
    await mkdir(join(source, "skills", "two"), { recursive: true });
    await writeFile(
      join(source, "skills", "one", "SKILL.md"),
      "---\nname: one\nversion: 1.0.0\n---\n# One\n",
    );
    await writeFile(
      join(source, "skills", "two", "SKILL.md"),
      "---\nname: two\nversion: 1.0.0\n---\n# Two\n",
    );

    const { stdout, stderr, exitCode } = await runCLIWithHome(
      tempDir,
      "install",
      source,
      "--library",
      "--all",
      "-y",
      "--json",
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.map((r: any) => r.name).sort()).toEqual(["one", "two"]);
    expect(
      await readFile(
        join(
          tempDir,
          ".config",
          "agent-skill-manager",
          "library",
          "skills",
          "one",
          "SKILL.md",
        ),
        "utf-8",
      ),
    ).toContain("# One");
    await expect(
      lstat(join(tempDir, ".claude", "skills", "one")),
    ).rejects.toThrow();
    expect(stderr).not.toContain("Error");
  });
});
```

- [ ] **Step 6: Run CLI integration test to verify it fails**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: FAIL because `cmdInstall` still installs into provider paths.

- [ ] **Step 7: Route install --library to library installs**

In `src/cli.ts`, import:

```ts
import { getLibrarySkillsDir } from "./config";
import { installLibrarySkill } from "./library";
```

Because `getLibrarySkillsDir` is already exported from `./config`, prefer adding it to the existing config import instead of a second import.

Inside `cmdInstall`, after source parsing and before provider selection, branch the provider/scope steps:

```ts
const config = await loadConfig();
let provider: ProviderConfig | null = null;
let allProviders: ProviderConfig[] | null = null;
let installScope: "global" | "project" = "global";

if (!args.flags.library) {
  console.info(stepHeader("Selecting provider"));
  const resolvedProvider = await resolveProvider(
    config,
    args.flags.provider,
    !!process.stdin.isTTY,
  );
  provider = resolvedProvider.provider;
  allProviders = resolvedProvider.allProviders;

  console.info(stepHeader("Selecting scope"));
  // keep existing scope-selection logic here
} else {
  console.info(stepHeader("Selecting library"));
  console.info(`  ${ansi.dim(getLibrarySkillsDir())}`);
}
```

Move the existing provider and scope selection code into the `!args.flags.library` branch. For code that later requires `provider`, use `provider!` only inside non-library branches.

When inspecting selected skills, use the first enabled provider only for existing-skill status if `--library` is set:

```ts
const inspectionProvider =
  provider ?? config.providers.find((p) => p.enabled) ?? config.providers[0];
```

Pass `inspectionProvider` into `inspectSkillForInstall`.

In the install loop, replace:

```ts
const result = await executeSkillInstall(inspection.plan, allProviders);
```

with:

```ts
const result = args.flags.library
  ? await installSelectedLibrarySkill({
      inspection,
      source,
      isLocal,
      resolutionSource,
      commitHash,
      scanBaseDir,
    })
  : await executeSkillInstall(inspection.plan, allProviders);
```

Add this helper near `executeSkillInstall`:

```ts
async function installSelectedLibrarySkill(input: {
  inspection: SkillInspection;
  source: ReturnType<typeof parseSource>;
  isLocal: boolean;
  resolutionSource: ResolutionSource;
  commitHash: string | null;
  scanBaseDir: string;
}): Promise<InstallResult> {
  const {
    inspection,
    source,
    isLocal,
    resolutionSource,
    commitHash,
    scanBaseDir,
  } = input;
  const sourceStr = isLocal
    ? `local:${source.localPath}`
    : `github:${source.owner}/${source.repo}`;
  const sourceType = isLocal
    ? ("local" as const)
    : resolutionSource === "registry"
      ? ("registry" as const)
      : ("github" as const);
  const skillPath = relativePath(scanBaseDir, inspection.plan.sourceDir);
  const installed = await installLibrarySkill({
    sourceDir: inspection.plan.sourceDir,
    libraryName: inspection.skillName,
    source: sourceStr,
    sourceType,
    commitHash: commitHash || "unknown",
    ref: source.ref || "main",
    skillPath,
    force: inspection.plan.force,
  });

  return {
    success: true,
    path: installed.libraryPath,
    name: installed.name,
    version: installed.version,
    provider: "Library",
    source: sourceStr,
  };
}
```

Skip the existing `.skill-lock.json` `writeLockEntry` when `args.flags.library` is true because library installs write `library-lock.json`.

- [ ] **Step 8: Run CLI integration test to verify it passes**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/cli.ts src/cli.test.ts src/utils/types.ts src/library.ts
git commit -m "Add install --library flow"
```

## Task 4: Library List Command

**Files:**

- Modify: `src/library.ts`
- Modify: `src/cli.ts`
- Modify: `src/cli.test.ts`

- [ ] **Step 1: Write failing CLI test for library list JSON**

In the `CLI integration: install --library` describe block, add:

```ts
test("library list --json returns centrally installed skills", async () => {
  const source = join(tempDir, "source");
  await mkdir(join(source, "skills", "one"), { recursive: true });
  await writeFile(
    join(source, "skills", "one", "SKILL.md"),
    "---\nname: one\nversion: 1.0.0\n---\n# One\n",
  );

  await runCLIWithHome(
    tempDir,
    "install",
    source,
    "--library",
    "--all",
    "-y",
    "--json",
  );

  const { stdout, exitCode } = await runCLIWithHome(
    tempDir,
    "library",
    "list",
    "--json",
  );

  expect(exitCode).toBe(0);
  const rows = JSON.parse(stdout);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    dirName: "one",
    name: "one",
    version: "1.0.0",
    source: "local:" + source,
    skillPath: "skills/one",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: FAIL because `library` command is not routed.

- [ ] **Step 3: Add listLibrarySkills**

In `src/library.ts`, add:

```ts
export interface LibrarySkillInfo {
  dirName: string;
  name: string;
  version: string;
  source: string;
  sourceType?: "registry" | "github" | "local";
  commitHash: string;
  ref: string | null;
  skillPath: string;
  libraryPath: string;
  installedAt: string;
  missing: boolean;
}

export async function listLibrarySkills(
  path: string = getLibraryLockPath(),
): Promise<LibrarySkillInfo[]> {
  const lock = await readLibraryLock(path);
  const rows: LibrarySkillInfo[] = [];
  for (const [dirName, entry] of Object.entries(lock.skills)) {
    let missing = false;
    try {
      await access(join(entry.libraryPath, "SKILL.md"));
    } catch {
      missing = true;
    }
    rows.push({ dirName, ...entry, missing });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
```

- [ ] **Step 4: Add CLI command**

In `src/cli.ts`, import `listLibrarySkills`.

Add help:

```ts
function printLibraryHelp() {
  console.log(`${ansi.bold("Usage:")} asm library list [options]

List skills installed in ASM's central local library.

${ansi.bold("Options:")}
  --json       Output as JSON
  --no-color   Disable ANSI colors
  -V, --verbose Show debug output`);
}
```

Add command:

```ts
async function cmdLibrary(args: ParsedArgs) {
  if (args.flags.help) {
    printLibraryHelp();
    return;
  }
  if (args.subcommand !== "list") {
    error("Missing or unknown library subcommand. Use: asm library list");
    process.exit(2);
  }

  const rows = await listLibrarySkills();
  if (args.flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (rows.length === 0) {
    console.log(ansi.dim("No skills installed in the local library."));
    return;
  }

  const lines = ["Name  Version  Source  Skill Path  Library Path"];
  for (const row of rows) {
    const missing = row.missing ? " [missing]" : "";
    lines.push(
      `${row.name}${missing}  ${row.version}  ${row.source}  ${row.skillPath}  ${row.libraryPath}`,
    );
  }
  console.log(lines.join("\n"));
}
```

Add `library` to `printMainHelp()` command list.

Route near other commands:

```ts
    case "library":
      await cmdLibrary(args);
      break;
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/library.ts src/cli.ts src/cli.test.ts
git commit -m "Add library list command"
```

## Task 5: Activate Command

**Files:**

- Modify: `src/library.ts`
- Modify: `src/library.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/cli.test.ts`

- [ ] **Step 1: Write failing unit tests for activation symlinks**

Append to `src/library.test.ts`:

```ts
import { readlink, symlink } from "fs/promises";
import { activateLibrarySkill } from "./library";

describe("activateLibrarySkill", () => {
  let tempDir: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asm-library-activate-"));
    sourceDir = join(tempDir, "library", "skills", "brainstorming");
    targetDir = join(tempDir, "project", ".codex", "skills");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, "SKILL.md"),
      "---\nname: brainstorming\nversion: 1.0.0\n---\n# Body\n",
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("creates a symlink from provider target to library skill", async () => {
    const result = await activateLibrarySkill({
      libraryPath: sourceDir,
      targetDir,
      activationName: "brainstorming",
      force: false,
    });

    expect(result.symlinkPath).toBe(join(targetDir, "brainstorming"));
    expect(await readlink(result.symlinkPath)).toBe(sourceDir);
  });

  test("refuses an existing target without force", async () => {
    await mkdir(targetDir, { recursive: true });
    await symlink(sourceDir, join(targetDir, "brainstorming"), "dir");

    await expect(
      activateLibrarySkill({
        libraryPath: sourceDir,
        targetDir,
        activationName: "brainstorming",
        force: false,
      }),
    ).rejects.toThrow(/already exists/);
  });
});
```

- [ ] **Step 2: Run unit tests to verify they fail**

Run:

```bash
npx vitest run src/library.test.ts
```

Expected: FAIL because `activateLibrarySkill` is not exported.

- [ ] **Step 3: Implement activateLibrarySkill and resolution**

In `src/library.ts`, add imports if missing:

```ts
import { lstat, symlink } from "fs/promises";
```

Add:

```ts
export function findLibrarySkill(
  rows: LibrarySkillInfo[],
  name: string,
): LibrarySkillInfo | null {
  const exactDir = rows.find((r) => r.dirName === name);
  if (exactDir) return exactDir;
  const exactName = rows.find((r) => r.name === name);
  return exactName ?? null;
}

export async function activateLibrarySkill(input: {
  libraryPath: string;
  targetDir: string;
  activationName: string;
  force: boolean;
}): Promise<{ symlinkPath: string; targetPath: string }> {
  const symlinkPath = join(input.targetDir, input.activationName);
  try {
    await lstat(symlinkPath);
    if (!input.force) {
      throw new Error(
        `Target already exists: ${symlinkPath}. Use --force to overwrite.`,
      );
    }
    await rm(symlinkPath, { recursive: true, force: true });
  } catch (err: any) {
    if (err?.message?.includes("--force")) throw err;
  }

  await mkdir(input.targetDir, { recursive: true });
  await symlink(input.libraryPath, symlinkPath, "dir");
  return { symlinkPath, targetPath: input.libraryPath };
}
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run:

```bash
npx vitest run src/library.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing CLI integration test for activate**

In `CLI integration: install --library`, add:

```ts
test("activate creates a project-scoped provider symlink from the library", async () => {
  const source = join(tempDir, "source");
  await mkdir(join(source, "skills", "brainstorming"), { recursive: true });
  await writeFile(
    join(source, "skills", "brainstorming", "SKILL.md"),
    "---\nname: brainstorming\nversion: 1.0.0\n---\n# Brainstorming\n",
  );

  await runCLIWithHome(
    tempDir,
    "install",
    source,
    "--library",
    "--all",
    "-y",
    "--json",
  );

  const projectDir = join(tempDir, "project");
  await mkdir(projectDir, { recursive: true });
  const res = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "activate",
      "brainstorming",
      "-p",
      "codex",
      "-s",
      "project",
      "--json",
    ],
    { env: { ...process.env, NO_COLOR: "1", HOME: tempDir }, cwd: projectDir },
  );

  expect(res.exitCode).toBe(0);
  const payload = JSON.parse(res.stdout.trim());
  expect(payload.name).toBe("brainstorming");
  const linkPath = join(projectDir, ".codex", "skills", "brainstorming");
  expect(await readlink(linkPath)).toBe(
    join(
      tempDir,
      ".config",
      "agent-skill-manager",
      "library",
      "skills",
      "brainstorming",
    ),
  );
});
```

- [ ] **Step 6: Run CLI test to verify it fails**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: FAIL because `activate` command is not routed.

- [ ] **Step 7: Add activate CLI command**

In `src/cli.ts`, import `activateLibrarySkill` and `findLibrarySkill`.

Add help:

```ts
function printActivateHelp() {
  console.log(`${ansi.bold("Usage:")} asm activate <skill> [options]

Activate a skill from ASM's local library into a provider skill folder.

${ansi.bold("Options:")}
  -p, --tool <name>    Target tool/provider
  -s, --scope <s>      global or project
  --name <name>        Activation symlink name
  -f, --force          Overwrite existing target
  --json               Output as JSON
  --no-color           Disable ANSI colors
  -V, --verbose        Show debug output`);
}
```

Add command:

```ts
async function cmdActivate(args: ParsedArgs) {
  if (args.flags.help) {
    printActivateHelp();
    return;
  }
  const skillName = args.subcommand;
  if (!skillName) {
    error("Missing required argument: <skill>");
    process.exit(2);
  }
  if (args.flags.scope === "both") {
    error("Activation requires --scope global or --scope project.");
    process.exit(2);
  }

  const rows = await listLibrarySkills();
  const skill = findLibrarySkill(rows, skillName);
  if (!skill) {
    error(`Library skill "${skillName}" not found. Run "asm library list".`);
    process.exit(1);
  }
  if (skill.missing) {
    error(
      `Library skill "${skillName}" is missing on disk: ${skill.libraryPath}`,
    );
    process.exit(1);
  }

  const config = await loadConfig();
  const { provider } = await resolveProvider(
    config,
    args.flags.provider,
    !!process.stdin.isTTY,
  );
  const template =
    args.flags.scope === "project" ? provider.project : provider.global;
  const targetDir = resolveProviderPath(template);
  const activationName = args.flags.name || skill.dirName;
  const result = await activateLibrarySkill({
    libraryPath: skill.libraryPath,
    targetDir,
    activationName,
    force: args.flags.force,
  });

  const output = {
    name: activationName,
    skill: skill.name,
    provider: provider.name,
    scope: args.flags.scope,
    path: result.symlinkPath,
    target: result.targetPath,
  };
  if (args.flags.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(
      `${ansi.green("✓")} activated ${activationName} (${provider.name}, ${args.flags.scope}) -> ${result.targetPath}`,
    );
  }
}
```

Add `activate` to `printMainHelp()` and route it:

```ts
    case "activate":
      await cmdActivate(args);
      break;
```

- [ ] **Step 8: Run CLI test to verify it passes**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/library.ts src/library.test.ts src/cli.ts src/cli.test.ts
git commit -m "Add library skill activation"
```

## Task 6: Error Cases and Final Verification

**Files:**

- Modify: `src/cli.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/library.ts`

- [ ] **Step 1: Add failing CLI tests for activation errors**

Add to `CLI integration: install --library`:

```ts
test("activate unknown library skill exits with actionable message", async () => {
  const { stderr, exitCode } = await runCLIWithHome(
    tempDir,
    "activate",
    "missing-skill",
    "-p",
    "codex",
    "-s",
    "project",
  );

  expect(exitCode).toBe(1);
  expect(stderr).toContain('Library skill "missing-skill" not found');
  expect(stderr).toContain("asm library list");
});

test("activate refuses existing target without force", async () => {
  const source = join(tempDir, "source");
  await mkdir(join(source, "skills", "brainstorming"), { recursive: true });
  await writeFile(
    join(source, "skills", "brainstorming", "SKILL.md"),
    "---\nname: brainstorming\nversion: 1.0.0\n---\n# Brainstorming\n",
  );
  await runCLIWithHome(tempDir, "install", source, "--library", "--all", "-y");

  const projectDir = join(tempDir, "project");
  const target = join(projectDir, ".codex", "skills", "brainstorming");
  await mkdir(target, { recursive: true });

  const res = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "activate",
      "brainstorming",
      "-p",
      "codex",
      "-s",
      "project",
    ],
    { env: { ...process.env, NO_COLOR: "1", HOME: tempDir }, cwd: projectDir },
  );

  expect(res.exitCode).toBe(1);
  expect(res.stderr).toContain("Target already exists");
  expect(res.stderr).toContain("--force");
});
```

- [ ] **Step 2: Run tests to verify the new assertions are enforced**

Run:

```bash
npx vitest run src/cli.test.ts
```

Expected before Step 3: FAIL if `cmdActivate` does not print the exact missing-skill message or `activateLibrarySkill` does not print the exact existing-target message.

- [ ] **Step 3: Set exact activation error messages**

In `src/cli.ts`, ensure the missing library skill branch in `cmdActivate` is exactly:

```ts
error(`Library skill "${skillName}" not found. Run "asm library list".`);
process.exit(1);
```

In `src/library.ts`, ensure the existing target branch in `activateLibrarySkill` throws exactly:

```ts
throw new Error(
  `Target already exists: ${symlinkPath}. Use --force to overwrite.`,
);
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npx vitest run src/library.test.ts
npx vitest run src/cli.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS with `tsc --noEmit`.

- [ ] **Step 6: Run final test set**

Run:

```bash
npx vitest run src/library.test.ts
npx vitest run src/updater.test.ts
npx vitest run src/cli.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit final test/error adjustments**

```bash
git add src/cli.ts src/cli.test.ts src/library.ts src/library.test.ts
git commit -m "Cover local library activation errors"
```

## Self-Review Notes

- Spec coverage: Task 1 covers storage; Task 2 covers library install primitives; Task 3 covers `install --library`; Task 4 covers `library list`; Task 5 covers `activate`; Task 6 covers error cases and verification.
- Dependency closure, presets, sandbox, deactivate, and library update remain explicit follow-ups, matching the spec non-goals.
- Type names used by later tasks are introduced before use: `LibrarySkillEntry`, `LibraryLockFile`, `LibrarySkillInfo`, `InstallLibrarySkillPlan`, `installLibrarySkill`, `listLibrarySkills`, `findLibrarySkill`, and `activateLibrarySkill`.
