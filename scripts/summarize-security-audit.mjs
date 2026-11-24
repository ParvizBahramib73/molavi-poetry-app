import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const reports = [
  ['Web dependencies (all)', 'security-audit/web-all.json', 'package-lock.json'],
  ['Web runtime dependencies', 'security-audit/web-runtime.json', 'package-lock.json'],
  ['Android build tooling', 'security-audit/android-tooling.json', 'security-audit/android-tooling-package-lock.json'],
];

function formatFix(value) {
  if (value === true) return 'fix reported available (target version not specified)';
  if (value === false || value == null) return 'no fix reported';
  if (typeof value === 'object') {
    if (value.name && value.version) return value.name + '@' + value.version;
    return JSON.stringify(value);
  }
  return String(value);
}

const sections = ['# Dependency security audit report', '',
  'This report records advisories; counts do not establish exploitability.',
  'No dependency was automatically changed or fixed by this workflow.', ''];

for (const [label, path, lockPath] of reports) {
  sections.push('## ' + label, '');
  if (!existsSync(path)) { sections.push('**NOT RUN** — report file was not created.', ''); continue; }
  let report;
  try { report = JSON.parse(readFileSync(path, 'utf8')); }
  catch { sections.push('**NOT RUN / INVALID REPORT** — npm did not produce parseable JSON. Check the matching stderr file.', ''); continue; }
  let lock = {};
  try { lock = JSON.parse(readFileSync(lockPath, 'utf8')); } catch { /* lockfile version details unavailable */ }
  const totals = report.metadata && report.metadata.vulnerabilities;
  if (!totals) { sections.push('**NOT RUN / INCOMPLETE** — JSON has no vulnerability metadata.', ''); continue; }
  sections.push('Totals: ' + (totals.total ?? 0) + ' (critical ' + (totals.critical ?? 0) + ', high ' + (totals.high ?? 0) + ', moderate ' + (totals.moderate ?? 0) + ', low ' + (totals.low ?? 0) + ', info ' + (totals.info ?? 0) + ')', '');
  const entries = Object.entries(report.vulnerabilities ?? {});
  if (!entries.length) { sections.push('No vulnerable packages were listed in this report.', ''); continue; }
  for (const [name, item] of entries) {
    const via = (item.via ?? []).map((entry) => {
      if (typeof entry === 'string') return entry;
      return [entry.title, entry.url, entry.range].filter(Boolean).join(' — ') || JSON.stringify(entry);
    });
    const references = via.join('; ') || 'No advisory detail supplied';
    const cves = [...new Set(references.match(/CVE-\d{4}-\d{4,}/g) ?? [])].join(', ') || 'not listed in npm audit output';
    const installed = (item.nodes ?? []).map((node) => {
      const version = lock.packages && lock.packages[node] && lock.packages[node].version;
      return version ? node + '@' + version : node;
    });
    sections.push(
      '- **' + name + '** — ' + (item.severity ?? 'unknown') + '; ' + (item.isDirect ? 'direct' : 'transitive') + '; affected range: ' + (item.range ?? 'not listed'),
      '  - Installed versions/paths: ' + (installed.join(', ') || 'not listed'),
      '  - Affected dependents: ' + ((item.effects ?? []).join(', ') || 'none listed'),
      '  - CVE: ' + cves,
      '  - Advisory: ' + references,
      '  - Remediation: ' + formatFix(item.fixAvailable)
    );
  }
  sections.push('');
}

const markdown = sections.join('\n');
writeFileSync('security-audit/summary.md', markdown, 'utf8');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(markdown);
