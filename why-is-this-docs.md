# why-is-this

> **Explain any line of code in terms of the decision that created it.**

`why-is-this` is a CLI tool, VS Code extension, and GitHub PR bot that traces the full decision chain behind any line of code — assembling context from commits, PRs, issues, and team annotations into a single coherent explanation. It also surfaces **knowledge debt**, **fear scores**, and **survivorship flags** — decisions whose original constraints may no longer be valid.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Quick Start](#quick-start)
3. [CLI Reference](#cli-reference)
4. [How It Works — The Trace Engine](#how-it-works--the-trace-engine)
5. [The Rationale Layer](#the-rationale-layer)
6. [The Fear Score Algorithm](#the-fear-score-algorithm)
7. [The Survivorship Engine](#the-survivorship-engine)
8. [The Knowledge Debt Audit](#the-knowledge-debt-audit)
9. [Onboarding Mode](#onboarding-mode)
10. [VS Code Extension](#vs-code-extension)
11. [GitHub PR Bot](#github-pr-bot)
12. [Data Model](#data-model)
13. [Architecture](#architecture)
14. [Implementation Roadmap](#implementation-roadmap)
15. [Configuration Reference](#configuration-reference)
16. [Contributing](#contributing)

---

## The Problem

`git blame` tells you *who* changed a line and *when*. It never tells you:

- *Why* the original author was afraid to do it differently
- What constraints existed at the time that no longer exist today
- What alternatives were considered and rejected
- Why that specific magic number, timeout, or cap was chosen
- Whether the reason this code exists is even still true

This knowledge lives in Slack threads that expired, Jira comments from 2019, or human brains that left the company. Every developer has spent hours manually reconstructing this context from commit history, closed PRs, and old issue threads. `why-is-this` automates that archaeology — and builds a layer for capturing the knowledge that never gets written down.

---

## Quick Start

```bash
# Install
npm install -g why-is-this

# Authenticate with GitHub (required for PR/issue chain assembly)
why-is-this auth

# Query a line
why-is-this src/payments/retry.ts:47

# Query a range
why-is-this src/payments/retry.ts:47-55

# Run a knowledge debt audit on a module
why-is-this --audit src/payments/

# Onboarding walkthrough for a new team member
why-is-this --onboard src/payments/ --for "new engineer joining payments team"
```

### Output example

```
src/payments/retry.ts:47

  47  const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000);

  DECISION CHAIN  ─────────────────────────────────────────────────
  
  [0.92] commit a3f91c · 2022-03-14 · @priya
        "fix: add exponential backoff to serialization failure retries"
  
  [0.88] PR #1142 · comment by @priya
        "Capped at 30s because we saw connection pool exhaustion in prod
        when this was unbounded. The 30s cap was empirically tuned against
        our p95 transaction time of ~4s. The jitter prevents thundering
        herd on burst failures."
  
  [0.71] Issue #88 · @amit
        "Serialization failures under high write concurrency cause cascading
        retries. Postgres 40001 specifically needs backoff — not other error
        classes. Fixed 500ms delay made the problem worse under load."

  SYNTHESIZED RATIONALE  ──────────────────────────────────────────

  Exponential backoff for Postgres serialization errors (40001) only.
  30s cap prevents connection pool exhaustion — tuned against p95 txn time.
  Jitter prevents thundering herd. Do NOT apply to other error codes.

  FEAR SCORE: 0.83 (high)  ·  SURVIVORSHIP: valid  ·  BUS FACTOR: 1 ⚠

  ─────────────────────────────────────────────────────────────────
  Add rationale: why-is-this annotate src/payments/retry.ts:47
  Generate ADR:  why-is-this adr src/payments/retry.ts:47
```

---

## CLI Reference

### Core query

```bash
why-is-this <file>:<line>
why-is-this <file>:<start>-<end>
```

Options:

| Flag | Description |
|------|-------------|
| `--short` | Show only the synthesized rationale, no chain |
| `--chain` | Show raw chain links with confidence scores |
| `--json` | Output as JSON (for editor integrations) |
| `--no-synth` | Skip LLM synthesis, show raw excerpts only |
| `--depth <n>` | How many hops to trace (default: 3) |
| `--include-slack <export.json>` | Include a Slack export JSON in the trace |

---

### Annotate — add a rationale record

```bash
why-is-this annotate <file>:<line>
why-is-this annotate <file>:<start>-<end>
```

Opens an interactive prompt to capture:

1. What this code does (brief)
2. Why this specific approach was chosen
3. What alternatives were considered
4. What constraints existed at the time
5. Tags: `#infra`, `#vendor`, `#perf`, `#business`, `#security`, `#legacy`

The rationale is saved to `.rationale/<hash>.json` and committed with the next commit. It will be picked up by future `why-is-this` queries for this code region.

Example interactive session:

```
$ why-is-this annotate src/payments/retry.ts:47-50

Annotating: src/payments/retry.ts:47-50

? Brief description of what this code does:
  > Exponential backoff with jitter for Postgres serialization failures

? Why was this specific approach chosen? (what problem did it solve?)
  > Connection pool exhaustion from unbounded retries under burst failures.
  > 30s cap was empirically tuned against our p95 transaction time of ~4s.

? What alternatives were considered?
  > Fixed delay (tried 500ms — made thundering herd worse)
  > Immediate retry (caused pool exhaustion in load test)

? What constraints existed at the time that shaped this decision?
  > Production p95 transaction time: ~4s (as of 2022-03-14)
  > Connection pool size: 10 (RDS t3.medium)

? Constraint tags (comma-separated: #infra #vendor #perf #business #security #legacy)
  > #infra #perf

? Should this be checked for survivorship? (y/n)  y

Rationale saved to .rationale/payments-retry-47-50-a3f91c.json
```

---

### Audit — knowledge debt map

```bash
why-is-this --audit [path]
why-is-this --audit src/payments/
why-is-this --audit . --output audit-report.md
```

Scans every file in the path, scores each code region, and produces a knowledge debt report.

Output includes:

- Rationale coverage % by module
- List of high-fear orphans (fear score > 0.7, no rationale)
- Bus factor report (code regions with single active authors)
- Survivorship flags pending review
- Suggested annotation order (highest fear / highest read rate first)

```
KNOWLEDGE DEBT AUDIT: src/payments/
═══════════════════════════════════════

Rationale coverage:   34%   ████░░░░░░
High-fear orphans:    7     (score > 0.7, no rationale)
Bus factor = 1:       4     (single author, author inactive)
Survivorship flags:   2     (constraints may have expired)

TOP PRIORITY ORPHANS (annotate these first)
───────────────────────────────────────────
  0.94  src/payments/idempotency.ts:112-138
        847d untouched · 67 blame reads/90d · @marco (inactive)
        
  0.91  src/auth/session-rotation.ts:89
        PR comment: "magic number — don't ask"
        
  0.83  src/payments/retry.ts:47           ← rationale exists
  0.76  src/workers/dedup.ts:201-220

Run: why-is-this annotate src/payments/idempotency.ts:112
```

---

### Onboarding mode

```bash
why-is-this --onboard <path> [--for "<role description>"]
why-is-this --onboard src/payments/ --for "new engineer joining payments team"
why-is-this --onboard src/ --output onboarding.md
```

Generates a narrative walkthrough of the codebase module, ordered by fear score and decision complexity — not file order. The most dangerous code is introduced first, with full context. Output is a markdown document that can be committed to the repo, sent to new hires, or used as onboarding documentation.

---

### ADR generator

```bash
why-is-this adr <file>:<line>
why-is-this adr src/payments/retry.ts:47 --output docs/adr/ADR-0042.md
```

Generates a draft Architecture Decision Record from the assembled decision chain. Follows the MADR format by default, with options for Nygard format.

---

### Survivorship check

```bash
why-is-this --survivorship [path]
why-is-this --survivorship src/ --check-infra --check-vendor
```

Runs the survivorship engine against all rationale records with constraint tags. Reports constraints that may have expired based on observable facts.

---

## How It Works — The Trace Engine

The trace engine assembles a **decision chain** — an ordered list of evidence links that explain why a piece of code exists, ranked by semantic relevance to the code region being queried.

### Step-by-step trace

```
1. INPUT: file path + line range

2. git blame → identify commit hash, author, date for the line

3. Parse commit message → extract PR reference if present
   (patterns: "PR #N", "closes #N", "fixes #N", "(#N)", "!N")

4. Fetch PR via GitHub API:
   - PR title and description
   - All PR comments (threaded)
   - Linked issues (from "closes #N" in description)
   - Review comments on the specific file lines

5. Fetch linked issues via GitHub API:
   - Issue body and comments
   - Sub-issues if referenced

6. Check for local ADR / .rationale file:
   - Scan .rationale/ directory for records matching this file + line range
   - If found, include as highest-confidence link

7. Optional: search Slack export JSON for messages containing:
   - The commit hash
   - The PR number
   - The file name near the date of the commit

8. SCORE each link for relevance to the code diff:
   - Embed the code diff (or code text if diff unavailable)
   - Embed each candidate link excerpt
   - Cosine similarity → confidence score (0.0–1.0)
   - Filter: confidence < 0.3 dropped, 0.3–0.5 shown dimmed, > 0.5 shown

9. SYNTHESIZE rationale (optional, requires LLM):
   - Send top-3 chain links + code context to LLM
   - Prompt: "Synthesize a 3-4 sentence rationale explaining why this code
     exists and what constraints shaped it. Be specific."
   - Cache the synthesis locally (invalidated on next git blame change)

10. OUTPUT: ranked chain + synthesis + fear score + survivorship flags
```

### Confidence scoring

Each chain link receives a confidence score from 0.0–1.0 based on semantic similarity between the code region and the link text.

Scoring uses a lightweight local embedding model (default: `nomic-embed-text` via Ollama, or OpenAI `text-embedding-3-small` if configured). No code is sent to remote services unless explicitly configured.

| Confidence | Display | Meaning |
|------------|---------|---------|
| > 0.85 | Bold, green dot | Directly explains this code |
| 0.65–0.85 | Normal, yellow dot | Likely relevant |
| 0.40–0.65 | Dimmed, gray dot | Possibly relevant |
| < 0.40 | Hidden (shown with `--chain --all`) | Weak signal |

---

## The Rationale Layer

The rationale layer is a first-class git artifact: a `.rationale/` directory at the repo root, containing structured JSON files that map code regions to documented decisions.

### Why a directory, not inline comments

Inline code comments get deleted, reformatted, and silenced by linters. They don't version independently of the code, they don't have structure you can query, and they don't support the constraint + survivorship model. The `.rationale/` directory solves all of these:

- Rationale commits with the code → appears in git history
- Rationale diffs with the code → PR reviewers see it
- Structured JSON → queryable, indexable, parseable by tools
- Constraint fields → enable the survivorship engine
- Independent versioning → rationale can be updated without touching code

### File naming

```
.rationale/<module>-<filename>-<start>-<end>-<commit-short>.json
```

Example:
```
.rationale/payments-retry-47-50-a3f91c.json
```

### Rationale file format

```json
{
  "schema": "why-is-this/rationale@1.0",
  "id": "payments-retry-47-50-a3f91c",
  "target": {
    "file": "src/payments/retry.ts",
    "lineRange": [47, 50],
    "contentHash": "sha256:a3f91c..."
  },
  "rationale": {
    "author": "priya@example.com",
    "authorGitHub": "priya",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "summary": "Exponential backoff with jitter for Postgres serialization failures",
    "detail": "Capped at 30s because we saw connection pool exhaustion in prod when this was unbounded. The 30s cap was empirically tuned against our p95 transaction time of ~4s. The jitter prevents thundering herd on burst failures.",
    "alternativesConsidered": [
      "Fixed 500ms delay — made thundering herd worse under load",
      "Immediate retry — caused pool exhaustion in load test"
    ],
    "constraintsAtTime": [
      {
        "description": "Production p95 transaction time ~4s",
        "tag": "perf",
        "survivorshipCheck": true,
        "checkHint": "Compare against current p95 from monitoring"
      },
      {
        "description": "Connection pool size 10 on RDS t3.medium",
        "tag": "infra",
        "survivorshipCheck": true,
        "checkHint": "Check current instance type and pool config"
      }
    ],
    "tags": ["#infra", "#perf"],
    "stillValid": null
  },
  "chainLinks": [
    {
      "type": "commit",
      "ref": "a3f91c",
      "url": "https://github.com/org/repo/commit/a3f91c",
      "confidence": 0.92
    },
    {
      "type": "pr_comment",
      "ref": "PR#1142",
      "url": "https://github.com/org/repo/pull/1142#issuecomment-123456",
      "confidence": 0.88
    }
  ]
}
```

### Content hash drift detection

The `contentHash` field stores a hash of the code region at time of annotation. On each `why-is-this` query, the tool compares the current content hash to the stored one. If they differ, a warning is shown:

```
⚠  Rationale may be stale — code has changed since annotation.
   Annotated: 2022-03-14  ·  Last changed: 2024-11-02
   Run: why-is-this annotate src/payments/retry.ts:47 --update
```

---

## The Fear Score Algorithm

The fear score is a 0.0–1.0 value representing how dangerous a piece of code is to modify without deep context. It is not a quality metric — high fear score does not mean bad code. It means *consequential code with high knowledge risk*.

### Input signals

| Signal | Weight | Description |
|--------|--------|-------------|
| `age_days` | 0.20 | Days since last commit to this region |
| `blame_read_rate` | 0.25 | git blame hits on these lines per 90 days |
| `commit_rate` | −0.20 | Commits to these lines per 90 days (negative: more commits = lower fear) |
| `author_active` | 0.15 | Whether last author is still contributing to the repo |
| `author_count` | −0.10 | Number of distinct authors (more = lower fear, shared knowledge) |
| `constraint_language` | 0.30 | Presence of "don't touch", "careful", "magic number", "legacy", "hack", "workaround" in PR/issue comments linked to this region |
| `rationale_absent` | 0.20 | No rationale record exists |
| `bus_factor` | 0.15 | Ratio of code owned by inactive authors |

### Computation

```typescript
function fearScore(signals: FearSignals): number {
  const norm = (v: number, min: number, max: number) =>
    Math.max(0, Math.min(1, (v - min) / (max - min)));

  const age         = norm(signals.ageDays, 0, 1825) * 0.20;
  const blameRate   = norm(signals.blameReads90d, 0, 200) * 0.25;
  const commitRate  = (1 - norm(signals.commits90d, 0, 10)) * 0.20;
  const authorGone  = (signals.lastAuthorActive ? 0 : 1) * 0.15;
  const authorCount = (1 - norm(signals.distinctAuthors, 1, 5)) * 0.10;
  const constLang   = norm(signals.constraintLanguageScore, 0, 3) * 0.30;
  const noRationale = (signals.rationaleExists ? 0 : 1) * 0.20;
  const busFactor   = norm(signals.inactiveAuthorOwnership, 0, 1) * 0.15;

  const raw = age + blameRate + commitRate + authorGone +
              authorCount + constLang + noRationale + busFactor;

  // Normalize to 0–1 (max theoretical raw = 1.55 with all weights)
  return Math.min(1, raw / 1.0);
}
```

### Fear score thresholds

| Score | Label | Recommended action |
|-------|-------|--------------------|
| 0.0–0.3 | Low | Safe to modify with normal review |
| 0.3–0.6 | Moderate | Read the decision chain before modifying |
| 0.6–0.8 | High | Annotate rationale before modifying; tag a domain expert in PR |
| 0.8–1.0 | Critical | Do not modify without load testing or explicit sign-off from someone with context |

### Constraint language detection

The constraint language signal scans PR comments, commit messages, and issue threads linked to the code region for these patterns:

```
High weight (1.0): "do not change", "do not touch", "don't change", "don't touch",
                   "must not", "never change", "leave this alone"

Medium weight (0.6): "careful", "be careful", "caution", "magic number",
                     "don't ask", "trust me", "empirically tuned",
                     "load tested", "production incident"

Low weight (0.3): "legacy", "hack", "workaround", "technical debt",
                  "historical", "backwards compat", "don't break"
```

Score = sum of matched weights, capped at 3.0 before normalization.

---

## The Survivorship Engine

The survivorship engine detects decisions that were correct at the time but whose underlying constraints may have changed. It is the most powerful feature in `why-is-this` and the one most likely to prevent real production incidents.

### How it works

When a rationale annotation is created with `constraintsAtTime` entries tagged `survivorshipCheck: true`, those constraints are parsed by the survivorship engine. The engine:

1. Classifies each constraint by tag: `#infra`, `#vendor`, `#perf`, `#business`, `#team`, `#security`
2. Maps each constraint to an observable fact source
3. Periodically checks whether the constraint still applies
4. When a constraint appears expired, flags it for human review

### Constraint type → check method

| Tag | What gets checked | How |
|-----|-------------------|-----|
| `#infra` | Instance types, memory, CPU, pool sizes | Parse `terraform.tfstate` / AWS SDK / GCP SDK |
| `#vendor` | Library versions, API tier capabilities | Parse `package.json`, vendor API calls |
| `#perf` | P95/P99 latency, throughput thresholds | Query Datadog/Grafana/CloudWatch API |
| `#business` | Feature flags, product capabilities | Configurable: check a URL or env var |
| `#team` | Team size, on-call rotation | GitHub org API (contributor count) |

### Survivorship check output

```
SURVIVORSHIP REPORT
═══════════════════

EXPIRED — action required
  src/db/connection.ts:34 — pool size hardcoded to 10
  ─────────────────────────────────────────────────
  Constraint: "pool size 10 because t2.medium has 2 vCPUs, RDS max_connections=20"
  Annotated:  2020-06-12 by @james
  Checked:    2025-04-11 via infra scan

  Current reality:
    EC2 instance:       r6g.2xlarge (8 vCPUs)      ← changed
    RDS instance:       db.r6g.4xlarge              ← changed
    RDS max_connections: ~683                        ← changed
    Current pool size:  10                          ← NOT updated

  This constraint is 4 infrastructure generations stale.
  Recommended pool size: 25–40 (see formula below)

UNCERTAIN — verify manually
  src/payments/currency.ts:78 — USD-only guard
  ─────────────────────────────────────────────
  Constraint: "USD only because Stripe doesn't support multi-currency for our tier"
  Annotated:  2021-03-20 by @fatima
  Note: Stripe multi-currency has been GA since 2022. Verify if this is
        still an intentional business decision or a forgotten technical limitation.

VALID — no action needed
  src/payments/retry.ts:47-50 — 30s backoff cap
  Current p95: 3.8s (well under 30s cap) ✓
```

### Adding a custom survivorship check

You can register custom check functions in `.why-is-this.config.js`:

```javascript
module.exports = {
  survivorshipChecks: {
    // Check if a feature flag is still active
    featureFlag: async (constraint) => {
      const flagName = constraint.match(/flag:\s*(\S+)/)?.[1];
      if (!flagName) return null;
      const resp = await fetch(`${process.env.LAUNCHDARKLY_API}/flags/${flagName}`);
      const flag = await resp.json();
      return {
        stillApplies: flag.on === true,
        evidence: `Flag "${flagName}" is currently ${flag.on ? 'ON' : 'OFF'}`
      };
    }
  }
};
```

---

## The Knowledge Debt Audit

The audit command produces a report of every code region in a path, scored by rationale absence and fear score. It is designed to be run as a team ritual — not a one-time scan.

### Running the audit

```bash
# Terminal output
why-is-this --audit src/

# Markdown report (commit this to your repo)
why-is-this --audit src/ --output docs/knowledge-debt.md

# JSON (for CI integration)
why-is-this --audit src/ --json > audit.json
```

### Suggested team workflow

1. Run `why-is-this --audit . --output docs/knowledge-debt.md` and commit it
2. Add the `knowledge-debt.md` to your sprint planning review — it surfaces the riskiest unowned code
3. Schedule monthly "rationale sprints": each engineer annotates their top 2–3 high-fear orphans
4. Track coverage % over time via CI: `why-is-this --audit . --json | jq '.coverage'`

### CI badge

Add to your README:

```markdown
![Knowledge debt](https://your-ci/why-is-this-badge.svg)
```

The badge shows rationale coverage % for the repo. Teams that adopt `why-is-this` reliably report coverage climbing from 20–30% toward 70%+ within 6 months, driven purely by badge psychology.

---

## Onboarding Mode

Onboarding mode generates a narrative walkthrough of a codebase module, ordered by fear score and decision complexity — not by file name or module structure. The most dangerous code comes first, before a new engineer accidentally changes it.

### What it generates

```bash
why-is-this --onboard src/payments/ \
  --for "backend engineer joining the payments team" \
  --output docs/onboarding-payments.md
```

The output markdown document includes:

1. Module overview: purpose, entry points, key dependencies
2. High-fear regions: each with its decision chain and rationale
3. Knowledge debt warnings: code regions with no rationale and high fear score
4. Survivorship flags: decisions whose constraints may have changed
5. Ownership map: who has context on each area, who has left
6. "Safe to change" list: low-fear regions with clear rationale
7. Suggested reading order: PRs and issues worth reading before touching anything

### Example section

```markdown
## 1. Retry backoff (src/payments/retry.ts:47–50)

**Fear score: 0.83 — read this before touching anything in payments.**

This is the most-read and least-changed code in the payments module.
It handles Postgres serialization failures (error 40001) with
exponential backoff capped at 30 seconds.

**Why the 30s cap is not arbitrary:** It was tuned in production against
the p95 transaction time of ~4s (as of March 2022). Unbounded retries
caused connection pool exhaustion under burst failure conditions.

**The jitter is intentional.** Without it, concurrent failures retry
simultaneously, amplifying the original burst. This is the thundering
herd problem.

**Do NOT apply this pattern to other error codes.** The `pgErrorCode === '40001'`
guard is deliberate. Other Postgres errors should not use this backoff.

**Original context:** Issue #88 documents the production incident that
motivated this change. Worth reading before any modifications: [link]

**Bus factor warning:** @priya, the original author, left the company in
January 2023. She is no longer reachable for questions.
```

---

## VS Code Extension

The VS Code extension (`why-is-this.vscode`) provides:

### Inline ghost text

On hover over any line, ghost text shows the top chain link for that line. One-click opens the full decision chain panel.

```
47  const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
    ↳ PR #1142: "30s cap tuned against p95 txn time, prevents pool exhaustion" [0.88]
```

### Side panel

Opens with `Cmd+Shift+W`. Shows the full decision chain, fear score, and rationale for the currently selected line or cursor position.

### Gutter indicators

Lines with rationale records show a colored dot in the gutter:

- Green dot: rationale exists, fear score < 0.6
- Yellow dot: rationale exists, fear score 0.6–0.8
- Red dot: rationale exists, fear score > 0.8
- Gray hollow dot: no rationale exists
- Orange exclamation: survivorship flag pending

### Inline annotation shortcut

Right-click any line → "Add rationale annotation" → opens the interactive annotation prompt in the terminal panel.

### Configuration

```json
// settings.json
{
  "why-is-this.showGhostText": true,
  "why-is-this.ghostTextMaxLength": 120,
  "why-is-this.showGutterDots": true,
  "why-is-this.fearScoreThreshold": 0.6,
  "why-is-this.autoOpenPanel": false
}
```

---

## GitHub PR Bot

The PR bot (`why-is-this-bot`) is a GitHub App that comments on PRs when changed lines have existing decision chain context.

### What it does

On every PR, the bot:

1. Diffs the changed files
2. Queries `why-is-this` for each changed line region
3. If a rationale record or high-confidence chain exists for any changed region, posts a comment
4. If a changed region has no rationale and a fear score > 0.7, posts a debt warning

### Example bot comment

```
**why-is-this** — context for the lines changed in this PR

---

**src/payments/retry.ts:47–50** (fear score: 0.83)

This change touches a region with documented constraints. The original decision (PR #1142, @priya):

> "Capped at 30s because we saw connection pool exhaustion in prod when unbounded.
> The 30s cap was empirically tuned against our p95 transaction time of ~4s."

The jitter is intentional (prevents thundering herd). The `pgErrorCode === '40001'`
guard is deliberate — do not generalize to other error codes.

If this PR intentionally changes the cap or logic, please update the rationale:
`why-is-this annotate src/payments/retry.ts:47 --update`

---

**src/payments/idempotency.ts:112–138** (fear score: 0.94) ⚠ NO RATIONALE

This region has the highest fear score in the payments module and no documented rationale.
The original author (@marco) is no longer active. 67 developers have read this code via
git blame in the last 90 days without changing it.

Please proceed carefully, and consider adding a rationale annotation after this PR.
```

### Installation

1. Install the GitHub App at `github.com/apps/why-is-this`
2. Grant access to target repositories
3. Add to your CI: no additional setup required

### Self-hosted bot

```bash
# Clone and configure
git clone https://github.com/why-is-this/bot
cd bot
cp .env.example .env
# Add GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET

# Run
npm install
npm start
```

---

## Data Model

### TypeScript interfaces

```typescript
interface DecisionRecord {
  id: string;
  target: CodeTarget;
  chain: ChainLink[];
  rationale: Rationale | null;
  fearScore: number;           // 0–1, recomputed on each push
  survivorshipFlags: SurvivorshipFlag[];
  busFactorScore: number;      // effective number of active, knowledgeable authors
  createdAt: string;
  updatedAt: string;
}

interface CodeTarget {
  file: string;                // repo-relative path
  lineRange: [number, number]; // [start, end] inclusive
  contentHash: string;         // sha256 of the code region at annotation time
  commitAtAnnotation: string;  // short hash
}

interface ChainLink {
  type: ChainLinkType;
  url: string;
  author: string;
  date: string;
  excerpt: string;             // 1–3 sentence relevant excerpt
  confidence: number;          // 0–1 semantic relevance to code region
  raw?: string;                // full source text (stored, not shown by default)
}

type ChainLinkType =
  | "commit"
  | "pr_description"
  | "pr_comment"
  | "issue_body"
  | "issue_comment"
  | "adr"
  | "annotation"
  | "slack_export";

interface Rationale {
  author: string;
  authorGitHub: string;
  createdAt: string;
  updatedAt: string;
  summary: string;             // 1 sentence
  detail: string;              // 3–5 sentences
  alternativesConsidered: string[];
  constraintsAtTime: Constraint[];
  tags: RationaleTag[];
  stillValid: boolean | null;  // null = unchecked
}

type RationaleTag =
  | "#infra"
  | "#vendor"
  | "#perf"
  | "#business"
  | "#security"
  | "#legacy"
  | "#team";

interface Constraint {
  description: string;
  tag: RationaleTag;
  survivorshipCheck: boolean;
  checkHint?: string;          // hint for human or automated check
  checkFn?: string;            // name of registered custom check function
}

interface SurvivorshipFlag {
  constraintDescription: string;
  constraintTag: RationaleTag;
  stillApplies: boolean | null; // null = check not yet run
  checkMethod: "heuristic" | "api" | "human" | "custom";
  evidence?: string;
  flaggedAt: string;
  flaggedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: "still_valid" | "expired_no_change_needed" | "expired_update_required" | "dismissed";
}

interface FearSignals {
  ageDays: number;
  blameReads90d: number;
  commits90d: number;
  lastAuthorActive: boolean;
  distinctAuthors: number;
  constraintLanguageScore: number;
  rationaleExists: boolean;
  inactiveAuthorOwnership: number;  // 0–1, fraction of lines owned by inactive authors
}
```

---

## Architecture

### Components

```
why-is-this/
├── packages/
│   ├── cli/             # Main CLI (npm package: why-is-this)
│   ├── core/            # Trace engine, scoring, survivorship
│   ├── github/          # GitHub API client + PR bot
│   ├── embeddings/      # Local embedding model wrapper
│   ├── synthesis/       # LLM synthesis (optional, configurable)
│   └── vscode/          # VS Code extension
├── .rationale/          # (in user repos, not this repo)
└── .why-is-this.config.js  # (in user repos)
```

### Core package

The `core` package is the engine. It has no network dependencies except the optional GitHub API client. It can run fully offline against a local git repo, producing chains from commit history alone (without PR/issue content).

```
core/
├── trace/
│   ├── git.ts          # git blame, log, diff parsing
│   ├── github.ts       # PR, issue, comment fetching
│   ├── rationale.ts    # .rationale/ directory reader
│   └── chain.ts        # Chain assembly and deduplication
├── score/
│   ├── confidence.ts   # Embedding-based relevance scoring
│   ├── fear.ts         # Fear score computation
│   └── bust.ts         # Bus factor computation
├── survivorship/
│   ├── parser.ts       # Constraint language parsing
│   ├── checker.ts      # Check dispatch and caching
│   └── checks/         # Built-in check implementations
│       ├── infra.ts    # AWS/GCP/terraform checks
│       ├── vendor.ts   # npm/package.json checks
│       └── perf.ts     # Monitoring API checks
└── synthesis/
    └── index.ts        # LLM synthesis with prompt templates
```

### Embedding model

By default, `why-is-this` uses a local embedding model via Ollama (`nomic-embed-text`). This means no code leaves your machine. If Ollama is not installed, confidence scoring falls back to keyword overlap (BM25), which is less accurate but still useful.

To use OpenAI embeddings:

```bash
why-is-this config set embedding.provider openai
why-is-this config set embedding.apiKey sk-...
```

### LLM synthesis

Synthesis (the "synthesized rationale" section) is optional. By default it is disabled — the tool shows raw chain excerpts. To enable:

```bash
# Local (via Ollama)
why-is-this config set synthesis.provider ollama
why-is-this config set synthesis.model llama3.2

# OpenAI
why-is-this config set synthesis.provider openai
why-is-this config set synthesis.apiKey sk-...
```

Synthesis results are cached locally in `~/.cache/why-is-this/` and invalidated when the chain links for a region change.

### Caching

All GitHub API responses are cached in `~/.cache/why-is-this/github/` with a 24-hour TTL. Fear scores are cached per-commit and recomputed only when the repo is updated. Blame reads are tracked locally via a git post-blame hook (optional, installed with `why-is-this hooks install`).

---

## Implementation Roadmap

### Phase 1 — CLI core (weeks 1–2)

**Goal:** Useful on day one. No configuration required. Stars from this alone.

- `git blame` → commit → PR chain assembly
- Confidence scoring via keyword overlap (no embedding model required)
- Display raw chain with scores
- `--json` output for editor integration
- GitHub token via `GITHUB_TOKEN` env var

**Definition of done:** `why-is-this src/any-file.ts:42` works on any GitHub-hosted repo.

---

### Phase 2 — Rationale layer (weeks 3–4)

**Goal:** Teams can start building the annotation layer.

- `why-is-this annotate` interactive prompt
- `.rationale/` file format spec (v1.0)
- Content hash drift detection
- Include `.rationale/` files as highest-confidence chain links
- `why-is-this adr` command (generates draft ADR)

**Definition of done:** A team can annotate their first 10 code regions and have those annotations appear in future queries.

---

### Phase 3 — VS Code extension (month 2)

**Goal:** Zero-friction discovery. This is the adoption flywheel.

- Inline ghost text on hover
- Side panel with full chain
- Gutter dot indicators
- Right-click → annotate
- Connects to local `why-is-this` CLI install

**Definition of done:** Published to VS Code Marketplace. Opens a PR panel in < 200ms.

---

### Phase 4 — GitHub PR bot (month 3)

**Goal:** Brings the tool into every code review without any developer action.

- GitHub App setup
- PR diff scanning
- Rationale surfacing in PR comments
- High-fear no-rationale warnings
- "Update rationale" prompt when changed lines have stale records

**Definition of done:** Published as a GitHub App. Zero-config for repos that already have `.rationale/` files.

---

### Phase 5 — Fear score + audit (month 4)

**Goal:** Makes knowledge debt visible to leadership. This is the viral feature.

- Fear score computation and display
- `--audit` command
- Knowledge debt report (markdown + JSON)
- CI badge endpoint
- Bus factor report

**Definition of done:** `why-is-this --audit .` produces a report a CTO would share in an all-hands.

---

### Phase 6 — Survivorship engine (month 6)

**Goal:** The feature that gets written about. The thing that prevents real incidents.

- Constraint parsing from rationale annotations
- Built-in checks: infra (terraform/AWS), vendor (npm), perf (Datadog/CloudWatch)
- Custom check function registration
- Survivorship report command
- Flag integration into CLI output

**Definition of done:** A team finds a real expired constraint in their codebase using the engine.

---

## Configuration Reference

```javascript
// .why-is-this.config.js (repo root)
module.exports = {
  // GitHub configuration
  github: {
    token: process.env.GITHUB_TOKEN,
    baseUrl: 'https://api.github.com', // override for GitHub Enterprise
  },

  // Embedding model
  embedding: {
    provider: 'ollama',          // 'ollama' | 'openai' | 'bm25' (offline fallback)
    model: 'nomic-embed-text',   // Ollama model name
    apiKey: undefined,           // OpenAI API key if provider='openai'
  },

  // LLM synthesis (optional)
  synthesis: {
    enabled: false,
    provider: 'ollama',          // 'ollama' | 'openai'
    model: 'llama3.2',
    apiKey: undefined,
  },

  // Trace engine
  trace: {
    depth: 3,                    // how many hops to follow
    confidenceThreshold: 0.3,    // minimum confidence to include a link
    maxLinksPerType: 5,          // max links of each type
    includeSlackExport: null,    // path to Slack export JSON
  },

  // Fear score thresholds
  fear: {
    high: 0.8,
    moderate: 0.6,
    low: 0.3,
  },

  // Audit configuration
  audit: {
    exclude: ['node_modules', 'dist', '.git', '*.test.ts', '*.spec.ts'],
    highFearThreshold: 0.7,
  },

  // Survivorship engine
  survivorshipChecks: {
    // Register custom check functions
    // featureFlag: async (constraint) => { ... }
  },
};
```

---

## Contributing

### Getting started

```bash
git clone https://github.com/why-is-this/why-is-this
cd why-is-this
npm install
npm run build
npm run test
```

### Running the CLI locally

```bash
cd packages/cli
npm link
why-is-this --version
```

### Adding a survivorship check

1. Add a new file to `packages/core/src/survivorship/checks/`
2. Implement the `SurvivorshipCheck` interface:

```typescript
export interface SurvivorshipCheck {
  name: string;
  supportedTags: RationaleTag[];
  check(constraint: Constraint, context: RepoContext): Promise<SurvivorshipResult | null>;
}

export interface SurvivorshipResult {
  stillApplies: boolean;
  evidence: string;
  recommendation?: string;
}
```

3. Register it in `packages/core/src/survivorship/registry.ts`
4. Add tests in `packages/core/src/survivorship/checks/__tests__/`
5. Open a PR — include at least one real-world constraint it catches

### Design principles

- **No behavior change required.** Every feature must work without developers changing how they work today. The annotation workflow is opt-in enrichment, not a required process.
- **Local first.** Nothing leaves the developer's machine without explicit configuration. No telemetry by default.
- **Fast.** `why-is-this file:line` must return in < 2 seconds for cached queries, < 8 seconds for uncached queries against the GitHub API.
- **No dashboards.** The output surfaces in the terminal, the editor, and the PR. Never behind a login, never requiring a browser.
- **The annotation layer owns nothing.** `.rationale/` files are plain JSON in the repo. If the project is abandoned, the annotations are still there, still readable, still useful.

---

## License

MIT
