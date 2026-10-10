import fs from 'node:fs';
import path from 'node:path';

import {
  buildSpiderReportData,
  writeJson
} from './report-data.mjs';

function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function spiderReportDocument(payload) {
  const data = jsonForScript(payload);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Browser Spider Resource Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.9/dist/chart.umd.min.js"></script>
<style>
:root {
  color-scheme: dark;
  --page: #08111f;
  --page-soft: #0d192a;
  --panel: rgba(18, 31, 50, .88);
  --panel-strong: #14243a;
  --ink: #f5f7fb;
  --muted: #94a7bd;
  --line: rgba(151, 171, 198, .18);
  --cyan: #49d6d1;
  --blue: #6aa8ff;
  --violet: #aa8cff;
  --amber: #ffbf69;
  --green: #59d499;
  --red: #ff7b87;
  --shadow: 0 22px 60px rgba(0, 0, 0, .28);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(circle at 12% -10%, rgba(73, 214, 209, .16), transparent 34rem),
    radial-gradient(circle at 92% 0%, rgba(106, 168, 255, .16), transparent 38rem),
    var(--page);
  color: var(--ink);
  font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a { color: var(--cyan); }
.shell { width: min(1440px, calc(100% - 40px)); margin: 0 auto; }
.hero { padding: 56px 0 34px; }
.eyebrow {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--cyan);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--cyan); }
h1 { margin: 13px 0 10px; max-width: 900px; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; letter-spacing: -.045em; }
.lede { max-width: 850px; margin: 0; color: var(--muted); font-size: 17px; }
.run-meta { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 24px; }
.chip, .status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, .035);
  color: var(--muted);
  font-size: 12px;
}
.status.good { color: var(--green); border-color: rgba(89, 212, 153, .35); background: rgba(89, 212, 153, .08); }
.status.warn { color: var(--amber); border-color: rgba(255, 191, 105, .35); background: rgba(255, 191, 105, .08); }
.status.bad { color: var(--red); border-color: rgba(255, 123, 135, .35); background: rgba(255, 123, 135, .08); }
.status.neutral { color: var(--muted); }
.overview-grid, .metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}
.metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.card, .panel {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(24, 42, 67, .92), rgba(13, 26, 44, .9));
  box-shadow: var(--shadow);
}
.card { min-height: 118px; padding: 18px; }
.card .label { color: var(--muted); font-size: 12px; letter-spacing: .03em; text-transform: uppercase; }
.card .value { margin-top: 8px; font-size: clamp(22px, 2.5vw, 32px); font-weight: 760; letter-spacing: -.035em; }
.card .detail { margin-top: 4px; color: var(--muted); font-size: 12px; }
.section { margin: 24px 0 44px; }
.section-title { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin: 0 2px 14px; }
.section-title h2 { margin: 0; font-size: 24px; letter-spacing: -.02em; }
.section-title p { margin: 0; color: var(--muted); }
.panel { padding: 20px; overflow: hidden; }
.panel + .panel { margin-top: 14px; }
.service-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 15px; }
.service-head h2 { margin: 0; font-size: 25px; letter-spacing: -.025em; }
.service-links { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; }
.charts { display: grid; grid-template-columns: 1.35fr 1fr; gap: 14px; margin-top: 14px; }
.charts.equal { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.charts.site-charts { grid-template-columns: minmax(0, 1.7fr) minmax(300px, .7fr); }
.chart-panel { min-width: 0; height: 350px; padding: 17px; border: 1px solid var(--line); border-radius: 15px; background: rgba(5, 13, 25, .48); }
.chart-panel.tall { height: 520px; }
.chart-panel.compact { height: 330px; }
.chart-panel h3 { margin: 0 0 10px; color: var(--muted); font-size: 13px; font-weight: 680; }
.chart-frame { position: relative; height: 292px; }
.chart-panel.tall .chart-frame { height: 462px; }
.chart-panel.compact .chart-frame { height: 272px; }
.notice { padding: 16px; border: 1px dashed rgba(255, 191, 105, .48); border-radius: 12px; color: var(--amber); background: rgba(255, 191, 105, .06); }
.health { margin-top: 14px; color: var(--muted); font-size: 12px; }
.table-wrap { overflow-x: auto; margin-top: 14px; border: 1px solid var(--line); border-radius: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 11px 13px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
th:first-child, td:first-child { text-align: left; }
th { color: var(--muted); background: rgba(4, 12, 22, .44); font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
tr:last-child td { border-bottom: 0; }
.site-name { font-weight: 700; color: var(--ink); }
.site-url { display: block; max-width: 380px; overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; }
.error-cell { max-width: 500px; overflow: hidden; color: var(--amber); text-align: left; text-overflow: ellipsis; }
.outcome {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}
.outcome::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }
.outcome.extracted::before { background: var(--green); }
.outcome.suspicious::before { background: var(--amber); }
.outcome.empty::before { background: var(--red); }
.phase-strip { display: flex; min-height: 42px; margin-top: 14px; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: #091424; }
.phase { display: grid; place-items: center; min-width: 28px; padding: 8px 4px; border-right: 1px solid rgba(255,255,255,.13); color: #e8f0fa; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.phase:nth-child(4n+1) { background: rgba(73, 214, 209, .17); }
.phase:nth-child(4n+2) { background: rgba(106, 168, 255, .17); }
.phase:nth-child(4n+3) { background: rgba(170, 140, 255, .17); }
.phase:nth-child(4n+4) { background: rgba(255, 191, 105, .17); }
details { margin-top: 14px; border: 1px solid var(--line); border-radius: 14px; background: rgba(5, 13, 25, .28); }
summary { padding: 13px 15px; color: var(--muted); cursor: pointer; font-weight: 680; }
details .table-wrap { margin: 0; border-width: 1px 0 0; border-radius: 0; }
.footer { padding: 2px 0 48px; color: var(--muted); font-size: 12px; }
code { color: #cbd7e6; }
@media (max-width: 1050px) {
  .overview-grid, .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .charts, .charts.equal, .charts.site-charts { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .shell { width: min(100% - 24px, 1440px); }
  .hero { padding-top: 34px; }
  .overview-grid, .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .chart-panel { height: 310px; }
  .chart-frame { height: 250px; }
}
</style>
</head>
<body>
<div class="shell">
  <header class="hero">
    <span class="eyebrow">Moli benchmark observatory</span>
    <h1>Browser Spider<br>Resource Report</h1>
    <p class="lede">Process-tree resources, crawl quality, site latency and sampling health correlated on one diagnostic timeline.</p>
    <div class="run-meta" id="runMeta"></div>
  </header>
  <main>
    <section class="section">
      <div class="section-title"><div><h2>Run overview</h2><p>Every target and repeated run remains independently visible.</p></div></div>
      <div class="overview-grid" id="overview"></div>
      <div class="panel" style="margin-top:14px">
        <div class="chart-panel" style="height:330px;border:0;padding:0;background:transparent">
          <h3 id="overviewChartTitle">Peak resource comparison</h3>
          <div class="chart-frame" style="height:280px"><canvas id="comparisonChart"></canvas></div>
        </div>
        <div id="chartNotice" class="notice" hidden>Chart.js did not load. All numeric tables and raw artifacts remain available.</div>
      </div>
    </section>
    <div id="services"></div>
  </main>
  <footer class="footer">Generated from <a href="report-data.json">report-data.json</a>. CPU uses 100% per occupied logical core. PSS is blank unless every process was readable.</footer>
</div>
<script id="reportPayload" type="application/json">${data}</script>
<script>
const payload = JSON.parse(document.getElementById('reportPayload').textContent);
const services = payload.services || [];
const colors = {
  cyan: '#49d6d1',
  blue: '#6aa8ff',
  violet: '#aa8cff',
  amber: '#ffbf69',
  green: '#59d499',
  red: '#ff7b87',
  grid: 'rgba(151,171,198,.15)',
  text: '#94a7bd'
};
const h = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const finite = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));
const fmtNumber = (value, digits = 1) => finite(value) ? Number(value).toFixed(digits) : '—';
const fmtCpu = (value) => finite(value) ? fmtNumber(value, 1) + '%' : '—';
const fmtBytes = (value) => {
  if (!finite(value)) return '—';
  const mib = Number(value) / 1024 / 1024;
  return mib >= 1024 ? (mib / 1024).toFixed(2) + ' GiB' : mib.toFixed(1) + ' MiB';
};
const fmtDuration = (value) => {
  if (!finite(value)) return '—';
  const seconds = Number(value) / 1000;
  return seconds >= 60 ? (seconds / 60).toFixed(1) + ' min' : seconds.toFixed(1) + ' s';
};
const statusClass = (ok) => ok ? 'good' : 'bad';
const resourceStatus = (service) => service.resources?.status || 'unavailable';
const summary = (service) => service.resources?.summary || {};
const evaluationSummary = (service) => service.evaluation?.summary || {};
const outcomeDefinitions = {
  extracted: { label: 'Extracted', color: colors.green, className: 'extracted' },
  timeout_with_items: { label: 'Timeout + items', color: colors.amber, className: 'suspicious' },
  navigation_error_with_items: { label: 'Navigation error + items', color: colors.violet, className: 'suspicious' },
  http_error_with_items: { label: 'HTTP error + items', color: '#ff9f7b', className: 'suspicious' },
  mismatched: { label: 'Mismatched items', color: colors.red, className: 'suspicious' },
  empty: { label: 'No items', color: '#63758b', className: 'empty' },
  timeout_empty: { label: 'Timeout, no items', color: colors.red, className: 'empty' },
  navigation_error_empty: { label: 'Navigation error, no items', color: '#e06c86', className: 'empty' },
  http_error_empty: { label: 'HTTP error, no items', color: '#bd698b', className: 'empty' }
};
const outcomeDefinition = (outcome) => outcomeDefinitions[outcome] || {
  label: String(outcome || 'Unknown'),
  color: colors.text,
  className: 'empty'
};

document.getElementById('runMeta').innerHTML = [
  '<span class="chip">' + h(payload.generated_at) + '</span>',
  '<span class="chip">' + h(payload.config.site_source) + ' sites</span>',
  '<span class="chip">' + h(payload.config.workers) + ' worker(s)</span>',
  '<span class="chip">' + h(payload.config.parallelism) + '× case parallelism</span>',
  '<span class="chip">' + h(payload.config.sample_interval_ms) + ' ms samples</span>'
].join('');

document.getElementById('overview').innerHTML = services.map((service) => {
  const metrics = summary(service);
  const evaluation = evaluationSummary(service);
  return '<article class="card">' +
    '<div class="label">' + h(service.service) + '</div>' +
    '<div class="value">' + fmtBytes(metrics.peak_pss_bytes ?? metrics.peak_rss_bytes) + '</div>' +
    '<div class="detail">peak ' + (finite(metrics.peak_pss_bytes) ? 'PSS' : 'RSS') +
    ' · ' + fmtCpu(metrics.peak_cpu_percent) + ' CPU · ' +
    fmtNumber(evaluation.averageFillRate, 1) + '% fill</div></article>';
}).join('') || '<div class="notice">No service results were recorded.</div>';

function caseRows(service) {
  const byCase = new Map((service.evaluation?.files || []).map((row) => [row.caseName, row]));
  return (summary(service).cases || []).map((row) => {
    const correctness = byCase.get(row.case_name) || {};
    return '<tr><td>' + h(row.case_name) + '</td><td>' + fmtDuration(row.end_ms - row.start_ms) +
      '</td><td>' + fmtCpu(row.average_cpu_percent) + '</td><td>' + fmtCpu(row.peak_cpu_percent) +
      '</td><td>' + fmtBytes(row.peak_rss_bytes) + '</td><td>' + fmtBytes(row.peak_pss_bytes) +
      '</td><td>' + fmtNumber(correctness.fillRate, 1) + '%</td></tr>';
  }).join('');
}

function workerRows(service) {
  return Object.entries(summary(service).workers || {}).map(([label, row]) =>
    '<tr><td>' + h(label) + '</td><td>' + fmtCpu(row.average_cpu_percent) +
    '</td><td>' + fmtCpu(row.peak_cpu_percent) + '</td><td>' + fmtBytes(row.peak_rss_bytes) +
    '</td><td>' + fmtBytes(row.peak_pss_bytes) + '</td><td>' +
    fmtNumber(row.peak_process_count, 0) + '</td><td>' + fmtNumber(row.peak_thread_count, 0) +
    '</td></tr>'
  ).join('');
}

function legacySiteRuns(service) {
  const pending = new Map();
  const rows = [];
  for (const marker of service.resources?.markers || []) {
    const key = [marker.case_name, marker.site, marker.worker].join('\\u0000');
    if (marker.type === 'site-start') {
      const queue = pending.get(key) || [];
      queue.push(marker);
      pending.set(key, queue);
    } else if (marker.type === 'site-done') {
      const queue = pending.get(key) || [];
      const start = queue.shift();
      if (start) {
        rows.push({
          case_name: marker.case_name,
          site: marker.site,
          worker: marker.worker,
          start_ms: start.elapsed_ms,
          duration_ms: marker.elapsed_ms - start.elapsed_ms,
          success: marker.success,
          item_count: marker.item_count,
          outcome: marker.item_count > 0 ? 'extracted' : 'empty'
        });
      }
    }
  }
  return rows;
}

function sites(service) {
  return service.sites?.length ? service.sites : legacySiteRuns(service);
}

function snapshotCell(site) {
  if (site.snapshot_saved) {
    return '<span class="outcome extracted">saved · ' +
      fmtNumber(site.snapshot_characters, 0) + ' chars</span>';
  }
  if (site.snapshot_error_summary) {
    return '<span class="outcome suspicious" title="' + h(site.snapshot_error_summary) +
      '">warning</span>';
  }
  return '—';
}

function outcomeCounts(service) {
  const counts = new Map();
  for (const site of sites(service)) {
    counts.set(site.outcome, (counts.get(site.outcome) || 0) + 1);
  }
  return [...counts].map(([outcome, count]) => ({
    outcome,
    count,
    ...outcomeDefinition(outcome)
  }));
}

function siteRows(service) {
  return sites(service).map((row) => {
    const outcome = outcomeDefinition(row.outcome);
    return '<tr><td>' + h(row.case_name) + '</td><td><span class="site-name">' +
      h(row.site) + '</span><span class="site-url" title="' + h(row.url) + '">' +
      h(row.url || row.final_url || '') + '</span></td><td>' +
      fmtDuration(row.duration_ms) + '</td><td>' + h(row.item_count ?? '—') +
      '</td><td>' + h(row.response_status ?? '—') + '</td><td><span class="outcome ' +
      outcome.className + '">' + h(outcome.label) + '</span></td><td>' +
      snapshotCell(row) + '</td><td class="error-cell" title="' +
      h(row.error_summary) + '">' + h(row.error_summary || '—') + '</td></tr>';
  }
  ).join('');
}

function snapshotRows(service) {
  return sites(service)
    .filter((site) => site.snapshot_error_summary)
    .map((site) =>
      '<tr><td>' + h(site.case_name) + '</td><td><span class="site-name">' +
      h(site.site) + '</span><span class="site-url">' + h(site.url) +
      '</span></td><td>' + fmtDuration(site.duration_ms) + '</td><td>' +
      h(site.item_count ?? '—') + '</td><td class="error-cell" title="' +
      h(site.snapshot_error_summary) + '">' + h(site.snapshot_error_summary) + '</td></tr>'
    )
    .join('');
}

function suspiciousRows(service) {
  return sites(service)
    .filter((site) => outcomeDefinition(site.outcome).className === 'suspicious')
    .map((site) => {
      const outcome = outcomeDefinition(site.outcome);
      return '<tr><td>' + h(site.case_name) + '</td><td><span class="site-name">' +
        h(site.site) + '</span><span class="site-url">' + h(site.url) +
        '</span></td><td><span class="outcome ' + outcome.className + '">' +
        h(outcome.label) + '</span></td><td>' + h(site.item_count) +
        '</td><td>' + h(site.response_status ?? '—') + '</td><td class="error-cell">' +
        h(site.error_summary || '—') + '</td></tr>';
    })
    .join('');
}

function phaseStrip(service) {
  const cases = summary(service).cases || [];
  const total = cases.reduce((sum, row) => sum + Math.max(0, row.end_ms - row.start_ms), 0);
  if (!cases.length || total <= 0) return '';
  return '<div class="phase-strip">' + cases.map((row) => {
    const duration = Math.max(0, row.end_ms - row.start_ms);
    return '<div class="phase" title="' + h(row.case_name + ': ' + fmtDuration(duration)) +
      '" style="flex:' + duration + ' 1 0">' + h(row.case_name) + '</div>';
  }).join('') + '</div>';
}

document.getElementById('services').innerHTML = services.map((service, index) => {
  const metrics = summary(service);
  const evaluation = evaluationSummary(service);
  const leakage = service.leakage || {};
  const sampling = service.resources?.sampling || {};
  const available = resourceStatus(service) === 'available';
  const serviceSites = sites(service);
  const sitesWithItems = serviceSites.filter((site) => Number(site.item_count) > 0).length;
  const savedSnapshots = serviceSites.filter((site) => site.snapshot_saved).length;
  const snapshotWarningCount = serviceSites.filter(
    (site) => Boolean(site.snapshot_error_summary)
  ).length;
  const suspiciousSiteCount = serviceSites.filter(
    (site) => outcomeDefinition(site.outcome).className === 'suspicious'
  ).length;
  const resourceNotice = available ? '' :
    '<div class="notice">Resource sampling is ' + h(resourceStatus(service)) + ': ' +
    h(service.resources?.error || 'no samples were captured') + '</div>';
  return '<section class="section panel" id="service-' + index + '">' +
    '<div class="service-head"><div><h2>' + h(service.service) + '</h2>' +
    '<span class="status ' + statusClass(service.success) + '">' +
    (service.success ? 'crawl completed' : 'crawl failed') + '</span> ' +
    '<span class="status ' + statusClass(available) + '">' + h(resourceStatus(service)) +
    ' sampling</span></div><div class="service-links">' +
    '<a href="' + h(service.artifacts.samples_json) + '">raw JSON</a>' +
    '<a href="' + h(service.artifacts.samples_csv) + '">samples CSV</a>' +
    '<a href="' + h(service.artifacts.events_log) + '">events log</a></div></div>' +
    resourceNotice +
    '<div class="metric-grid">' +
    metricCard('Peak PSS', fmtBytes(metrics.peak_pss_bytes), 'complete process-tree proportional set') +
    metricCard('Peak RSS', fmtBytes(metrics.peak_rss_bytes), 'complete process-tree resident set') +
    metricCard('Peak CPU', fmtCpu(metrics.peak_cpu_percent), '100% equals one logical core') +
    metricCard('Average CPU', fmtCpu(metrics.average_cpu_percent), 'time-weighted over captured intervals') +
    metricCard('Fill rate', fmtNumber(evaluation.averageFillRate, 1) + '%', (evaluation.totalActualRows ?? '—') + ' / ' + (evaluation.totalExpectedRows ?? '—') + ' rows') +
    metricCard('Sites with items', fmtNumber(sitesWithItems, 0) + ' / ' + fmtNumber(serviceSites.length, 0), 'completed site extractions') +
    metricCard('HTML snapshots', fmtNumber(savedSnapshots, 0) + ' / ' + fmtNumber(serviceSites.length, 0), fmtNumber(snapshotWarningCount, 0) + ' archive warning(s)') +
    metricCard('Run duration', fmtDuration(metrics.duration_ms), fmtNumber(metrics.sample_count, 0) + ' resource samples') +
    metricCard('Diagnostic flags', fmtNumber(leakage.suspiciousCount ?? suspiciousSiteCount, 0), (leakage.timeoutWithItems ?? 0) + ' timeout · ' + (leakage.httpErrorWithItems ?? 0) + ' HTTP') +
    '</div>' +
    phaseStrip(service) +
    '<div class="charts"><div class="chart-panel"><h3>Memory timeline · process tree</h3><div class="chart-frame"><canvas id="memory-' + index + '"></canvas></div></div>' +
    '<div class="chart-panel"><h3>CPU timeline · core percentage</h3><div class="chart-frame"><canvas id="cpu-' + index + '"></canvas></div></div></div>' +
    '<div class="charts equal"><div class="chart-panel compact"><h3>Case duration and extraction quality</h3><div class="chart-frame"><canvas id="case-quality-' + index + '"></canvas></div></div>' +
    '<div class="chart-panel compact"><h3>Case resource peaks and average CPU</h3><div class="chart-frame"><canvas id="case-resources-' + index + '"></canvas></div></div></div>' +
    '<div class="charts equal"><div class="chart-panel compact"><h3>Process and thread topology</h3><div class="chart-frame"><canvas id="topology-' + index + '"></canvas></div></div>' +
    '<div class="chart-panel compact"><h3>Sampler collection cost</h3><div class="chart-frame"><canvas id="sampler-' + index + '"></canvas></div></div></div>' +
    '<div class="charts site-charts"><div class="chart-panel tall"><h3>Slowest site phases · top 20</h3><div class="chart-frame"><canvas id="site-duration-' + index + '"></canvas></div></div>' +
    '<div class="chart-panel tall"><h3>Site result distribution</h3><div class="chart-frame"><canvas id="outcomes-' + index + '"></canvas></div></div></div>' +
    '<div class="health">Samples: ' + h(metrics.sample_count ?? 0) + ' · interval: ' +
    h(sampling.interval_ms ?? '—') + ' ms · average collection: ' +
    fmtNumber(metrics.average_capture_duration_ms, 2) + ' ms · max collection: ' +
    fmtNumber(metrics.max_capture_duration_ms, 2) + ' ms · overruns: ' +
    h(metrics.sampling_overrun_count ?? 0) + ' · observed interval: ' +
    fmtNumber(metrics.average_observed_interval_ms, 1) + ' ms avg / ' +
    fmtNumber(metrics.max_observed_interval_ms, 1) + ' ms max · late: ' +
    h(metrics.late_sample_count ?? 0) + ' · process peak: ' +
    h(metrics.peak_process_count ?? '—') + ' · thread peak: ' +
    h(metrics.peak_thread_count ?? '—') + '</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Case</th><th>Duration</th><th>Avg CPU</th><th>Peak CPU</th><th>Peak RSS</th><th>Peak PSS</th><th>Fill</th></tr></thead><tbody>' +
    (caseRows(service) || '<tr><td colspan="7">No completed case interval</td></tr>') +
    '</tbody></table></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Worker tree</th><th>Avg CPU</th><th>Peak CPU</th><th>Peak RSS</th><th>Peak PSS</th><th>Processes</th><th>Threads</th></tr></thead><tbody>' +
    (workerRows(service) || '<tr><td colspan="7">No worker samples</td></tr>') +
    '</tbody></table></div>' +
    '<details><summary>HTML snapshot warnings · ' + snapshotWarningCount +
    '</summary><div class="table-wrap"><table><thead><tr><th>Case</th><th>Site</th><th>Duration</th><th>Items</th><th>Snapshot error</th></tr></thead><tbody>' +
    (snapshotRows(service) || '<tr><td colspan="5">No HTML snapshot warning</td></tr>') +
    '</tbody></table></div></details>' +
    '<details' + (suspiciousSiteCount > 0 ? ' open' : '') + '><summary>Diagnostic sites · ' +
    suspiciousSiteCount + '</summary><div class="table-wrap"><table><thead><tr><th>Case</th><th>Site</th><th>Classification</th><th>Items</th><th>HTTP</th><th>Error</th></tr></thead><tbody>' +
    (suspiciousRows(service) || '<tr><td colspan="6">No suspicious site result</td></tr>') +
    '</tbody></table></div></details>' +
    '<details><summary>All site diagnostics · ' + serviceSites.length +
    ' completed site phase(s)</summary><div class="table-wrap"><table><thead><tr><th>Case</th><th>Site</th><th>Duration</th><th>Items</th><th>HTTP</th><th>Classification</th><th>HTML snapshot</th><th>Error</th></tr></thead><tbody>' +
    (siteRows(service) || '<tr><td colspan="8">No completed site interval</td></tr>') +
    '</tbody></table></div></details>' +
    '</section>';
}).join('');

function metricCard(label, value, detail) {
  return '<article class="card"><div class="label">' + h(label) + '</div><div class="value">' +
    h(value) + '</div><div class="detail">' + h(detail) + '</div></article>';
}

const phaseBands = {
  id: 'phaseBands',
  beforeDatasetsDraw(chart, _args, options) {
    const intervals = options?.intervals || [];
    const x = chart.scales.x;
    const area = chart.chartArea;
    const palette = [
      'rgba(73,214,209,.055)',
      'rgba(106,168,255,.055)',
      'rgba(170,140,255,.055)',
      'rgba(255,191,105,.055)'
    ];
    chart.ctx.save();
    intervals.forEach((interval, index) => {
      const left = x.getPixelForValue(interval.start_ms / 1000);
      const right = x.getPixelForValue(interval.end_ms / 1000);
      chart.ctx.fillStyle = palette[index % palette.length];
      chart.ctx.fillRect(left, area.top, Math.max(0, right - left), area.bottom - area.top);
    });
    chart.ctx.restore();
  },
  afterDatasetsDraw(chart, _args, options) {
    const markers = (options?.markers || []).filter((marker) => marker.type === 'site-start');
    const x = chart.scales.x;
    const area = chart.chartArea;
    chart.ctx.save();
    chart.ctx.strokeStyle = 'rgba(245,247,251,.18)';
    chart.ctx.fillStyle = 'rgba(245,247,251,.5)';
    chart.ctx.lineWidth = 1;
    for (const marker of markers) {
      const position = x.getPixelForValue(marker.elapsed_ms / 1000);
      if (position < area.left || position > area.right) continue;
      chart.ctx.beginPath();
      chart.ctx.moveTo(position, area.top);
      chart.ctx.lineTo(position, area.bottom);
      chart.ctx.stroke();
      chart.ctx.beginPath();
      chart.ctx.moveTo(position - 3, area.top);
      chart.ctx.lineTo(position + 3, area.top);
      chart.ctx.lineTo(position, area.top + 5);
      chart.ctx.closePath();
      chart.ctx.fill();
    }
    chart.ctx.restore();
  }
};

function chartOptions(service, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: colors.text, usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        backgroundColor: '#07111f',
        borderColor: 'rgba(151,171,198,.35)',
        borderWidth: 1,
        callbacks: {
          title(items) { return items.length ? fmtDuration(items[0].parsed.x * 1000) : ''; }
        }
      },
      phaseBands: {
        intervals: summary(service).cases || [],
        markers: service.resources?.markers || []
      }
    },
    scales: {
      x: {
        type: 'linear',
        grid: { color: colors.grid },
        ticks: { color: colors.text, callback: (value) => fmtDuration(value * 1000) },
        title: { display: true, text: 'Elapsed time', color: colors.text }
      },
      y: {
        beginAtZero: true,
        grid: { color: colors.grid },
        ticks: { color: colors.text },
        title: { display: true, text: yLabel, color: colors.text }
      }
    }
  };
}

function points(service, field, scale = 1) {
  return (service.resources?.samples || [])
    .filter((sample) => finite(sample.total?.[field]))
    .map((sample) => ({ x: sample.elapsed_ms / 1000, y: Number(sample.total[field]) / scale }));
}

function samplePoints(service, getter) {
  return (service.resources?.samples || [])
    .map((sample) => ({ x: sample.elapsed_ms / 1000, y: getter(sample) }))
    .filter((point) => finite(point.y));
}

function cadencePoints(service) {
  const periodic = (service.resources?.samples || [])
    .filter((sample) => sample.kind === 'periodic');
  return periodic.slice(1).map((sample, index) => ({
    x: sample.elapsed_ms / 1000,
    y: sample.elapsed_ms - periodic[index].elapsed_ms
  }));
}

function caseSeries(service) {
  const evaluation = new Map(
    (service.evaluation?.files || []).map((row) => [row.caseName, row])
  );
  return (summary(service).cases || []).map((row) => ({
    ...row,
    duration_minutes: (row.end_ms - row.start_ms) / 60000,
    fill_rate: evaluation.get(row.case_name)?.fillRate ?? null,
    actual_rows: evaluation.get(row.case_name)?.actualRows ?? null,
    expected_rows: evaluation.get(row.case_name)?.expectedRows ?? null
  }));
}

function categoricalScales() {
  return {
    x: { grid: { display: false }, ticks: { color: colors.text } },
    y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.text } }
  };
}

