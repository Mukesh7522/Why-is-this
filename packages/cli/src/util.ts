import * as path from 'path';
import * as fs from 'fs';

/**
 * Validate that an --output path is safe: resolves within cwd, no traversal.
 * Returns the resolved absolute path.
 */
export function safeOutputPath(output: string): string {
  const resolved = path.resolve(output);
  const base = process.cwd();
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Output path "${output}" resolves outside the current directory — aborting`);
  }
  return resolved;
}

/** Write content to a safe output path, creating parent dirs as needed. */
export function writeOutput(output: string, content: string): void {
  const safe = safeOutputPath(output);
  fs.mkdirSync(path.dirname(safe), { recursive: true });
  fs.writeFileSync(safe, content, 'utf-8');
}
