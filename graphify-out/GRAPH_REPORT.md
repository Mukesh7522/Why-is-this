# Graph Report - .  (2026-04-11)

## Corpus Check
- Corpus is ~5,190 words - fits in a single context window. You may not need a graph.

## Summary
- 36 nodes · 34 edges · 13 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `CLI Tool` - 6 edges
2. `Trace Engine` - 6 edges
3. `Fear Score Algorithm` - 6 edges
4. `Rationale Layer` - 5 edges
5. `Survivorship Engine` - 4 edges
6. `Knowledge Debt Audit` - 4 edges
7. `why-is-this Project` - 3 edges
8. `Confidence Scoring` - 3 edges
9. `Embedding Model` - 3 edges
10. `Bus Factor Score` - 3 edges

## Surprising Connections (you probably didn't know these)
- `CLI Tool` --calls--> `Trace Engine`  [EXTRACTED]
  why-is-this-docs.md → why-is-this-docs.md  _Bridges community 1 → community 5_
- `CLI Tool` --calls--> `Fear Score Algorithm`  [EXTRACTED]
  why-is-this-docs.md → why-is-this-docs.md  _Bridges community 1 → community 2_
- `CLI Tool` --calls--> `Survivorship Engine`  [EXTRACTED]
  why-is-this-docs.md → why-is-this-docs.md  _Bridges community 1 → community 0_
- `Trace Engine` --implements--> `Decision Chain`  [EXTRACTED]
  why-is-this-docs.md → why-is-this-docs.md  _Bridges community 5 → community 4_
- `Trace Engine` --references--> `Rationale Layer`  [EXTRACTED]
  why-is-this-docs.md → why-is-this-docs.md  _Bridges community 5 → community 0_

## Hyperedges (group relationships)
- **Core Analysis System** — docs_trace_engine, docs_fear_score, docs_survivorship_engine, docs_rationale_layer, docs_confidence_scoring [EXTRACTED 1.00]
- **User Interfaces** — docs_cli_tool, docs_vscode_extension, docs_github_pr_bot [EXTRACTED 1.00]
- **Embedding / LLM Providers** — docs_ollama, docs_openai, docs_bm25_fallback [EXTRACTED 1.00]

## Communities

### Community 0 - "Rationale Storage"
Cohesion: 0.33
Nodes (6): Constraint Type, Content Hash Drift, Rationale File Format, Rationale Layer, Survivorship Engine, Survivorship Flag

### Community 1 - "User Interfaces"
Cohesion: 0.4
Nodes (5): CLI Tool, GitHub PR Bot, Onboarding Mode, VS Code Extension, why-is-this Project

### Community 2 - "Fear and Debt Analysis"
Cohesion: 0.6
Nodes (5): Bus Factor Score, Constraint Language Detection, Fear Score Algorithm, Knowledge Debt, Knowledge Debt Audit

### Community 3 - "Embedding and Scoring"
Cohesion: 0.4
Nodes (5): BM25 Fallback, Confidence Scoring, Embedding Model, Ollama, OpenAI

### Community 4 - "Data Model"
Cohesion: 0.4
Nodes (5): ChainLink Interface, Data Model, Decision Chain, DecisionRecord Interface, FearSignals Interface

### Community 5 - "Trace and Synthesis"
Cohesion: 0.67
Nodes (3): git blame, LLM Synthesis, Trace Engine

### Community 6 - "ADR Generator"
Cohesion: 1.0
Nodes (1): ADR Generator

### Community 7 - "Annotate Command"
Cohesion: 1.0
Nodes (1): Annotate Command

### Community 8 - "Audit Command"
Cohesion: 1.0
Nodes (1): Audit Command

### Community 9 - "Core Package"
Cohesion: 1.0
Nodes (1): Core Package

### Community 10 - "Configuration"
Cohesion: 1.0
Nodes (1): Configuration Reference

### Community 11 - "Implementation Roadmap"
Cohesion: 1.0
Nodes (1): Implementation Roadmap

### Community 12 - "Caching"
Cohesion: 1.0
Nodes (1): Caching

## Knowledge Gaps
- **21 isolated node(s):** `VS Code Extension`, `GitHub PR Bot`, `Onboarding Mode`, `git blame`, `LLM Synthesis` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `ADR Generator`** (1 nodes): `ADR Generator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Annotate Command`** (1 nodes): `Annotate Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Command`** (1 nodes): `Audit Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Core Package`** (1 nodes): `Core Package`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Configuration`** (1 nodes): `Configuration Reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Implementation Roadmap`** (1 nodes): `Implementation Roadmap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Caching`** (1 nodes): `Caching`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Trace Engine` connect `Trace and Synthesis` to `Rationale Storage`, `User Interfaces`, `Embedding and Scoring`, `Data Model`?**
  _High betweenness centrality (0.325) - this node is a cross-community bridge._
- **Why does `CLI Tool` connect `User Interfaces` to `Rationale Storage`, `Fear and Debt Analysis`, `Trace and Synthesis`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Why does `Fear Score Algorithm` connect `Fear and Debt Analysis` to `User Interfaces`, `Data Model`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **What connects `VS Code Extension`, `GitHub PR Bot`, `Onboarding Mode` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._