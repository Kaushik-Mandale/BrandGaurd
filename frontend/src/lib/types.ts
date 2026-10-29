// Mirrors backend/app/schemas.py
export type Severity = "low" | "medium" | "high";
export type FindingStatus = "open" | "accepted" | "rejected";
export type SubmissionStatus =
  | "pending" | "processing" | "in_review" | "changes_requested" | "approved" | "failed";
export type FindingType =
  | "terminology" | "regex" | "number_date" | "readability"
  | "claim" | "tone" | "logo" | "palette" | "contrast";
export type RuleKind = "banned_term" | "preferred_term" | "required_text" | "regex";

export interface Fix {
  id: number;
  original_text: string;
  suggested_text: string;
  rationale: string;
}

export interface Region {
  x: number; y: number; w: number; h: number;
  img_w: number; img_h: number;
}

export interface Finding {
  id: number;
  type: FindingType;
  severity: Severity;
  status: FindingStatus;
  start_offset: number | null;
  end_offset: number | null;
  flagged_text: string;
  message: string;
  evidence_quote: string | null;
  evidence_chunk_id: number | null;
  citation_title: string | null;
  citation_page: number | null;
  confidence: number;
  verified: boolean;
  fix: Fix | null;
  region: Region | null;
}

export interface Submission {
  id: number;
  title: string;
  original_text: string;
  current_text: string;
  status: SubmissionStatus;
  created_at: string;
  findings: Finding[];
  has_image: boolean;
  version?: number;
  approved_text?: string | null;
}

export interface SubmissionListItem {
  id: number;
  title: string;
  status: SubmissionStatus;
  created_at: string;
}

export interface SubmissionRevision {
  id: number;
  version: number;
  text: string;
  reason: string;
  created_by: number | null;
  created_at: string;
}

export interface BrandDocument {
  id: number;
  title: string;
  doc_type: string;
  created_at: string;
}

export interface Rule {
  id: number;
  kind: RuleKind;
  pattern: string;
  replacement: string | null;
  severity: Severity;
  description: string;
  active: boolean;
}

export interface RuleCreate {
  kind: RuleKind;
  pattern: string;
  replacement: string | null;
  severity: Severity;
  description: string;
}

export interface SearchHit {
  chunk_id: number;
  doc_id: number;
  doc_title: string;
  page: number | null;
  text: string;
  score: number;
}

export interface AuditEntry {
  id: number;
  submission_id: number | null;
  user_id: number | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RuleStat {
  rule_id: number;
  pattern: string;
  triggered: number;
  accepted: number;
  rejected: number;
}

export interface Insights {
  submissions: { total: number; approved: number };
  findings: {
    total: number;
    by_type: Record<string, number>;
    by_severity: Record<string, number>;
    by_status: Record<string, number>;
  };
  acceptance_rate: number | null;
  ai_findings: {
    total: number;
    rejected_by_reviewers: number;
    false_positive_rate: number | null;
    dropped_by_verifier: number;
  };
  top_flagged: { type: string; text: string; count: number }[];
  top_rules: RuleStat[];
  ambiguous_rules: (RuleStat & { hint: string })[];
}

export interface BrandAsset {
  id: number;
  kind: "logo" | "palette";
  name: string;
  data: Record<string, unknown>;
  created_at: string;
}
