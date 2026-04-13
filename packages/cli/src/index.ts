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

program
  .command('annotate <target>')
  .description('Add a rationale annotation to a code region')
  .action(async (target) => {
    const { runAnnotate } = await import('./commands/annotate');
    try { await runAnnotate(target); }
    catch (e: unknown) { process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1); }
  });

program
  .command('adr <target>')
  .description('Generate a draft ADR from the decision chain')
  .option('--output <path>', 'write to file instead of stdout')
  .action(async (target, opts) => {
    const { runAdr } = await import('./commands/adr');
    try { await runAdr(target, opts); }
    catch (e: unknown) { process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1); }
  });

program
  .command('audit [path]')
  .description('Generate a knowledge debt audit report')
  .option('--output <path>', 'write report to file')
  .option('--json', 'output as JSON')
  .action(async (targetPath, opts) => {
    const { runAudit } = await import('./commands/audit');
    try { await runAudit(targetPath ?? '.', opts); }
    catch (e: unknown) { process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1); }
  });

program
  .command('onboard [path]')
  .description('Generate an onboarding walkthrough ordered by decision risk')
  .option('--for <role>', 'describe the role of the new team member')
  .option('--output <path>', 'write to file')
  .action(async (targetPath, opts) => {
    const { runOnboard } = await import('./commands/onboard');
    try { await runOnboard(targetPath ?? '.', opts); }
    catch (e: unknown) { process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1); }
  });

program
  .command('survivorship [path]')
  .description('Check whether annotated constraints are still valid')
  .action(async (targetPath) => {
    const { runSurvivorship } = await import('./commands/survivorship');
    try { await runSurvivorship(targetPath ?? '.'); }
    catch (e: unknown) { process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`); process.exit(1); }
  });

program.parseAsync(process.argv);