function commonPlugins() {
  return {
    legend: { labels: { color: colors.text, usePointStyle: true, boxWidth: 8 } },
    tooltip: {
      backgroundColor: '#07111f',
      borderColor: 'rgba(151,171,198,.35)',
      borderWidth: 1
    }
  };
}

function createOverviewChart() {
  const canvas = document.getElementById('comparisonChart');
  if (services.length === 1) {
    document.getElementById('overviewChartTitle').textContent =
      'Case memory pressure and extraction quality';
    const rows = caseSeries(services[0]);
    return new Chart(canvas, {
      data: {
        labels: rows.map((row) => row.case_name),
        datasets: [
          {
            type: 'bar',
            label: 'Peak PSS MiB',
            data: rows.map((row) => finite(row.peak_pss_bytes)
              ? row.peak_pss_bytes / 1024 / 1024
              : null),
            backgroundColor: colors.cyan,
            borderRadius: 7,
            yAxisID: 'memory'
          },
          {
            type: 'line',
            label: 'Fill rate %',
            data: rows.map((row) => row.fill_rate),
            borderColor: colors.green,
            backgroundColor: colors.green,
            pointRadius: 4,
            tension: .2,
            yAxisID: 'percent'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: commonPlugins(),
        scales: {
          x: categoricalScales().x,
          memory: {
            beginAtZero: true,
            position: 'left',
            grid: { color: colors.grid },
            ticks: { color: colors.text },
            title: { display: true, text: 'Peak PSS MiB', color: colors.text }
          },
          percent: {
            beginAtZero: true,
            max: 100,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: colors.text },
            title: { display: true, text: 'Fill rate %', color: colors.text }
          }
        }
      }
    });
  }
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: services.map((service) => service.service),
      datasets: [
        { label: 'Peak RSS MiB', data: services.map((service) => finite(summary(service).peak_rss_bytes) ? summary(service).peak_rss_bytes / 1024 / 1024 : null), backgroundColor: colors.blue, borderRadius: 7 },
        { label: 'Peak PSS MiB', data: services.map((service) => finite(summary(service).peak_pss_bytes) ? summary(service).peak_pss_bytes / 1024 / 1024 : null), backgroundColor: colors.cyan, borderRadius: 7 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: commonPlugins(),
      scales: {
        ...categoricalScales(),
        y: {
          ...categoricalScales().y,
          title: { display: true, text: 'MiB', color: colors.text }
        }
      }
    }
  });
}

