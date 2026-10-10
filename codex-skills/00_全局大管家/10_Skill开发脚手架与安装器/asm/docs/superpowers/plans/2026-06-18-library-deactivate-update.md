# Library Deactivate and Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe deactivation of library symlinks and update support for centrally installed library skills.

**Architecture:** Extend `src/library.ts` with pure library lifecycle primitives, then expose them through `src/cli.ts`. Deactivation is symlink-only and refuses anything outside the ASM library. Library update reads `library-lock.json`, refreshes source content into a temporary directory, validates `SKILL.md`, atomically replaces the library copy, and summarizes per-skill results.

**Tech Stack:** TypeScript, Node `fs/promises`, Node `child_process` for remote clone updates, Vitest, existing ASM CLI parser/config/provider helpers.

---

## File Map

- Modify `src/library.ts`: add `deactivateLibrarySkill`, library update result types, source refresh helpers, `updateLibrarySkill`, and `updateLibrarySkills`.
- Modify `src/library.test.ts`: unit tests for safe deactivate behavior and local-source library updates.
- Modify `src/cli.ts`: add `deactivate` command, expand `library` subcommands with `update`, help text, JSON/human output, and routing.
- Modify `src/cli.test.ts`: parser and CLI integration tests for `deactivate` and `library update`.
- No changes to provider install/update behavior outside explicit `deactivate` and `library update` commands.

## Task 1: Library Deactivate Primitive

**Files:**

- Modify: `src/library.ts`
- Modify: `src/library.test.ts`

- [ ] **Step 1: Add failing tests for symlink-only deactivation**

Append these imports in `src/library.test.ts`:

```ts
import { realpath } from "fs/promises";
```

Add `deactivateLibrarySkill` to the existing `./library` import.

Append this test block:

```ts
describe("deactivateLibrarySkill", () => {
  let tempDir: string;
  let librarySkillsDir: string;
  let libraryPath: string;
  let targetDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asm-library-deactivate-"));
    librarySkillsDir = join(tempDir, "library", "skills");
    libraryPath = join(librarySkillsDir, "brainstorming");
    targetDir = join(tempDir, "provider", "skills");
    await mkdir(libraryPath, { recursive: true });
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      join(libraryPath, "SKILL.md"),
      "---\nname: brainstorming\n---\n# Brainstorming\n",
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("removes a provider symlink pointing into the library", async () => {
    const symlinkPath = join(targetDir, "brainstorming");
    await symlink(libraryPath, symlinkPath, "dir");

    const result = await deactivateLibrarySkill({
      targetDir,
      activationName: "brainstorming",
      librarySkillsDir,
      provider: "codex",
      scope: "project",
    });

    expect(result).toEqual({
      name: "brainstorming",
      provider: "codex",
      scope: "project",
      path: symlinkPath,
      target: await realpath(libraryPath),
    });
    await expect(lstat(symlinkPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(join(libraryPath, "SKILL.md"), "utf-8"),
    ).resolves.toContain("# Brainstorming");
  });

  test("refuses to deactivate a real directory", async () => {
    const realTarget = join(targetDir, "brainstorming");
    await mkdir(realTarget, { recursive: true });

    await expect(
      deactivateLibrarySkill({
        targetDir,
        activationName: "brainstorming",
        librarySkillsDir,
        provider: "codex",
        scope: "project",
      }),
    ).rejects.toThrow(
      `Refusing to deactivate non-symlink target: ${realTarget}.`,
    );
    await expect(lstat(realTarget)).resolves.toBeTruthy();
  });

  test("refuses to deactivate a symlink outside the library", async () => {
    const externalDir = join(tempDir, "external");
    const symlinkPath = join(targetDir, "brainstorming");
    await mkdir(externalDir, { recursive: true });
    await symlink(externalDir, symlinkPath, "dir");

    await expect(
      deactivateLibrarySkill({
        targetDir,
        activationName: "brainstorming",
        librarySkillsDir,
        provider: "codex",
        scope: "project",
      }),
    ).rejects.toThrow(
      `Refusing to deactivate symlink outside the ASM library: ${symlinkPath}.`,
    );
    await expect(readlink(symlinkPath)).resolves.toBe(externalDir);
  });

  test("reports a missing activation", async () => {
    await expect(
      deactivateLibrarySkill({
        targetDir,
        activationName: "brainstorming",
        librarySkillsDir,
        provider: "codex",
        scope: "project",
      }),
    ).rejects.toThrow('Skill "brainstorming" is not active for codex/project.');
  });

  test("rejects invalid activation names before touching filesystem targets", async () => {
    const outsideDir = join(tempDir, "provider", "outside");
    const outsideSentinel = join(outsideDir, "sentinel.txt");
    await mkdir(outsideDir, { recursive: true });
    await writeFile(outsideSentinel, "keep me", "utf-8");

    await expect(
      deactivateLibrarySkill({
        targetDir,
        activationName: "../outside",
        librarySkillsDir,
        provider: "codex",
        scope: "project",
      }),
    ).rejects.toThrow(/Invalid skill name/);

    await expect(readFile(outsideSentinel, "utf-8")).resolves.toBe("keep me");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/library.test.ts -t deactivateLibrarySkill
```

