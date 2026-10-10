import fs from 'node:fs';
import path from 'node:path';

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function resourceSamplesCsv(resourceData) {
  const rows = [[
    'elapsed_ms',
    'wall_time',
    'kind',
    'cpu_percent',
    'rss_bytes',
    'rss_process_count',
    'pss_bytes',
    'pss_process_count',
    'process_count',
    'thread_count',
    'capture_duration_ms'
  ]];
  for (const sample of resourceData.samples ?? []) {
    rows.push([
      sample.elapsed_ms,
      sample.wall_time,
      sample.kind,
      sample.total?.cpu_percent,
      sample.total?.rss_bytes,
      sample.total?.rss_process_count,
      sample.total?.pss_bytes,
      sample.total?.pss_process_count,
      sample.total?.process_count,
      sample.total?.thread_count,
      sample.capture_duration_ms
    ]);
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

export function writeResourceArtifacts(outputDir, resourceData) {
  const jsonPath = path.join(outputDir, 'resource-samples.json');
  const csvPath = path.join(outputDir, 'resource-samples.csv');
  writeJson(jsonPath, resourceData);
  fs.writeFileSync(csvPath, resourceSamplesCsv(resourceData), 'utf8');
  return { jsonPath, csvPath };
}

function reportConfig(args) {
  return {
    targets: args.targets,
    workers: args.workers,
    parallelism: args.parallelism,
    runs: args.runs,
    cases: args.cases,
    site_limit: args.siteLimit,
    site_source: args.siteSource,
    goto_timeout_ms: args.gotoTimeoutMs,
    resource_sampling: args.sampleResources,
    sample_interval_ms: args.sampleIntervalMs
  };
}

function siteKey(caseName, site) {
  return `${caseName ?? ''}\u0000${site ?? ''}`;
}

function completedSiteIntervals(markers) {
  const pending = new Map();
  const completed = new Map();
  for (const marker of markers ?? []) {
    const key = siteKey(marker.case_name, marker.site);
    if (marker.type === 'site-start') {
      const queue = pending.get(key) ?? [];
      queue.push(marker);
      pending.set(key, queue);
      continue;
    }
    if (marker.type !== 'site-done') {
      continue;
    }
    const start = pending.get(key)?.shift();
    if (!start) {
      continue;
    }
    const queue = completed.get(key) ?? [];
    queue.push({
      worker: marker.worker ?? start.worker ?? null,
      start_ms: start.elapsed_ms,
      end_ms: marker.elapsed_ms,
      duration_ms: Math.max(0, marker.elapsed_ms - start.elapsed_ms),
      marker_success: marker.success,
      marker_item_count: marker.item_count
    });
    completed.set(key, queue);
  }
  return completed;
}

function conciseError(value) {
  if (!value) {
    return null;
  }
  return String(value)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(' | at ')[0]
    .slice(0, 500);
}

function siteOutcome(site) {
  const itemCount = Number(site.item_count) || 0;
  if (site.item_classification === 'mismatched') {
    return 'mismatched';
  }
  if (itemCount > 0 && site.timed_out) {
    return 'timeout_with_items';
  }
  if (itemCount > 0 && site.navigation_failed) {
    return 'navigation_error_with_items';
  }
  if (itemCount > 0 && site.http_error) {
    return 'http_error_with_items';
  }
  if (itemCount > 0) {
    return 'extracted';
  }
  if (site.timed_out) {
    return 'timeout_empty';
  }
  if (site.navigation_failed) {
    return 'navigation_error_empty';
  }
  if (site.http_error) {
    return 'http_error_empty';
  }
  if (site.snapshot_error_summary) {
    return 'snapshot_error_empty';
  }
  return 'empty';
}

function normalizeSite(meta, interval) {
  const gotoError = conciseError(meta.gotoError);
  const snapshotError = conciseError(meta.htmlSaveError);
  const responseStatus = Number.isFinite(meta.responseStatus)
    ? meta.responseStatus
    : null;
  const site = {
    case_name: meta.caseName ?? null,
    site: meta.site ?? null,
    url: meta.url ?? null,
    worker: interval?.worker ?? null,
    start_ms: interval?.start_ms ?? null,
    end_ms: interval?.end_ms ?? null,
    duration_ms: interval?.duration_ms ?? null,
    goto_ok: typeof meta.gotoOk === 'boolean' ? meta.gotoOk : null,
    error_summary: gotoError,
    timed_out: Boolean(gotoError && /timeout/i.test(gotoError)),
    navigation_failed: meta.gotoOk === false,
    response_status: responseStatus,
    http_error: responseStatus !== null && responseStatus >= 400,
    final_url: meta.finalUrlAfterExtract ?? meta.finalUrlAfterGoto ?? null,
    title: meta.title ?? null,
    snapshot_saved: Boolean(meta.htmlSha256),
    snapshot_characters: Number.isFinite(meta.htmlLength) ? meta.htmlLength : null,
    snapshot_sha256: meta.htmlSha256 ?? null,
    snapshot_error_summary: snapshotError,
    expected_item_count: Number.isInteger(meta.expectedItemCount)
      ? meta.expectedItemCount
      : null,
    item_count: Number.isFinite(meta.itemCount)
      ? meta.itemCount
      : interval?.marker_item_count ?? 0,
    item_classification: meta.itemClassification ?? null,
    first_item_title: meta.items?.[0]?.title ?? null,
    first_item_link: meta.items?.[0]?.link ?? null
  };
  site.outcome = siteOutcome(site);
  return site;
}

function fallbackSites(intervals) {
  const rows = [];
  for (const [key, queue] of intervals) {
    const [caseName, site] = key.split('\u0000');
    for (const interval of queue) {
      const itemCount = Number(interval.marker_item_count) || 0;
      rows.push({
        case_name: caseName,
        site,
        url: null,
        worker: interval.worker,
        start_ms: interval.start_ms,
        end_ms: interval.end_ms,
        duration_ms: interval.duration_ms,
        goto_ok: null,
        error_summary: null,
        timed_out: false,
        navigation_failed: false,
        response_status: null,
        http_error: false,
        final_url: null,
        title: null,
        snapshot_saved: null,
        snapshot_characters: null,
        snapshot_sha256: null,
        snapshot_error_summary: null,
        expected_item_count: null,
        item_count: itemCount,
        item_classification: null,
        first_item_title: null,
        first_item_link: null,
        outcome: itemCount > 0 ? 'extracted' : 'empty'
      });
    }
  }
  return rows;
}

export function buildSiteDiagnostics(result) {
  const intervals = completedSiteIntervals(result.resourceData?.markers);
  const rows = [];
  for (const caseResult of result.metadata?.cases ?? []) {
    for (const meta of caseResult.siteMeta ?? []) {
      const interval = intervals.get(siteKey(meta.caseName, meta.site))?.shift();
      rows.push(normalizeSite(meta, interval));
    }
  }
  return rows.length > 0 ? rows : fallbackSites(intervals);
}

export function buildSpiderReportData({ runDir, args, results }) {
  return {
    schema: 'moli.browser-spider.report.v3',
    generated_at: new Date().toISOString(),
    run_dir: runDir,
    config: reportConfig(args),
    services: results.map((result) => ({
      target: result.target,
      service: result.service,
      success: result.success,
      error: result.error ?? null,
      evaluation: result.report ?? null,
      leakage: result.leakage ?? null,
      resources: result.resourceData ?? null,
      sites: buildSiteDiagnostics(result),
      artifacts: {
        directory: path.relative(runDir, result.outputDir),
        samples_json: path.relative(
          runDir,
          path.join(result.outputDir, 'resource-samples.json')
        ),
        samples_csv: path.relative(
          runDir,
          path.join(result.outputDir, 'resource-samples.csv')
        ),
        events_log: path.relative(runDir, path.join(result.outputDir, 'events.log')),
        evaluation_json: path.relative(
          runDir,
          path.join(result.outputDir, 'service-evaluation.json')
        )
      }
    }))
  };
}
