import type {
  AuditEntry, BrandAsset, BrandDocument, Insights, Rule, RuleCreate, SearchHit,
  Submission, SubmissionListItem, SubmissionRevision,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init?.headers);
    res = await fetch(BASE + path, {
      cache: "no-store",
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the backend. Is it running on " + BASE + "?");
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("brandguard:unauthorized"));
    }
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    } catch { /* keep statusText */ }
    if (res.status === 404 && path.startsWith("/auth/")) {
      detail = "This backend does not expose the current authentication routes. Restart/update the backend and verify NEXT_PUBLIC_API_URL.";
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organization_id: number;
}

interface AuthResponse {
  expires_in: number;
  user: AuthUser;
}

export async function fetchAuthenticatedFile(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("brandguard:unauthorized"));
    }
    throw new ApiError(response.status, response.statusText || "Unable to load file");
  }
  return URL.createObjectURL(await response.blob());
}

const post = (body?: unknown): RequestInit =>
  body === undefined
    ? { method: "POST" }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };

export const api = {
  health: () => req<{ status: string; version: string }>("/health"),
  authStatus: () => req<{ authentication_enabled: boolean; registration_enabled: boolean }>("/auth/status"),
  login: (email: string, password: string) =>
    req<AuthResponse>("/auth/login", post({ email, password })),
  register: async (name: string, email: string, password: string, organization_name: string) => {
    const result = await req<AuthResponse>(
      "/auth/register",
      post({ name, email, password, organization_name }),
    );
    return result.user;
  },
  logout: () => req<void>("/auth/logout", post()),
  me: () => req<AuthUser>("/auth/me"),

  // submissions
  listSubmissions: () => req<SubmissionListItem[]>("/submissions"),
  getSubmission: (id: number) => req<Submission>(`/submissions/${id}`),
  listRevisions: (id: number) => req<SubmissionRevision[]>(`/submissions/${id}/revisions`),
  createSubmission: (title: string, text: string) =>
    req<{ id: number; status: string }>("/submissions", post({ title, text })),
  uploadSubmission: (file: File, title: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);
    return req<{ id: number; status: string }>("/submissions/upload", { method: "POST", body: fd });
  },
  rerun: (id: number) => req<{ id: number }>(`/submissions/${id}/rerun`, post()),

  // review
  acceptFinding: (sid: number, fid: number, suggestedText?: string) =>
    req<Submission>(
      `/submissions/${sid}/findings/${fid}/accept`,
      post(suggestedText === undefined ? undefined : { suggested_text: suggestedText }),
    ),
  rejectFinding: (sid: number, fid: number) =>
    req<Submission>(`/submissions/${sid}/findings/${fid}/reject`, post()),
  reopenFinding: (sid: number, fid: number) =>
    req<Submission>(`/submissions/${sid}/findings/${fid}/reopen`, post()),
  acceptAll: (sid: number) => req<Submission>(`/submissions/${sid}/accept-all`, post()),
  comment: (sid: number, text: string) =>
    req<{ ok: boolean }>(`/submissions/${sid}/comments`, post({ text })),
  requestChanges: (sid: number, note: string) =>
    req<Submission>(`/submissions/${sid}/request-changes`, post({ note })),
  approve: (sid: number, force?: boolean, overrideReason?: string) =>
    req<Submission>(`/submissions/${sid}/approve`, post({ force: !!force, override_reason: overrideReason })),
  editSubmission: (sid: number, text: string) =>
    req<Submission>(`/submissions/${sid}/edit`, post({ text })),

  // knowledge base
  listDocuments: () => req<BrandDocument[]>("/knowledge/documents"),
  uploadDocument: (file: File, title: string, docType: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);
    fd.append("doc_type", docType);
    return req<{ id: number; title: string; doc_type: string; chunks: number }>(
      "/knowledge/documents", { method: "POST", body: fd });
  },
  deleteDocument: (id: number) => req<{ deleted: number }>(`/knowledge/documents/${id}`, { method: "DELETE" }),
  search: (q: string) => req<SearchHit[]>(`/knowledge/search?q=${encodeURIComponent(q)}&k=5`),
  listRules: () => req<Rule[]>("/knowledge/rules"),
  createRule: (r: RuleCreate) => req<Rule>("/knowledge/rules", post(r)),
  toggleRule: (id: number) => req<Rule>(`/knowledge/rules/${id}/toggle`, { method: "PATCH" }),
  deleteRule: (id: number) => req<{ deleted: number }>(`/knowledge/rules/${id}`, { method: "DELETE" }),

  // visual identity
  imageUrl: (id: number) => `${BASE}/submissions/${id}/image`,
  assetFileUrl: (id: number) => `${BASE}/assets/${id}/file`,
  listAssets: () => req<BrandAsset[]>("/assets"),
  uploadLogo: (file: File, name: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name || file.name);
    return req<BrandAsset>("/assets/logo", { method: "POST", body: fd });
  },
  createPalette: (name: string, colors: string[]) =>
    req<BrandAsset>("/assets/palette", post({ name, colors })),
  deleteAsset: (id: number) => req<{ deleted: number }>(`/assets/${id}`, { method: "DELETE" }),

  // audit + insights
  audit: (submissionId?: number) =>
    req<AuditEntry[]>("/audit" + (submissionId ? `?submission_id=${submissionId}` : "")),
  insights: () => req<Insights>("/insights"),
};