function createCaseQualityChart(service, index) {
  const rows = caseSeries(service);
  return new Chart(document.getElementById('case-quality-' + index), {
    data: {
      labels: rows.map((row) => row.case_name),
      datasets: [
        {
          type: 'bar',
          label: 'Duration min',
          data: rows.map((row) => row.duration_minutes),
          backgroundColor: 'rgba(106,168,255,.72)',
          borderRadius: 6,
          yAxisID: 'duration'
        },
        {
          type: 'line',
          label: 'Fill rate %',
          data: rows.map((row) => row.fill_rate),
          borderColor: colors.green,
          backgroundColor: colors.green,
          pointRadius: 4,
          tension: .2,
          yAxisID: 'percent'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: commonPlugins(),
      scales: {
        x: categoricalScales().x,
        duration: {
          beginAtZero: true,
          position: 'left',
          grid: { color: colors.grid },
          ticks: { color: colors.text },
          title: { display: true, text: 'Duration min', color: colors.text }
        },
        percent: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: colors.text },
          title: { display: true, text: 'Fill rate %', color: colors.text }
        }
      }
    }
  });
}

function createCaseResourceChart(service, index) {
  const rows = caseSeries(service);
  return new Chart(document.getElementById('case-resources-' + index), {
    data: {
      labels: rows.map((row) => row.case_name),
      datasets: [
        {
          type: 'bar',
          label: 'Peak PSS MiB',
          data: rows.map((row) => finite(row.peak_pss_bytes)
            ? row.peak_pss_bytes / 1024 / 1024
            : null),
          backgroundColor: 'rgba(73,214,209,.72)',
          borderRadius: 6,
          yAxisID: 'memory'
        },
        {
          type: 'line',
          label: 'Average CPU %',
          data: rows.map((row) => row.average_cpu_percent),
          borderColor: colors.amber,
          backgroundColor: colors.amber,
          pointRadius: 4,
          tension: .2,
          yAxisID: 'cpu'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: commonPlugins(),
      scales: {
        x: categoricalScales().x,
        memory: {
          beginAtZero: true,
          position: 'left',
          grid: { color: colors.grid },
          ticks: { color: colors.text },
          title: { display: true, text: 'Peak PSS MiB', color: colors.text }
        },
        cpu: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: colors.text },
          title: { display: true, text: 'Average CPU %', color: colors.text }
        }
      }
    }
  });
}

