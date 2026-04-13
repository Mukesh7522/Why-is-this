import type { DecisionRecord } from '@why-is-this/core';
import { fearLabel } from '@why-is-this/core';

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const GRAY  = '\x1b[90m';

function confidenceColor(c: number): string {
  if (c >= 0.85) return GREEN;
  if (c >= 0.65) return YELLOW;
  if (c >= 0.40) return GRAY;
  return DIM;
}

function fearColor(score: number): string {
  if (score >= 0.8) return RED;
  if (score >= 0.3) return YELLOW;
  return GREEN;
}

export function formatDecisionRecord(
  record: DecisionRecord,
  file: string,
  codeLines: string[],
  opts: { short?: boolean; chain?: boolean; noSynth?: boolean } = {}
): string {
  const lines: string[] = [];
  const lineRange = `${record.target.lineRange[0]}${record.target.lineRange[1] !== record.target.lineRange[0] ? '-' + record.target.lineRange[1] : ''}`;

  lines.push(`\n${BOLD}${file}:${lineRange}${RESET}\n`);

  for (let i = 0; i < codeLines.length; i++) {
    const lineNum = record.target.lineRange[0] + i;
    lines.push(`  ${GRAY}${String(lineNum).padStart(4)}${RESET}  ${codeLines[i]}`);
  }
  lines.push('');

  if (!opts.short) {
    lines.push(`  ${BOLD}DECISION CHAIN${RESET}  ${'─'.repeat(50)}`);
    for (const link of record.chain) {
      const col = confidenceColor(link.confidence);
      const score = `[${link.confidence.toFixed(2)}]`;
      lines.push(`\n  ${col}${score}${RESET} ${link.type} · ${link.date} · @${link.author}`);
      lines.push(`        ${link.excerpt}`);
      lines.push(`        ${GRAY}${link.url}${RESET}`);
    }
    lines.push('');
  }

  if (record.rationale && !opts.noSynth) {
    lines.push(`  ${BOLD}SYNTHESIZED RATIONALE${RESET}  ${'─'.repeat(41)}`);
    lines.push('');
    lines.push(`  ${record.rationale.summary}`);
    if (record.rationale.detail) lines.push(`  ${record.rationale.detail}`);
    lines.push('');
  }

  const fearCol = fearColor(record.fearScore);
  const fearLbl = fearLabel(record.fearScore).toUpperCase();
  lines.push(
    `  FEAR SCORE: ${fearCol}${record.fearScore.toFixed(2)} (${fearLbl})${RESET}  ·  ` +
    `BUS FACTOR: ${record.busFactorScore}${record.busFactorScore <= 1 ? ' ' + YELLOW + '⚠' + RESET : ''}`
  );
  lines.push('');
  lines.push(`  ${'─'.repeat(66)}`);
  lines.push(`  Add rationale: ${DIM}why-is-this annotate ${file}:${record.target.lineRange[0]}${RESET}`);
  lines.push('');

  return lines.join('\n');
}