Expected: FAIL because `deactivateLibrarySkill` is not exported.

- [ ] **Step 3: Implement `deactivateLibrarySkill`**

Update imports in `src/library.ts`:

```ts
import {
  access,
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from "fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "path";
import { getLibraryLockPath, getLibrarySkillsDir } from "./config";
```

Add these types and helper after `findLibrarySkill`:

```ts
export interface DeactivateLibrarySkillInput {
  targetDir: string;
  activationName: string;
  provider: string;
  scope: "global" | "project";
  librarySkillsDir?: string;
}

export interface DeactivateLibrarySkillResult {
  name: string;
  provider: string;
  scope: "global" | "project";
  path: string;
  target: string;
}

function isInsideDirectory(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!!rel && !rel.startsWith("..") && !isAbsolute(rel));
}

export async function deactivateLibrarySkill(
  input: DeactivateLibrarySkillInput,
): Promise<DeactivateLibrarySkillResult> {
  const activationName = validateSkillDirectoryName(input.activationName);
  const symlinkPath = join(input.targetDir, activationName);

  let stat;
  try {
    stat = await lstat(symlinkPath);
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      throw new Error(
        `Skill "${activationName}" is not active for ${input.provider}/${input.scope}.`,
      );
    }
    throw err;
  }

  if (!stat.isSymbolicLink()) {
    throw new Error(
      `Refusing to deactivate non-symlink target: ${symlinkPath}.`,
    );
  }

  const rawTarget = await readlink(symlinkPath);
  const absoluteTarget = isAbsolute(rawTarget)
    ? rawTarget
    : resolve(dirname(symlinkPath), rawTarget);
  const resolvedTarget = await realpath(absoluteTarget);
  const resolvedLibrarySkillsDir = await realpath(
    input.librarySkillsDir ?? getLibrarySkillsDir(),
  );

  if (!isInsideDirectory(resolvedLibrarySkillsDir, resolvedTarget)) {
    throw new Error(
      `Refusing to deactivate symlink outside the ASM library: ${symlinkPath}.`,
    );
  }

  await rm(symlinkPath, { force: false });

  return {
    name: activationName,
    provider: input.provider,
    scope: input.scope,
    path: symlinkPath,
    target: resolvedTarget,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/library.test.ts -t deactivateLibrarySkill
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/library.ts src/library.test.ts
git commit -m "Add library skill deactivation primitive"
```

## Task 2: CLI `asm deactivate`

**Files:**

- Modify: `src/cli.ts`
- Modify: `src/cli.test.ts`

- [ ] **Step 1: Add failing parser and CLI tests**

In the parser tests section of `src/cli.test.ts`, add:

```ts
test("parses deactivate command", () => {
  const result = parse(
    "deactivate",
    "brainstorming",
    "-p",
    "codex",
    "-s",
    "project",
  );
  expect(result.command).toBe("deactivate");
  expect(result.subcommand).toBe("brainstorming");
  expect(result.flags.provider).toBe("codex");
  expect(result.flags.scope).toBe("project");
});
```

In `describe("CLI integration: install --library", ...)`, append:

