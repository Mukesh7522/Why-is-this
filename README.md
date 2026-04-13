# why-is-this

**Trace the "why" behind any line of code.** `why-is-this` assembles a decision chain from git blame, PR/issue context, rationale annotations, fear scoring, and survivorship detection — answering the question every developer asks when reading unfamiliar code.

```
$ why-is-this src/auth/middleware.ts:42-58

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  src/auth/middleware.ts  lines 42–58
  Fear score: 0.74 (HIGH)  ·  Bus factor: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rationale: Token expiry set to 15 min due to SOC-2 audit requirement (2023-11).
Constraint: #compliance — vendor contract mandates short-lived tokens.
Survivorship: constraint #compliance was last checked 14 months ago.

Decision chain (3 links):
  1. [commit] 3f2a1b4 — "shorten token TTL per security review" (conf: 0.95)
  2. [pr]     #841 — "SOC-2 remediation: auth hardening" (conf: 0.88)
  3. [issue]  #799 — "Audit finding: token lifetime too long" (conf: 0.81)
```

---

## Why

Code is full of decisions that look arbitrary until you understand why they exist. Changing a magic number, a timeout, or an algorithm without that context breaks things in production.

`why-is-this` makes the "why" retrievable without Slack archaeology.

---

## Features

| Command | What it does |
|---|---|
| `why-is-this <file>:<line>` | Trace a code region → decision chain + fear score |
| `why-is-this annotate <file>:<line>` | Record a rationale annotation interactively |
| `why-is-this audit <path>` | Scan a directory for high-fear, un-annotated regions |
| `why-is-this adr <file>:<line>` | Export a full Architecture Decision Record |
| `why-is-this onboard <path>` | Generate a Markdown onboarding guide from annotations |
| `why-is-this survivorship` | Check whether recorded constraints are still valid |

---

## Installation

### Requirements

- Node.js 18+
- Git repository with remote (GitHub supported for PR/issue lookup)

### From npm (recommended)

```bash
npm install -g why-is-this
```

### From source

```bash
git clone https://github.com/your-org/why-is-this
cd why-is-this
npm install
npm run build --workspaces
npm link packages/cli
```

---

## Quick Start

```bash
# In any git repo with a GitHub remote:

# Trace a single line
why-is-this src/utils/parser.ts:87

# Trace a range
why-is-this src/utils/parser.ts:80-100

# Add a rationale annotation (interactive)
why-is-this annotate src/utils/parser.ts:80-100

# Audit the whole src/ directory
why-is-this audit src/

# Generate an ADR
why-is-this adr src/utils/parser.ts:80-100 --output docs/decisions/ADR-parser.md

# Generate an onboarding guide
why-is-this onboard src/ --for "new backend engineer" --output docs/onboarding.md

# Check constraint staleness
why-is-this survivorship
```

---

## Commands

### `why-is-this <file>:<line[-end]>` (query)

Traces a code region and displays the full decision chain.

```
Options:
  --short          One-line summary only
  --chain          Show full evidence chain
  --json           Raw JSON output
  --no-synth       Skip synthesis (faster, no LLM call)
  --depth <n>      Chain depth (default: 3, max: 10)
```

**Output includes:**
- Fear score (0–1) with label (low / moderate / high)
- Bus factor (how many people understand this code)
- Rationale annotation (if recorded)
- Decision chain: commits → PRs → issues → rationale files, sorted by confidence

---

### `why-is-this annotate <file>:<line[-end]>`

Interactive prompt to record a rationale annotation for a code region.

Stores annotations in `.rationale/*.json` (commit this directory to share context with your team).

**Prompts you for:**
- Summary (one-line)
- Detail (free-form explanation)
- Alternatives considered
- Constraints at time of decision (with optional survivorship tags)
- Tags (e.g. `#performance`, `#compliance`, `#vendor`)
- Author GitHub handle

---

### `why-is-this audit <path>`

Scans a directory for files that have no rationale coverage and a high fear score.

```
Options:
  --json           Machine-readable output
  --output <file>  Write report to file
```

**Reports:**
- Total files scanned vs. annotated (coverage %)
- High-fear orphans — files with fear > threshold and no annotation
- Survivorship-pending — annotations whose constraints need re-validation

**Configure exclusions in `.why-is-this.config.json`:**
```json
{
  "audit": {
    "exclude": ["node_modules", "dist", ".git", "coverage"],
    "highFearThreshold": 0.7
  }
}
```

---

### `why-is-this adr <file>:<line[-end]>`

Generates a Markdown Architecture Decision Record from the decision chain.

```
Options:
  --output <file>  Write ADR to file (default: stdout)
```