function createTopologyChart(service, index) {
  const options = chartOptions(service, 'Count');
  options.scales.threads = {
    beginAtZero: true,
    position: 'left',
    grid: { color: colors.grid },
    ticks: { color: colors.text },
    title: { display: true, text: 'Threads', color: colors.text }
  };
  options.scales.processes = {
    beginAtZero: true,
    position: 'right',
    grid: { drawOnChartArea: false },
    ticks: { color: colors.text, precision: 0 },
    title: { display: true, text: 'Processes', color: colors.text }
  };
  delete options.scales.y;
  return new Chart(document.getElementById('topology-' + index), {
    type: 'line',
    plugins: [phaseBands],
    data: {
      datasets: [
        {
          label: 'Threads',
          data: points(service, 'thread_count'),
          borderColor: colors.violet,
          backgroundColor: 'rgba(170,140,255,.10)',
          borderWidth: 1.7,
          pointRadius: 0,
          tension: .12,
          yAxisID: 'threads'
        },
        {
          label: 'Processes',
          data: points(service, 'process_count'),
          borderColor: colors.green,
          backgroundColor: colors.green,
          borderWidth: 1.5,
          pointRadius: 0,
          stepped: true,
          yAxisID: 'processes'
        }
      ]
    },
    options
  });
}