```ts
test("deactivate removes a project activation symlink", async () => {
  const source = join(tempDir, "source");
  const sourceSkillDir = join(source, "skills", "brainstorming");
  await mkdir(sourceSkillDir, { recursive: true });
  await writeFile(
    join(sourceSkillDir, "SKILL.md"),
    "---\nname: brainstorming\nversion: 1.0.0\n---\n# Brainstorming\n",
  );

  const homeDir = join(tempDir, "home");
  const projectDir = join(tempDir, "project");
  await mkdir(projectDir, { recursive: true });

  const installRes = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "install",
      sourceSkillDir,
      "--library",
      "-y",
      "--json",
    ],
    { env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );
  expect(installRes.exitCode).toBe(0);

  const activateRes = await spawnCollect(
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
    { cwd: projectDir, env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );
  expect(activateRes.exitCode).toBe(0);

  const deactivateRes = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "deactivate",
      "brainstorming",
      "-p",
      "codex",
      "-s",
      "project",
      "--json",
    ],
    { cwd: projectDir, env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );

  expect(deactivateRes.exitCode).toBe(0);
  const payload = JSON.parse(deactivateRes.stdout);
  expect(payload).toMatchObject({
    name: "brainstorming",
    provider: "codex",
    scope: "project",
  });
  await expect(
    lstat(join(projectDir, ".codex", "skills", "brainstorming")),
  ).rejects.toMatchObject({
    code: "ENOENT",
  });
});

test("deactivate refuses a real provider directory", async () => {
  const homeDir = join(tempDir, "home");
  const projectDir = join(tempDir, "project");
  const targetPath = join(projectDir, ".codex", "skills", "brainstorming");
  await mkdir(targetPath, { recursive: true });

  const res = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "deactivate",
      "brainstorming",
      "-p",
      "codex",
      "-s",
      "project",
    ],
    { cwd: projectDir, env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );

  expect(res.exitCode).toBe(1);
  expect(res.stderr).toContain("Refusing to deactivate non-symlink target");
  await expect(lstat(targetPath)).resolves.toBeTruthy();
});

test("deactivate reports missing activation", async () => {
  const homeDir = join(tempDir, "home");
  const projectDir = join(tempDir, "project");
  await mkdir(projectDir, { recursive: true });

  const res = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "deactivate",
      "brainstorming",
      "-p",
      "codex",
      "-s",
      "project",
    ],
    { cwd: projectDir, env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );

  expect(res.exitCode).toBe(1);
  expect(res.stderr).toContain(
    'Skill "brainstorming" is not active for codex/project',
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/cli.test.ts -t "parses deactivate|deactivate removes|deactivate refuses|deactivate reports"
```

Expected: FAIL because `deactivate` is not routed.

- [ ] **Step 3: Add CLI command, help, and route**

Update the library import in `src/cli.ts`:

```ts
import {
  activateLibrarySkill,
  deactivateLibrarySkill,
  emptyLibraryLock,
  findLibrarySkill,
  installLibrarySkill,
  listLibrarySkills,
  readLibraryLock,
  writeLibraryLock,
} from "./library";
```

Add main help command line:

```ts
  deactivate <skill>     Remove a library activation symlink
```

Add help function near `printActivateHelp`:

```ts
function printDeactivateHelp() {
  console.log(`${ansi.bold("Usage:")} asm deactivate <skill> -p <tool> -s <scope> [options]

Remove a library activation symlink from a provider skill folder.

${ansi.bold("Options:")}
  -p, --tool <name>      Provider to deactivate from (e.g., claude, codex)
  -s, --scope <scope>    Activation scope: global or project
  --json                 Output as JSON object
  -V, --verbose          Show debug output

${ansi.bold("Examples:")}
  asm deactivate brainstorming -p codex -s project
  asm deactivate sp-brainstorming -p claude -s global --json`);
}
```

Add command handler after `cmdActivate`:

