export type RationaleTag =
  | '#infra' | '#vendor' | '#perf' | '#business'
  | '#security' | '#legacy' | '#team';

export type ChainLinkType =
  | 'commit' | 'pr_description' | 'pr_comment'
  | 'issue_body' | 'issue_comment' | 'adr'
  | 'annotation' | 'slack_export';

export interface CodeTarget {
  file: string;
  lineRange: [number, number];
  contentHash: string;
  commitAtAnnotation: string;
}

export interface ChainLink {
  type: ChainLinkType;
  url: string;
  author: string;
  date: string;
  excerpt: string;
  confidence: number;
  raw?: string;
}

export interface Constraint {
  description: string;
  tag: RationaleTag;
  survivorshipCheck: boolean;
  checkHint?: string;
  checkFn?: string;
}

export interface Rationale {
  author: string;
  authorGitHub: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  detail: string;
  alternativesConsidered: string[];
  constraintsAtTime: Constraint[];
  tags: RationaleTag[];
  stillValid: boolean | null;
}

export interface SurvivorshipFlag {
  constraintDescription: string;
  constraintTag: RationaleTag;
  stillApplies: boolean | null;
  checkMethod: 'heuristic' | 'api' | 'human' | 'custom';
  evidence?: string;
  flaggedAt: string;
  flaggedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: 'still_valid' | 'expired_no_change_needed' | 'expired_update_required' | 'dismissed';
}

export interface FearSignals {
  ageDays: number;
  blameReads90d: number;
  commits90d: number;
  lastAuthorActive: boolean;
  distinctAuthors: number;
  constraintLanguageScore: number;
  rationaleExists: boolean;
  inactiveAuthorOwnership: number;
}

export interface DecisionRecord {
  id: string;
  target: CodeTarget;
  chain: ChainLink[];
  rationale: Rationale | null;
  fearScore: number;
  survivorshipFlags: SurvivorshipFlag[];
  busFactorScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface RationaleFile {
  schema: 'why-is-this/rationale@1.0';
  id: string;
  target: CodeTarget;
  rationale: Rationale;
  chainLinks: Array<{ type: ChainLinkType; ref: string; url: string; confidence: number }>;
}
