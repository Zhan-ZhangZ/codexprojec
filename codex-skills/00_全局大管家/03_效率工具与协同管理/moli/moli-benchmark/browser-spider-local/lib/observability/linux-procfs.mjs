import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// Linux-only collection primitives. The browser-spider runner reaches this
// module through the observability facade rather than depending on procfs.
const KIB = 1024;

function numericValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getconf(name, fallback) {
  try {
    return numericValue(
      execFileSync('getconf', [name], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim(),
      fallback
    );
  } catch (_error) {
    return fallback;
  }
}

export function parseProcStat(text) {
  const open = text.indexOf('(');
  const close = text.lastIndexOf(')');
  if (open <= 0 || close <= open) {
    throw new Error('invalid /proc stat record');
  }
  const pid = Number(text.slice(0, open).trim());
  const fields = text.slice(close + 1).trim().split(/\s+/);
  if (!Number.isInteger(pid) || fields.length < 22) {
    throw new Error('truncated /proc stat record');
  }
  const ppid = Number(fields[1]);
  const userTicks = Number(fields[11]);
  const systemTicks = Number(fields[12]);
  const threadCount = Number(fields[17]);
  const startTimeTicks = Number(fields[19]);
  const rssPages = Number(fields[21]);
  if (
    !Number.isInteger(ppid)
    || !Number.isFinite(userTicks)
    || !Number.isFinite(systemTicks)
    || !Number.isFinite(startTimeTicks)
  ) {
    throw new Error('non-numeric /proc stat field');
  }
  return {
    pid,
    ppid,
    state: fields[0],
    cpu_ticks: userTicks + systemTicks,
    start_time_ticks: startTimeTicks,
    thread_count: Number.isFinite(threadCount) ? threadCount : null,
    rss_pages: Number.isFinite(rssPages) ? rssPages : null
  };
}

function statusKib(text, key) {
  const match = new RegExp(`^${key}:\\s+(\\d+)\\s+kB$`, 'm').exec(text);
  return match ? Number(match[1]) : null;
}

function statusInteger(text, key) {
  const match = new RegExp(`^${key}:\\s+(\\d+)$`, 'm').exec(text);
  return match ? Number(match[1]) : null;
}

export function parseProcStatus(text) {
  const rssKib = statusKib(text, 'VmRSS');
  return {
    rss_bytes: rssKib === null ? null : rssKib * KIB,
    thread_count: statusInteger(text, 'Threads')
  };
}

export function parseSmapsRollup(text) {
  const pssKib = statusKib(text, 'Pss');
  return pssKib === null ? null : pssKib * KIB;
}

function processIdentity(process) {
  return `${process.pid}:${process.start_time_ticks}`;
}

export class LinuxProcfs {
  constructor({
    procRoot = '/proc',
    pageSize = getconf('PAGESIZE', 4096)
  } = {}) {
    this.procRoot = procRoot;
    this.pageSize = pageSize;
  }

  readStat(pid) {
    return parseProcStat(fs.readFileSync(`${this.procRoot}/${pid}/stat`, 'utf8'));
  }

  scanProcesses() {
    const processes = new Map();
    for (const entry of fs.readdirSync(this.procRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) {
        continue;
      }
      try {
        const process = this.readStat(Number(entry.name));
        processes.set(process.pid, process);
      } catch (_error) {
        // Processes routinely disappear between readdir() and read(). They were
        // not part of a stable snapshot and must simply be omitted.
      }
    }
    return processes;
  }

  readMemory(process) {
    let status = null;
    try {
      status = parseProcStatus(
        fs.readFileSync(`${this.procRoot}/${process.pid}/status`, 'utf8')
      );
    } catch (_error) {
      status = null;
    }

    let pssBytes = null;
    try {
      pssBytes = parseSmapsRollup(
        fs.readFileSync(`${this.procRoot}/${process.pid}/smaps_rollup`, 'utf8')
      );
    } catch (_error) {
      pssBytes = null;
    }

    const statRss = process.rss_pages === null
      ? null
      : Math.max(0, process.rss_pages) * this.pageSize;
    return {
      rss_bytes: status?.rss_bytes ?? statRss,
      pss_bytes: pssBytes,
      thread_count: status?.thread_count ?? process.thread_count
    };
  }
}

export function processTrees(processes, roots) {
  const children = new Map();
  for (const process of processes.values()) {
    const siblings = children.get(process.ppid) ?? [];
    siblings.push(process.pid);
    children.set(process.ppid, siblings);
  }

  const trees = new Map();
  for (const [label, root] of roots) {
    const currentRoot = processes.get(root.pid);
    if (
      !currentRoot
      || (
        root.start_time_ticks !== null
        && currentRoot.start_time_ticks !== root.start_time_ticks
      )
    ) {
      trees.set(label, new Set());
      continue;
    }
    if (root.start_time_ticks === null) {
      root.start_time_ticks = currentRoot.start_time_ticks;
    }

    const members = new Set();
    const pending = [root.pid];
    while (pending.length > 0) {
      const pid = pending.pop();
      if (members.has(pid)) {
        continue;
      }
      members.add(pid);
      for (const child of children.get(pid) ?? []) {
        pending.push(child);
      }
    }
    trees.set(label, members);
  }
  return trees;
}

function aggregateTree({
  members,
  processes,
  memoryByPid,
  previousTicks,
  elapsedSeconds,
  ticksPerSecond
}) {
  let rssBytes = 0;
  let rssProcessCount = 0;
  let pssBytes = 0;
  let pssProcessCount = 0;
  let threadCount = 0;
  let cpuDeltaTicks = 0;
  let cpuProcessCount = 0;

  for (const pid of members) {
    const process = processes.get(pid);
    if (!process) {
      continue;
    }
    const memory = memoryByPid.get(pid);
    if (memory?.rss_bytes !== null && memory?.rss_bytes !== undefined) {
      rssBytes += memory.rss_bytes;
      rssProcessCount += 1;
    }
    if (memory?.pss_bytes !== null && memory?.pss_bytes !== undefined) {
      pssBytes += memory.pss_bytes;
      pssProcessCount += 1;
    }
    threadCount += memory?.thread_count ?? process.thread_count ?? 0;

    const previous = previousTicks.get(processIdentity(process));
    if (previous !== undefined && process.cpu_ticks >= previous) {
      cpuDeltaTicks += process.cpu_ticks - previous;
      cpuProcessCount += 1;
    }
  }

  const processCount = members.size;
  const cpuPercent = elapsedSeconds > 0 && cpuProcessCount > 0
    ? cpuDeltaTicks / ticksPerSecond / elapsedSeconds * 100
    : null;
  return {
    cpu_percent: cpuPercent,
    rss_bytes: rssProcessCount === processCount ? rssBytes : null,
    rss_process_count: rssProcessCount,
    pss_bytes: pssProcessCount === processCount ? pssBytes : null,
    pss_process_count: pssProcessCount,
    process_count: processCount,
    thread_count: threadCount
  };
}

export class LinuxProcessTreeCollector {
  constructor({
    procfs = new LinuxProcfs(),
    ticksPerSecond = getconf('CLK_TCK', 100),
    intervalMs = 500,
    clock = () => performance.now()
  } = {}) {
    this.procfs = procfs;
    this.ticksPerSecond = ticksPerSecond;
    this.intervalMs = intervalMs;
    this.clock = clock;
    this.roots = new Map();
    this.previousTicks = new Map();
    this.previousElapsedMs = null;
    this.samples = [];
    this.errors = {};
  }

  addRoot(label, pid) {
    let startTimeTicks = null;
    try {
      startTimeTicks = this.procfs.readStat(pid).start_time_ticks;
    } catch (_error) {
      // The process may have been registered in the short window before procfs
      // exposes it. The first successful scan binds the immutable start time.
    }
    this.roots.set(label, {
      pid,
      start_time_ticks: startTimeTicks
    });
  }

  recordError(kind) {
    this.errors[kind] = (this.errors[kind] ?? 0) + 1;
  }

  sample({
    elapsedMs,
    wallTime = new Date().toISOString(),
    kind = 'periodic'
  }) {
    const captureStarted = this.clock();
    let processes;
    try {
      processes = this.procfs.scanProcesses();
    } catch (_error) {
      this.recordError('proc_scan_failed');
      const sample = {
        elapsed_ms: elapsedMs,
        wall_time: wallTime,
        kind,
        capture_duration_ms: this.clock() - captureStarted,
        total: null,
        workers: {}
      };
      this.samples.push(sample);
      return sample;
    }

    const trees = processTrees(processes, this.roots);
    const union = new Set();
    for (const members of trees.values()) {
      for (const pid of members) {
        union.add(pid);
      }
    }

    const memoryByPid = new Map();
    for (const pid of union) {
      const process = processes.get(pid);
      if (!process) {
        continue;
      }
      const memory = this.procfs.readMemory(process);
      if (memory.rss_bytes === null) {
        this.recordError('rss_unavailable');
      }
      if (memory.pss_bytes === null) {
        this.recordError('pss_unavailable');
      }
      memoryByPid.set(pid, memory);
    }

    const elapsedDeltaMs = this.previousElapsedMs === null
      ? 0
      : Math.max(0, elapsedMs - this.previousElapsedMs);
    // A forced final memory snapshot can happen immediately after a periodic
    // sample. Do not turn a single scheduler tick in that tiny window into an
    // artificial CPU spike.
    const elapsedSeconds = elapsedDeltaMs >= this.intervalMs * 0.8
      ? elapsedDeltaMs / 1000
      : 0;
    const aggregate = (members) => aggregateTree({
      members,
      processes,
      memoryByPid,
      previousTicks: this.previousTicks,
      elapsedSeconds,
      ticksPerSecond: this.ticksPerSecond
    });
    const workers = {};
    for (const [label, members] of trees) {
      workers[label] = aggregate(members);
    }

    const total = aggregate(union);
    const sample = {
      elapsed_ms: elapsedMs,
      wall_time: wallTime,
      kind,
      capture_duration_ms: 0,
      total,
      workers
    };
    sample.capture_duration_ms = this.clock() - captureStarted;
    this.samples.push(sample);
    this.previousElapsedMs = elapsedMs;
    this.previousTicks = new Map(
      [...processes.values()].map((process) => [
        processIdentity(process),
        process.cpu_ticks
      ])
    );
    return sample;
  }

  result() {
    return {
      platform: process.platform,
      method: 'linux_procfs_process_tree',
      interval_ms: this.intervalMs,
      cpu_ticks_per_second: this.ticksPerSecond,
      host_logical_cpu_count: os.cpus().length,
      roots: Object.fromEntries(this.roots),
      errors: this.errors,
      samples: this.samples
    };
  }
}