```ts
async function cmdDeactivate(args: ParsedArgs) {
  if (args.flags.help) {
    printDeactivateHelp();
    return;
  }

  const activationName = args.subcommand;
  if (!activationName) {
    error("Missing skill name. Use: asm deactivate <skill>");
    console.error(`Run "asm deactivate --help" for usage.`);
    process.exit(2);
  }

  if (args.flags.scope === "both") {
    error("Deactivation requires --scope global or --scope project.");
    process.exit(2);
  }

  const config = await loadConfig();
  const { provider } = await resolveProvider(
    config,
    args.flags.provider,
    process.stdin.isTTY,
  );
  const targetTemplate =
    args.flags.scope === "global" ? provider.global : provider.project;
  const targetDir = resolveProviderPath(targetTemplate);

  const result = await deactivateLibrarySkill({
    targetDir,
    activationName,
    provider: provider.name,
    scope: args.flags.scope,
  });

  if (args.flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(
    `${ansi.green("✓")} deactivated ${result.name} (${provider.name}/${args.flags.scope})`,
  );
}
```

Route it:

```ts
case "deactivate":
  await cmdDeactivate(args);
  break;
```

Add `"deactivate"` to the `isCLIMode` command list.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/cli.test.ts -t "parses deactivate|deactivate removes|deactivate refuses|deactivate reports"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts src/cli.test.ts
git commit -m "Add deactivate command for library activations"
```

## Task 3: Library Update Primitive

**Files:**

- Modify: `src/library.ts`
- Modify: `src/library.test.ts`

- [ ] **Step 1: Add failing tests for local-source update and recorded `skillPath`**

Add this test block to `src/library.test.ts`:

```ts
describe("updateLibrarySkill", () => {
  let tempDir: string;
  let lockPath: string;
  let skillsDir: string;
  let sourceRoot: string;
  let libraryPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "asm-library-update-"));
    lockPath = join(tempDir, "library-lock.json");
    skillsDir = join(tempDir, "library", "skills");
    sourceRoot = join(tempDir, "source");
    libraryPath = join(skillsDir, "brainstorming");

    await mkdir(join(sourceRoot, "skills", "brainstorming"), {
      recursive: true,
    });
    await writeFile(
      join(sourceRoot, "skills", "brainstorming", "SKILL.md"),
      "---\nname: brainstorming\nversion: 1.0.0\n---\n# Old Source\n",
    );

    await installLibrarySkill(
      {
        sourceDir: join(sourceRoot, "skills", "brainstorming"),
        libraryName: "brainstorming",
        source: `local:${sourceRoot}`,
        sourceType: "local",
        commitHash: "local",
        ref: null,
        skillPath: "skills/brainstorming",
        force: false,
      },
      { skillsDir, lockPath },
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("updates a local-source library skill in place", async () => {
    await writeFile(
      join(sourceRoot, "skills", "brainstorming", "SKILL.md"),
      "---\nname: brainstorming\nversion: 2.0.0\n---\n# New Source\n",
    );

    const result = await updateLibrarySkill("brainstorming", {
      skillsDir,
      lockPath,
    });

    expect(result).toMatchObject({
      name: "brainstorming",
      status: "updated",
      oldVersion: "1.0.0",
      newVersion: "2.0.0",
    });
    await expect(
      readFile(join(libraryPath, "SKILL.md"), "utf-8"),
    ).resolves.toContain("# New Source");
    const lock = await readLibraryLock(lockPath);
    expect(lock.skills.brainstorming.version).toBe("2.0.0");
    expect(lock.skills.brainstorming.skillPath).toBe("skills/brainstorming");
  });

  test("uses recorded skillPath instead of source root", async () => {
    await writeFile(
      join(sourceRoot, "SKILL.md"),
      "---\nname: wrong-root\nversion: 9.9.9\n---\n# Wrong Root\n",
    );
    await writeFile(
      join(sourceRoot, "skills", "brainstorming", "SKILL.md"),
      "---\nname: brainstorming\nversion: 2.1.0\n---\n# Correct Subpath\n",
    );

    await updateLibrarySkill("brainstorming", { skillsDir, lockPath });

    await expect(
      readFile(join(libraryPath, "SKILL.md"), "utf-8"),
    ).resolves.toContain("# Correct Subpath");
    await expect(
      readFile(join(libraryPath, "SKILL.md"), "utf-8"),
    ).resolves.not.toContain("# Wrong Root");
  });

  test("fails without replacing the existing library copy when source skill is invalid", async () => {
    await rm(join(sourceRoot, "skills", "brainstorming", "SKILL.md"), {
      force: true,
    });

    const result = await updateLibrarySkill("brainstorming", {
      skillsDir,
      lockPath,
    });

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("SKILL.md");
    await expect(
      readFile(join(libraryPath, "SKILL.md"), "utf-8"),
    ).resolves.toContain("# Old Source");
  });
});
```

Add `updateLibrarySkill` to the `./library` import.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/library.test.ts -t updateLibrarySkill
```