function createSamplerChart(service, index) {
  const options = chartOptions(service, 'Collection ms');
  options.scales.collection = {
    beginAtZero: true,
    position: 'left',
    grid: { color: colors.grid },
    ticks: { color: colors.text },
    title: { display: true, text: 'Collection ms', color: colors.text }
  };
  options.scales.cadence = {
    position: 'right',
    grid: { drawOnChartArea: false },
    ticks: { color: colors.text },
    title: { display: true, text: 'Observed interval ms', color: colors.text }
  };
  delete options.scales.y;
  return new Chart(document.getElementById('sampler-' + index), {
    type: 'line',
    plugins: [phaseBands],
    data: {
      datasets: [
        {
          label: 'Collection cost ms',
          data: samplePoints(service, (sample) => sample.capture_duration_ms),
          borderColor: colors.cyan,
          backgroundColor: 'rgba(73,214,209,.11)',
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: .08,
          yAxisID: 'collection'
        },
        {
          label: 'Periodic interval ms',
          data: cadencePoints(service),
          borderColor: colors.blue,
          backgroundColor: colors.blue,
          borderWidth: 1.2,
          pointRadius: 0,
          tension: .08,
          yAxisID: 'cadence'
        }
      ]
    },
    options
  });
}

function createSiteDurationChart(service, index) {
  const rows = [...sites(service)]
    .filter((site) => finite(site.duration_ms))
    .sort((left, right) => right.duration_ms - left.duration_ms)
    .slice(0, 20)
    .reverse();
  return new Chart(document.getElementById('site-duration-' + index), {
    type: 'bar',
    data: {
      labels: rows.map((site) => site.case_name + ' · ' + site.site),
      datasets: [{
        label: 'Duration seconds',
        data: rows.map((site) => site.duration_ms / 1000),
        backgroundColor: rows.map((site) => outcomeDefinition(site.outcome).color),
        borderRadius: 5
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...commonPlugins(),
        legend: { display: false },
        tooltip: {
          ...commonPlugins().tooltip,
          callbacks: {
            afterLabel(context) {
              const site = rows[context.dataIndex];
              return outcomeDefinition(site.outcome).label + ' · ' +
                site.item_count + ' item(s)';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: colors.grid },
          ticks: { color: colors.text },
          title: { display: true, text: 'Seconds', color: colors.text }
        },
        y: { grid: { display: false }, ticks: { color: colors.text } }
      }
    }
  });
}

function createOutcomeChart(service, index) {
  const rows = outcomeCounts(service);
  return new Chart(document.getElementById('outcomes-' + index), {
    type: 'doughnut',
    data: {
      labels: rows.map((row) => row.label),
      datasets: [{
        data: rows.map((row) => row.count),
        backgroundColor: rows.map((row) => row.color),
        borderColor: '#0d192a',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        ...commonPlugins(),
        legend: {
          position: 'bottom',
          labels: { color: colors.text, usePointStyle: true, boxWidth: 8, padding: 14 }
        }
      }
    }
  });
}

if (typeof Chart === 'undefined') {
  document.getElementById('chartNotice').hidden = false;
} else {
  Chart.defaults.color = colors.text;
  Chart.defaults.font.family =
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  createOverviewChart();
  services.forEach((service, index) => {
    new Chart(document.getElementById('memory-' + index), {
      type: 'line',
      plugins: [phaseBands],
      data: {
        datasets: [
          { label: 'RSS MiB', data: points(service, 'rss_bytes', 1024 * 1024), borderColor: colors.blue, backgroundColor: 'rgba(106,168,255,.12)', borderWidth: 1.8, pointRadius: 0, tension: .14 },
          { label: 'PSS MiB', data: points(service, 'pss_bytes', 1024 * 1024), borderColor: colors.cyan, backgroundColor: 'rgba(73,214,209,.10)', borderWidth: 1.8, pointRadius: 0, tension: .14 }
        ]
      },
      options: chartOptions(service, 'MiB')
    });
    new Chart(document.getElementById('cpu-' + index), {
      type: 'line',
      plugins: [phaseBands],
      data: {
        datasets: [
          { label: 'CPU %', data: points(service, 'cpu_percent'), borderColor: colors.amber, backgroundColor: 'rgba(255,191,105,.12)', fill: true, borderWidth: 1.8, pointRadius: 0, tension: .12 }
        ]
      },
      options: chartOptions(service, 'CPU % · 100% per core')
    });
    createCaseQualityChart(service, index);
    createCaseResourceChart(service, index);
    createTopologyChart(service, index);
    createSamplerChart(service, index);
    createSiteDurationChart(service, index);
    createOutcomeChart(service, index);
  });
}
</script>
</body>
</html>
`;
}

export function writeSpiderReport({ runDir, args, results }) {
  const payload = buildSpiderReportData({ runDir, args, results });
  const dataPath = path.join(runDir, 'report-data.json');
  const htmlPath = path.join(runDir, 'index.html');
  writeJson(dataPath, payload);
  fs.writeFileSync(htmlPath, spiderReportDocument(payload), 'utf8');
  return { payload, dataPath, htmlPath };
}
