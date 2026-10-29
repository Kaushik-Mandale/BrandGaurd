"use client";
import type { Finding } from "@/lib/types";

type Seg = { kind: "plain"; text: string } | { kind: "finding"; f: Finding; text: string };

// Offsets from the API are code-point indices, so slice with Array.from (not string.slice).
function build(text: string, findings: Finding[]): { segs: Seg[]; appends: Finding[] } {
  const chars = Array.from(text);
  const withSpan = findings.filter((f) => f.start_offset !== null && f.end_offset !== null);
  const appends = withSpan.filter((f) => f.end_offset === f.start_offset);
  const spans = withSpan
    .filter((f) => (f.end_offset as number) > (f.start_offset as number))
    .sort((a, b) => (a.start_offset as number) - (b.start_offset as number));

  const segs: Seg[] = [];
  let pos = 0;
  for (const f of spans) {
    const s = f.start_offset as number;
    const e = f.end_offset as number;
    if (s < pos) continue; // overlap guard
    if (s > pos) segs.push({ kind: "plain", text: chars.slice(pos, s).join("") });
    segs.push({ kind: "finding", f, text: chars.slice(s, e).join("") });
    pos = e;
  }
  if (pos < chars.length) segs.push({ kind: "plain", text: chars.slice(pos).join("") });
  return { segs, appends };
}

const OPEN: Record<string, string> = {
  high: "bg-red-200 hover:bg-red-300",
  medium: "bg-amber-200 hover:bg-amber-300",
  low: "bg-sky-200 hover:bg-sky-300",
};

function markClass(f: Finding, selected: boolean): string {
  const base = "cursor-pointer rounded px-0.5 text-slate-900 transition ";
  const ring = selected ? "ring-2 ring-indigo-500 " : "";
  if (f.status === "accepted") return base + ring + "bg-green-200 hover:bg-green-300";
  if (f.status === "rejected") return base + ring + "bg-slate-100 text-slate-500 underline decoration-dotted";
  return base + ring + OPEN[f.severity];
}

interface Props {
  text: string;
  findings: Finding[];
  mode: "highlight" | "diff";
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function TextView({ text, findings, mode, selectedId, onSelect }: Props) {
  const { segs, appends } = build(text, findings);

  return (
    <div className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-5 text-[15px] leading-7 text-slate-900">
      {segs.map((s, i) => {
        if (s.kind === "plain") return <span key={i}>{s.text}</span>;

        if (mode === "diff") {
          if (s.f.status === "accepted" && s.f.fix) {
            return (
              <span key={i}>
                <del className="rounded bg-red-100 px-0.5 text-red-800">{s.text}</del>
                {s.f.fix.suggested_text && (
                  <ins className="rounded bg-green-100 px-0.5 text-green-800 no-underline">
                    {s.f.fix.suggested_text}
                  </ins>
                )}
              </span>
            );
          }
          return <span key={i}>{s.text}</span>;
        }

        return (
          <mark
            key={i}
            id={`mark-${s.f.id}`}
            title={s.f.message}
            onClick={() => onSelect(s.f.id)}
            className={markClass(s.f, selectedId === s.f.id)}
          >
            {s.text}
          </mark>
        );
      })}

      {/* findings that insert text at the very end (e.g. missing disclaimer) */}
      {mode === "highlight" &&
        appends.map((f) => (
          <button
            key={f.id}
            id={`mark-${f.id}`}
            onClick={() => onSelect(f.id)}
            className={`mt-4 block w-full rounded-md border border-dashed px-3 py-2 text-left text-sm ${
              selectedId === f.id ? "ring-2 ring-indigo-500 " : ""
            }${
              f.status === "accepted"
                ? "border-green-400 bg-green-50 text-green-800"
                : f.status === "rejected"
                ? "border-slate-300 bg-slate-50 text-slate-500"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            + {f.message}
          </button>
        ))}

      {mode === "diff" &&
        appends
          .filter((f) => f.status === "accepted" && f.fix)
          .map((f) => (
            <ins key={f.id} className="rounded bg-green-100 px-0.5 text-green-800 no-underline">
              {f.fix?.suggested_text}
            </ins>
          ))}
    </div>
  );
}