Expected: FAIL because `updateLibrarySkill` is not exported.

- [ ] **Step 3: Implement update types and local-source refresh**

Add imports in `src/library.ts`:

```ts
import { execFile } from "child_process";
import { tmpdir } from "os";
import { promisify } from "util";
import { sourceToCloneUrl } from "./updater";
```

Add near constants:

```ts
const execFileAsync = promisify(execFile);
```

Add result types after `LibrarySkillInfo`:

```ts
export interface LibraryUpdateResult {
  name: string;
  status: "updated" | "skipped" | "failed";
  reason?: string;
  oldVersion?: string;
  newVersion?: string;
  oldCommit?: string;
  newCommit?: string;
}

export interface LibraryUpdateSummary {
  results: LibraryUpdateResult[];
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: string[];
}
```

Add helpers before `installLibrarySkill`:

```ts
function sourceBasePath(entry: LibrarySkillEntry): string | null {
  if (entry.source.startsWith("local:")) {
    return entry.source.slice("local:".length);
  }
  return null;
}

function shortCommit(hash: string): string {
  return hash.length > 7 ? hash.slice(0, 7) : hash;
}

async function copyValidatedSkill(input: {
  sourceDir: string;
  libraryName: string;
  entry: LibrarySkillEntry;
  skillsDir: string;
  lockPath: string;
  newCommit: string;
}): Promise<LibraryUpdateResult> {
  const skillMarkdown = await readFile(
    join(input.sourceDir, "SKILL.md"),
    "utf-8",
  );
  const fm = parseFrontmatter(skillMarkdown);
  const name = fm.name || input.libraryName;
  const version = resolveVersion(fm);

  const tmpTarget = join(
    input.skillsDir,
    `${input.libraryName}.tmp-${Date.now()}`,
  );
  const backupTarget = join(
    input.skillsDir,
    `${input.libraryName}.bak-${Date.now()}`,
  );
  const finalTarget = input.entry.libraryPath;

  await cp(input.sourceDir, tmpTarget, { recursive: true });
  await rm(join(tmpTarget, ".git"), { recursive: true, force: true });

  try {
    await rm(backupTarget, { recursive: true, force: true });
    await rename(finalTarget, backupTarget);
    await rename(tmpTarget, finalTarget);
    await rm(backupTarget, { recursive: true, force: true });
  } catch (err: any) {
    try {
      await rm(finalTarget, { recursive: true, force: true });
      await rename(backupTarget, finalTarget);
    } catch {
      // best effort rollback
    }
    await rm(tmpTarget, { recursive: true, force: true });
    return {
      name: input.libraryName,
      status: "failed",
      reason: `Atomic swap failed: ${err.message}`,
    };
  }

  const lock = await readLibraryLock(input.lockPath);
  lock.skills[input.libraryName] = {
    ...input.entry,
    name,
    version,
    commitHash: input.newCommit,
    installedAt: new Date().toISOString(),
  };
  await writeLibraryLock(lock, input.lockPath);

  return {
    name: input.libraryName,
    status: "updated",
    oldVersion: input.entry.version,
    newVersion: version,
    oldCommit: shortCommit(input.entry.commitHash),
    newCommit: shortCommit(input.newCommit),
  };
}
```

Update the import from `fs/promises` to include `mkdtemp` and `rename`.

Add `LibrarySkillEntry` to the type import:

```ts
import type { LibraryLockFile, LibrarySkillEntry } from "./utils/types";
```

Add the primitive:

