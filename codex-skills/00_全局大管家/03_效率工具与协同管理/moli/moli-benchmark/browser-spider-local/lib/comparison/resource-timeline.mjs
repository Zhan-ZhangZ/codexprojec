// Resource timelines cross an untrusted artifact boundary before the
// default-branch renderer turns them into GitHub Markdown. Keep extraction,
// downsampling, validation, and fixed Mermaid generation in one module so the
// local comment and trusted PR comment cannot drift.

const MAX_TIMELINE_POINTS = 40;
const MAX_TIMELINE_SECONDS = 2 * 60 * 60;
const MAX_CPU_PERCENT = 100_000;
const MAX_MEMORY_MIB = 1024 * 1024;
const BYTES_PER_MIB = 1024 * 1024;

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function maximum(values) {
  const present = values.map(finite).filter((value) => value !== null);
  return present.length > 0 ? Math.max(...present) : null;
}

function boundedMetric(value, maximum) {
  const number = finite(value);
  return number !== null && number >= 0 && number <= maximum ? number : null;
}

function normalizeResourceSample(sample) {
  const elapsedMs = boundedMetric(sample?.elapsed_ms, MAX_TIMELINE_SECONDS * 1000);
  if (elapsedMs === null) {
    return null;
  }
  const total = sample?.total;
  const cpuPercent = boundedMetric(total?.cpu_percent, MAX_CPU_PERCENT);
  const rssBytes = boundedMetric(total?.rss_bytes, MAX_MEMORY_MIB * BYTES_PER_MIB);
  const pssBytes = boundedMetric(total?.pss_bytes, MAX_MEMORY_MIB * BYTES_PER_MIB);
  if (cpuPercent === null && rssBytes === null && pssBytes === null) {
    return null;
  }
  return {
    elapsed_seconds: round(elapsedMs / 1000, 3),
    cpu_percent: round(cpuPercent, 2),
    rss_mib: round(rssBytes === null ? null : rssBytes / BYTES_PER_MIB, 2),
    pss_mib: round(pssBytes === null ? null : pssBytes / BYTES_PER_MIB, 2)
  };
}

function mergeSameElapsedSamples(samples) {
  const merged = [];
  for (const sample of samples) {
    const previous = merged.at(-1);
    if (previous?.elapsed_seconds === sample.elapsed_seconds) {
      for (const field of ['cpu_percent', 'rss_mib', 'pss_mib']) {
        if (sample[field] !== null) {
          previous[field] = sample[field];
        }
      }
    } else {
      merged.push(sample);
    }
  }
  return merged;
}

function extremeIndices(samples) {
  const indices = new Set([0, samples.length - 1]);
  for (const field of ['cpu_percent', 'rss_mib', 'pss_mib']) {
    let minimum = null;
    let maximum = null;
    for (let index = 0; index < samples.length; index += 1) {
      const value = finite(samples[index][field]);
      if (value === null) {
        continue;
      }
      if (minimum === null || value < samples[minimum][field]) {
        minimum = index;
      }
      if (maximum === null || value > samples[maximum][field]) {
        maximum = index;
      }
    }
    if (minimum !== null) {
      indices.add(minimum);
    }
    if (maximum !== null) {
      indices.add(maximum);
    }
  }
  return indices;
}

function downsampleResourceTimeline(samples) {
  if (samples.length <= MAX_TIMELINE_POINTS) {
    return samples;
  }

  const selected = extremeIndices(samples);
  const remaining = MAX_TIMELINE_POINTS - selected.size;
  for (let index = 1; index <= remaining; index += 1) {
    selected.add(Math.round((index * (samples.length - 1)) / (remaining + 1)));
  }

  // An evenly spaced point can collide with an extremum. Fill any resulting
  // holes without removing the extrema that expose short-lived spikes.
  if (selected.size < MAX_TIMELINE_POINTS) {
    const stride = (samples.length - 1) / (MAX_TIMELINE_POINTS - 1);
    for (let index = 0; index < MAX_TIMELINE_POINTS && selected.size < MAX_TIMELINE_POINTS; index += 1) {
      selected.add(Math.round(index * stride));
    }
  }

  return [...selected]
    .sort((left, right) => left - right)
    .map((index) => samples[index]);
}

export function buildResourceTimeline(reportData) {
  const services = (reportData.services ?? [])
    .filter((service) => Array.isArray(service.resources?.samples));
  if (services.length !== 1) {
    return null;
  }
  const samples = services[0].resources.samples
    .map(normalizeResourceSample)
    .filter((sample) => sample !== null)
    .sort((left, right) => left.elapsed_seconds - right.elapsed_seconds);
  const merged = mergeSameElapsedSamples(samples);
  return merged.length >= 2 ? downsampleResourceTimeline(merged) : null;
}

