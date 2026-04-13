const RESET = '\x1b[0m'; const BOLD = '\x1b[1m';
const RED = '\x1b[31m'; const YELLOW = '\x1b[33m'; const GREEN = '\x1b[32m';
const GRAY = '\x1b[90m'; const DIM = '\x1b[2m';

function fearColor(s: number) { return s >= 0.8 ? RED : s >= 0.6 ? YELLOW : GREEN; }
function bar(pct: number, width = 10): string {
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export interface AuditEntry {
  file: string;
  startLine: number;
  endLine: number;
  fearScore: number;
  hasRationale: boolean;
  busFactorScore: number;
  survivorshipFlags: number;
}

export interface AuditSummary {
  path: string;
  totalRegions: number;
  rationaleCount: number;
  highFearOrphans: AuditEntry[];
  busFactorOne: AuditEntry[];
  survivorshipPending: number;
}

export function formatAuditReport(summary: AuditSummary, markdown = false): string {
  const coverage = summary.totalRegions > 0 ? summary.rationaleCount / summary.totalRegions : 0;
  const lines: string[] = [];

  if (markdown) {
    lines.push(`# Knowledge Debt Audit: ${summary.path}`);
    lines.push(`Date: ${new Date().toISOString().slice(0, 10)}\n`);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Rationale coverage | ${Math.round(coverage * 100)}% |`);
    lines.push(`| High-fear orphans | ${summary.highFearOrphans.length} |`);
    lines.push(`| Bus factor = 1 | ${summary.busFactorOne.length} |`);
    lines.push(`| Survivorship flags | ${summary.survivorshipPending} |\n`);
    lines.push(`## Top Priority Orphans\n`);
    for (const e of summary.highFearOrphans.slice(0, 10)) {
      lines.push(`- **${e.fearScore.toFixed(2)}** \`${e.file}:${e.startLine}-${e.endLine}\``);
    }
    return lines.join('\n');
  }

  lines.push(`\nKNOWLEDGE DEBT AUDIT: ${BOLD}${summary.path}${RESET}`);
  lines.push('═'.repeat(50));
  lines.push('');
  lines.push(`Rationale coverage:   ${Math.round(coverage * 100)}%   ${bar(coverage)}`);
  lines.push(`High-fear orphans:    ${summary.highFearOrphans.length}     (score > 0.7, no rationale)`);
  lines.push(`Bus factor = 1:       ${summary.busFactorOne.length}     (single active author)`);
  lines.push(`Survivorship flags:   ${summary.survivorshipPending}`);
  lines.push('');
  lines.push(`TOP PRIORITY ORPHANS (annotate these first)`);
  lines.push('─'.repeat(45));
  for (const e of summary.highFearOrphans.slice(0, 10)) {
    const col = fearColor(e.fearScore);
    lines.push(`  ${col}${e.fearScore.toFixed(2)}${RESET}  ${e.file}:${e.startLine}${e.endLine !== e.startLine ? '-' + e.endLine : ''}`);
    lines.push(`        ${GRAY}bus factor: ${e.busFactorScore}${RESET}`);
  }
  lines.push('');
  lines.push(`Run: ${DIM}why-is-this annotate <file>:<line>${RESET}`);
  lines.push('');
  return lines.join('\n');
}