```ts
export async function updateLibrarySkill(
  name: string,
  paths: LibraryPaths = {},
): Promise<LibraryUpdateResult> {
  const skillsDir = paths.skillsDir ?? getLibrarySkillsDir();
  const lockPath = paths.lockPath ?? getLibraryLockPath();
  const rows = await listLibrarySkills(lockPath);
  const info = findLibrarySkill(rows, name);
  if (!info) {
    return {
      name,
      status: "failed",
      reason: `Library skill "${name}" not found. Run "asm library list".`,
    };
  }

  const lock = await readLibraryLock(lockPath);
  const entry = lock.skills[info.dirName];
  if (!entry) {
    return {
      name,
      status: "failed",
      reason: `Library skill "${name}" not found. Run "asm library list".`,
    };
  }

  if (!entry.source) {
    return {
      name: info.dirName,
      status: "failed",
      reason: "Missing update metadata: source",
    };
  }
  if (!entry.skillPath && entry.skillPath !== "") {
    return {
      name: info.dirName,
      status: "failed",
      reason: "Missing update metadata: skillPath",
    };
  }
  if (!entry.libraryPath) {
    return {
      name: info.dirName,
      status: "failed",
      reason: "Missing update metadata: libraryPath",
    };
  }

  let refreshRoot: string | null = null;
  let cleanupRoot: string | null = null;
  let newCommit = entry.commitHash || "unknown";

  try {
    const localBase = sourceBasePath(entry);
    if (localBase) {
      refreshRoot = localBase;
      newCommit = "local";
    } else {
      const cloneUrl = sourceToCloneUrl(entry.source);
      if (!cloneUrl) {
        return {
          name: info.dirName,
          status: "failed",
          reason: "Cannot determine remote URL",
        };
      }
      cleanupRoot = await mkdtemp(join(tmpdir(), "asm-library-update-"));
      const cloneArgs = ["clone", "--depth", "1"];
      if (entry.ref && entry.ref !== "HEAD") {
        cloneArgs.push("--branch", entry.ref);
      }
      cloneArgs.push(cloneUrl, cleanupRoot);
      await execFileAsync("git", cloneArgs, { timeout: 60_000 });
      const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: cleanupRoot,
        timeout: 5_000,
      });
      newCommit = stdout.trim();
      refreshRoot = cleanupRoot;
    }

    const sourceDir = entry.skillPath
      ? join(refreshRoot, entry.skillPath)
      : refreshRoot;
    return await copyValidatedSkill({
      sourceDir,
      libraryName: info.dirName,
      entry,
      skillsDir,
      lockPath,
      newCommit,
    });
  } catch (err: any) {
    return {
      name: info.dirName,
      status: "failed",
      reason: err?.message || String(err),
    };
  } finally {
    if (cleanupRoot) {
      await rm(cleanupRoot, { recursive: true, force: true });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/library.test.ts -t updateLibrarySkill
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/library.ts src/library.test.ts
git commit -m "Add library skill update primitive"
```

## Task 4: CLI `asm library update`

**Files:**

- Modify: `src/library.ts`
- Modify: `src/cli.ts`
- Modify: `src/cli.test.ts`

- [ ] **Step 1: Add failing tests for `library update`**

In `describe("CLI integration: install --library", ...)`, append:

