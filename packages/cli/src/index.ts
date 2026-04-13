#!/usr/bin/env node
import { Command } from 'commander';
import { runQuery } from './commands/query';

const program = new Command();

program
  .name('why-is-this')
  .description('Explain any line of code in terms of the decision that created it.')
  .version('0.1.0');

program
  .argument('[target]', 'file:line or file:start-end')
  .option('--short', 'show only synthesized rationale')
  .option('--chain', 'show raw chain links with scores')
  .option('--json', 'output as JSON')
  .option('--no-synth', 'skip LLM synthesis')
  .option('--depth <n>', 'trace depth (default: 3)')
  .action(async (target, opts) => {
    if (!target) { program.help(); return; }
    try {
      await runQuery(target, opts);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`Error: ${msg}\n`);
      process.exit(1);
    }
  });

program.command('annotate <target>', 'Add a rationale annotation');
program.command('adr <target>', 'Generate an ADR from the decision chain');

program.parseAsync(process.argv);