function trustedResourceTimeline(run) {
  const timeline = run?.resource_timeline;
  if (
    run?.availability !== 'available'
    || !Array.isArray(timeline)
    || timeline.length < 2
    || timeline.length > MAX_TIMELINE_POINTS
  ) {
    return null;
  }

  const points = [];
  let previousElapsed = -1;
  for (const point of timeline) {
    const elapsedSeconds = boundedMetric(point?.elapsed_seconds, MAX_TIMELINE_SECONDS);
    if (elapsedSeconds === null || elapsedSeconds <= previousElapsed) {
      return null;
    }
    const normalized = {
      elapsed_seconds: round(elapsedSeconds, 3),
      cpu_percent: round(boundedMetric(point?.cpu_percent, MAX_CPU_PERCENT), 2),
      rss_mib: round(boundedMetric(point?.rss_mib, MAX_MEMORY_MIB), 2),
      pss_mib: round(boundedMetric(point?.pss_mib, MAX_MEMORY_MIB), 2)
    };
    if (
      normalized.cpu_percent === null
      && normalized.rss_mib === null
      && normalized.pss_mib === null
    ) {
      return null;
    }
    points.push(normalized);
    previousElapsed = elapsedSeconds;
  }
  return points;
}

function niceAxisMaximum(values) {
  const highest = maximum(values);
  if (highest === null || highest <= 0) {
    return 1;
  }
  const padded = highest * 1.05;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return round(step * magnitude, 3);
}

function mermaidNumber(value) {
  const number = finite(value);
  return String(number === null || Object.is(number, -0) ? 0 : number);
}

function mermaidLineChart({ title, yAxis, points, fields }) {
  if (points.length < 2 || fields.length === 0) {
    return '';
  }
  const values = fields.flatMap((field) => points.map((point) => point[field]));
  return [
    '```mermaid',
    'xychart-beta',
    `    title "${title}"`,
    `    x-axis "Elapsed seconds" [${points.map((point) => mermaidNumber(point.elapsed_seconds)).join(', ')}]`,
    `    y-axis "${yAxis}" 0 --> ${mermaidNumber(niceAxisMaximum(values))}`,
    ...fields.map((field) => `    line [${points.map((point) => mermaidNumber(point[field])).join(', ')}]`),
    '```'
  ].join('\n');
}

function resourceChartsForRun(label, run) {
  const timeline = trustedResourceTimeline(run);
  if (!timeline) {
    return '';
  }

  const cpuPoints = timeline.filter((point) => point.cpu_percent !== null);
  const pairedMemoryPoints = timeline.filter(
    (point) => point.rss_mib !== null && point.pss_mib !== null
  );
  const rssPoints = timeline.filter((point) => point.rss_mib !== null);
  const pssPoints = timeline.filter((point) => point.pss_mib !== null);
  const hasCompletePss = rssPoints.length >= 2
    && pairedMemoryPoints.length === rssPoints.length;
  const memoryPoints = hasCompletePss
    ? rssPoints
    : rssPoints.length >= 2
      ? rssPoints
      : pssPoints;
  const memoryFields = hasCompletePss
    ? ['rss_mib', 'pss_mib']
    : rssPoints.length >= 2
      ? ['rss_mib']
      : pssPoints.length >= 2
        ? ['pss_mib']
        : [];
  const memoryTitle = memoryFields.length === 2
    ? `${label} memory: RSS then PSS`
    : `${label} memory: ${memoryFields[0] === 'pss_mib' ? 'PSS' : 'RSS'}`;
  const charts = [
    mermaidLineChart({
      title: `${label} CPU`,
      yAxis: 'CPU percent',
      points: cpuPoints,
      fields: ['cpu_percent']
    }),
    mermaidLineChart({
      title: memoryTitle,
      yAxis: 'Memory MiB',
      points: memoryPoints,
      fields: memoryFields
    })
  ].filter(Boolean);
  return charts.length > 0 ? [`#### ${label}`, ...charts].join('\n\n') : '';
}

export function renderResourceTimelineSection(suite) {
  const charts = [
    resourceChartsForRun('Base', suite.base),
    resourceChartsForRun('HEAD', suite.head)
  ].filter(Boolean);
  if (charts.length === 0) {
    return '';
  }
  return [
    '### CPU and memory timelines',
    '',
    `These are bounded ${MAX_TIMELINE_POINTS}-point views of the same complete process-tree samples used by the HTML report. CPU uses 100% per occupied logical core; memory lines are RSS first and PSS second when complete PSS samples are available.`,
    '',
    charts.join('\n\n')
  ].join('\n');
}