```ts
test("library update refreshes a local-source skill", async () => {
  const source = join(tempDir, "source");
  const sourceSkillDir = join(source, "skills", "brainstorming");
  await mkdir(sourceSkillDir, { recursive: true });
  await writeFile(
    join(sourceSkillDir, "SKILL.md"),
    "---\nname: brainstorming\nversion: 1.0.0\n---\n# Old\n",
  );

  const homeDir = join(tempDir, "home");
  const installRes = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "install",
      source,
      "--library",
      "--all",
      "-y",
      "--json",
    ],
    { env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );
  expect(installRes.exitCode).toBe(0);

  await writeFile(
    join(sourceSkillDir, "SKILL.md"),
    "---\nname: brainstorming\nversion: 2.0.0\n---\n# New\n",
  );

  const updateRes = await spawnCollect(
    ["npx", "tsx", CLI_BIN, "library", "update", "brainstorming", "--json"],
    { env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );

  expect(updateRes.exitCode).toBe(0);
  const payload = JSON.parse(updateRes.stdout);
  expect(payload.results[0]).toMatchObject({
    name: "brainstorming",
    status: "updated",
    oldVersion: "1.0.0",
    newVersion: "2.0.0",
  });
  await expect(
    readFile(
      join(
        homeDir,
        ".config",
        "agent-skill-manager",
        "library",
        "skills",
        "brainstorming",
        "SKILL.md",
      ),
      "utf-8",
    ),
  ).resolves.toContain("# New");
});

test("library update unknown skill suggests library list", async () => {
  const homeDir = join(tempDir, "home");
  const res = await spawnCollect(
    ["npx", "tsx", CLI_BIN, "library", "update", "missing", "--json"],
    { env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );

  expect(res.exitCode).toBe(1);
  const payload = JSON.parse(res.stdout);
  expect(payload.failedCount).toBe(1);
  expect(payload.results[0]).toMatchObject({
    name: "missing",
    status: "failed",
    reason: 'Library skill "missing" not found. Run "asm library list".',
  });
});

test("library update --all --json reports partial failures", async () => {
  const source = join(tempDir, "source");
  await mkdir(join(source, "skills", "good"), { recursive: true });
  await mkdir(join(source, "skills", "bad"), { recursive: true });
  await writeFile(
    join(source, "skills", "good", "SKILL.md"),
    "---\nname: good\nversion: 1.0.0\n---\n# Good Old\n",
  );
  await writeFile(
    join(source, "skills", "bad", "SKILL.md"),
    "---\nname: bad\nversion: 1.0.0\n---\n# Bad Old\n",
  );

  const homeDir = join(tempDir, "home");
  const installRes = await spawnCollect(
    [
      "npx",
      "tsx",
      CLI_BIN,
      "install",
      source,
      "--library",
      "--all",
      "-y",
      "--json",
    ],
    { env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );
  expect(installRes.exitCode).toBe(0);

  await writeFile(
    join(source, "skills", "good", "SKILL.md"),
    "---\nname: good\nversion: 2.0.0\n---\n# Good New\n",
  );
  await rm(join(source, "skills", "bad", "SKILL.md"), { force: true });

  const updateRes = await spawnCollect(
    ["npx", "tsx", CLI_BIN, "library", "update", "--all", "--json"],
    { env: { ...process.env, HOME: homeDir, NO_COLOR: "1" } },
  );

  expect(updateRes.exitCode).toBe(1);
  const payload = JSON.parse(updateRes.stdout);
  expect(payload.updatedCount).toBe(1);
  expect(payload.failedCount).toBe(1);
  expect(payload.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "good", status: "updated" }),
      expect.objectContaining({ name: "bad", status: "failed" }),
    ]),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/cli.test.ts -t "library update"
```

Expected: FAIL because `library update` is not implemented.

- [ ] **Step 3: Add `updateLibrarySkills` summary primitive**

In `src/library.ts`, add:

```ts
export async function updateLibrarySkills(
  names: string[] | null,
  paths: LibraryPaths = {},
): Promise<LibraryUpdateSummary> {
  const lockPath = paths.lockPath ?? getLibraryLockPath();
  const lock = await readLibraryLock(lockPath);
  const selectedNames =
    names && names.length > 0 ? names : Object.keys(lock.skills);
  const warnings: string[] = [];

  if (selectedNames.length === 0) {
    return {
      results: [],
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      warnings,
    };
  }

  const results: LibraryUpdateResult[] = [];
  for (const selectedName of selectedNames) {
    const result = await updateLibrarySkill(selectedName, paths);
    if (
      result.status === "failed" &&
      result.reason?.includes('Run "asm library list"')
    ) {
      warnings.push(result.reason);
    }
    results.push(result);
  }

  return {
    results,
    updatedCount: results.filter((r) => r.status === "updated").length,
    skippedCount: results.filter((r) => r.status === "skipped").length,
    failedCount: results.filter((r) => r.status === "failed").length,
    warnings,
  };
}
```

- [ ] **Step 4: Add CLI handler for `asm library update`**

