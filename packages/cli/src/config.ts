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
  const configPath = path.join(repoPath, '.why-is-this.config.js');
  if (fs.existsSync(configPath)) {
    try { return require(configPath); } catch { return {}; }
  }
  return {};
}

export function getGitHubToken(config: WitConfig): string {
  return config.github?.token ?? process.env.GITHUB_TOKEN ?? '';
}
