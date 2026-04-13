import * as fs from 'fs';
import * as path from 'path';

export interface WitConfig {
  github?: { token?: string; baseUrl?: string };
  embedding?: { provider?: 'ollama' | 'openai' | 'bm25'; model?: string; apiKey?: string };
  synthesis?: { enabled?: boolean; provider?: 'ollama' | 'openai'; model?: string; apiKey?: string };
  trace?: { depth?: number; confidenceThreshold?: number; maxLinksPerType?: number };
  fear?: { high?: number; moderate?: number; low?: number };
  audit?: { exclude?: string[]; highFearThreshold?: number };
}

export function loadConfig(repoPath = process.cwd()): WitConfig {
  // Prefer .why-is-this.config.json (safe, static)
  const jsonPath = path.join(repoPath, '.why-is-this.config.json');
  if (fs.existsSync(jsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as WitConfig;
    } catch {
      process.stderr.write('Warning: .why-is-this.config.json is malformed — using defaults\n');
      return {};
    }
  }

  // Fall back to .why-is-this.config.js (power users — executes arbitrary JS, keep in trusted repo)
  const jsPath = path.join(repoPath, '.why-is-this.config.js');
  if (fs.existsSync(jsPath)) {
    try {
      // NOTE: require() executes the JS file. Only safe in a repo you trust.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(jsPath) as WitConfig;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`Warning: .why-is-this.config.js failed to load (${msg}) — using defaults\n`);
      return {};
    }
  }

  return {};
}

export function getGitHubToken(config: WitConfig): string {
  return config.github?.token ?? process.env.GITHUB_TOKEN ?? '';
}