Output follows the [MADR](https://adr.github.io/madr/) template with sections filled from the decision chain: context, rationale, alternatives, constraints, consequences.

---

### `why-is-this onboard <path>`

Generates a Markdown onboarding guide for a path, ordered by fear score and decision complexity.

```
Options:
  --for <role>     Target audience description (default: "new team member")
  --output <file>  Write guide to file (default: stdout)
```

---

### `why-is-this survivorship`

Runs survivorship checks on all recorded annotations to detect stale constraints.

Built-in checks:
- **`#vendor`** — verifies the vendor/library is still present in `package.json`

Results are printed to stdout. Stale constraints are flagged for review.

---

## Fear Score

The fear score (0–1) quantifies how risky a code region is to change:

| Signal | Weight | Description |
|---|---|---|
| Age | 15% | Older code decays faster |
| Blame reads | 20% | High git blame activity = risky |
| Commit rate | 10% | Low churn after initial write = fragile |
| Author activity | 10% | Inactive last author = orphaned |
| Constraint language | 20% | Words like "must", "never", "compliance" |
| Rationale absence | 10% | No annotation = unknown risk |
| Bus factor | 10% | Single author = fragile |
| Inactive ownership | 5% | Original author left |

**Labels:** `low` (< 0.35) · `moderate` (0.35–0.65) · `high` (> 0.65)

---

## Rationale Files

Annotations are stored in `.rationale/<id>.json` in the repo root. Add this directory to git — it's the persistent memory layer.

```
.rationale/
  src-auth-middleware-42-58-a3f2b1.json
  src-utils-parser-80-100-9d4e7c.json
```

Each file follows the `why-is-this/rationale@1.0` schema:

```json
{
  "schema": "why-is-this/rationale@1.0",
  "id": "src-auth-middleware-42-58-a3f2b1",
  "target": {
    "file": "src/auth/middleware.ts",
    "lineRange": [42, 58],
    "codeHash": "sha256:..."
  },
  "rationale": {
    "summary": "Token expiry set to 15 min due to SOC-2 audit",
    "detail": "...",
    "tags": ["#compliance", "#security"],
    "constraintsAtTime": [
      {
        "tag": "#compliance",
        "description": "SOC-2 mandates token TTL ≤ 15 minutes",
        "survivorshipCheck": true
      }
    ],
    "alternativesConsidered": ["30-minute TTL", "sliding window"],
    "authorGitHub": "alice",
    "createdAt": "2026-04-14T00:00:00.000Z",
    "stillValid": null
  }
}
```

---

## Configuration

Create `.why-is-this.config.json` in your repo root:

```json
{
  "github": {
    "token": "ghp_...",
    "baseUrl": "https://api.github.com"
  },
  "trace": {
    "depth": 3,
    "confidenceThreshold": 0.3,
    "maxLinksPerType": 5
  },
  "audit": {
    "exclude": ["node_modules", "dist", ".git", "coverage", ".next"],
    "highFearThreshold": 0.7
  },
  "fear": {
    "high": 0.65,
    "moderate": 0.35,
    "low": 0
  },
  "embedding": {
    "provider": "bm25"
  }
}
```

**Environment variable:** `GITHUB_TOKEN` is read automatically if `config.github.token` is not set.

> **Note:** `.why-is-this.config.js` is also supported for advanced use cases (runs arbitrary JS — only use in trusted repos).

---

## Architecture

```
packages/
  core/        @why-is-this/core — trace engine, fear scoring, survivorship
    src/
      trace/   git.ts, github.ts, chain.ts, rationale.ts, index.ts
      score/   fear.ts, bus.ts
      survivorship/  checker.ts, registry.ts, checks/vendor.ts
  embeddings/  @why-is-this/embeddings — BM25 keyword scorer
  cli/         why-is-this — Commander.js CLI, formatters, commands
```

**Trace pipeline** (9 steps):
1. Parse file + line range from user input
2. Run `git blame` to find dominant commit
3. Resolve PR/issue from commit message
4. Fetch PR/issue details from GitHub API
5. Load rationale annotation (if exists)
6. Score each chain link by BM25 relevance
7. Deduplicate + filter by confidence threshold
8. Compute fear score from 8 signals
9. Compute bus factor from author activity

---

## Security

- **Path traversal prevention:** All file reads are validated with `path.resolve` + `startsWith` against the repo root
- **Output path safety:** `--output` paths must resolve within `cwd()` — no `../escape` possible
- **File size limit:** Files > 10 MB are rejected before reading
- **Input validation:** Line numbers, rationale IDs, and file ranges are validated against strict regexes
- **No eval:** Config files are JSON-first; `.js` config requires explicit file presence in a trusted repo
- **GitHub token:** Never logged, only used in Authorization headers

---

## Contributing

1. Fork and clone the repo
2. `npm install` in the root
3. `npm run build --workspaces` to compile
4. `npm test --workspaces` to run 29 tests
5. Open a PR

Please add or update tests for any new behaviour. The test suite uses Jest across all three packages.

---

## License

MIT — see [LICENSE](LICENSE)