Update the library import in `src/cli.ts`:

```ts
import {
  activateLibrarySkill,
  deactivateLibrarySkill,
  emptyLibraryLock,
  findLibrarySkill,
  installLibrarySkill,
  listLibrarySkills,
  readLibraryLock,
  updateLibrarySkills,
  writeLibraryLock,
} from "./library";
```

Update `printLibraryHelp`:

```ts
${ansi.bold("Subcommands:")}
  list                 List skills installed in the local library
  update <skill>       Update one local library skill
  update --all         Update all local library skills
```

Add these functions near `cmdLibrary`:

```ts
function printLibraryUpdateHuman(
  summary: Awaited<ReturnType<typeof updateLibrarySkills>>,
) {
  for (const result of summary.results) {
    if (result.status === "updated") {
      console.log(
        `${ansi.green("✓")} ${result.name}: ${result.oldVersion ?? "unknown"} -> ${result.newVersion ?? "unknown"}`,
      );
    } else if (result.status === "skipped") {
      console.log(
        `${ansi.yellow("-")} ${result.name}: ${result.reason ?? "skipped"}`,
      );
    } else {
      console.log(
        `${ansi.red("x")} ${result.name}: ${result.reason ?? "failed"}`,
      );
    }
  }
  console.log(
    `${summary.updatedCount} updated, ${summary.skippedCount} skipped, ${summary.failedCount} failed`,
  );
}

async function cmdLibraryUpdate(args: ParsedArgs) {
  const names: string[] = [];
  if (args.positional.length > 0) {
    names.push(...args.positional);
  }
  if (args.subcommand && args.subcommand !== "update") {
    names.unshift(args.subcommand);
  }

  if (!args.flags.all && names.length === 0) {
    error(
      "Missing skill name. Use: asm library update <skill> or asm library update --all",
    );
    process.exit(2);
  }
  if (args.flags.all && names.length > 0) {
    error(
      "Use either asm library update <skill> or asm library update --all, not both.",
    );
    process.exit(2);
  }

  const summary = await updateLibrarySkills(args.flags.all ? null : names);

  if (args.flags.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printLibraryUpdateHuman(summary);
  }

  if (summary.failedCount > 0) {
    process.exit(1);
  }
}
```

Adjust `cmdLibrary` so it dispatches:

```ts
async function cmdLibrary(args: ParsedArgs) {
  if (args.flags.help) {
    printLibraryHelp();
    return;
  }

  if (args.subcommand === "list") {
    const rows = await listLibrarySkills();
    if (args.flags.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    printLibraryList(rows);
    return;
  }

  if (args.subcommand === "update") {
    await cmdLibraryUpdate(args);
    return;
  }

  error(
    "Missing or unknown library subcommand. Use: asm library list or asm library update",
  );
  process.exit(2);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npx vitest run src/cli.test.ts -t "library update"
npx vitest run src/library.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/library.ts src/cli.ts src/cli.test.ts
git commit -m "Add library update command"
```

## Task 5: Final Verification and PR Update

**Files:**

- Modify only if verification reveals a real issue.

- [ ] **Step 1: Run focused verification**

Run:

```bash
npx vitest run src/library.test.ts src/cli.test.ts src/updater.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run final status check**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: clean branch with the new deactivate/update commits on top.

- [ ] **Step 3: Update PR #320 body**

Run:

```bash
gh pr view 320 --repo luongnv89/asm --json body --jq .body > /tmp/asm-pr-320-body.md
```

Edit the body so the summary also mentions:

```md
- Add `asm deactivate` to safely remove library activation symlinks without deleting central library copies.
- Add `asm library update` to refresh centrally installed skills from recorded source metadata.
```

Keep the test plan lines:

```md
- [x] `npx vitest run src/library.test.ts src/cli.test.ts src/updater.test.ts`
- [x] `npm run typecheck`
```

Then run:

```bash
gh pr edit 320 --repo luongnv89/asm --body-file /tmp/asm-pr-320-body.md
```

- [ ] **Step 4: Push**

Run:

```bash
git push
```

Expected: branch `add-neutral-local-library-activation` updates PR #320.
