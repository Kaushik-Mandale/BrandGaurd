"use client";
import { api } from "@/lib/api";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import type { Finding, Region } from "@/lib/types";

interface Props {
  submissionId: number;
  findings: Finding[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function boxClass(f: Finding, selected: boolean): string {
  const ring = selected ? "ring-2 ring-indigo-500 ring-offset-1 " : "";
  if (f.status === "accepted") return ring + "border-green-500 bg-green-500/15";
  if (f.status === "rejected") return ring + "border-slate-400 border-dashed bg-slate-400/10";
  if (f.severity === "high") return ring + "border-red-500 bg-red-500/20";
  if (f.severity === "medium") return ring + "border-amber-500 bg-amber-500/20";
  return ring + "border-sky-500 bg-sky-500/20";
}

export default function ImageOverlay({ submissionId, findings, selectedId, onSelect }: Props) {
  const boxed = findings.filter((f): f is Finding & { region: Region } => f.region !== null);
  const whole = findings.filter(
    (f) => f.region === null && ["logo", "palette", "contrast"].includes(f.type),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative inline-block max-w-full">
          <AuthenticatedImage
            src={api.imageUrl(submissionId)}
            alt="Submitted creative"
            className="block h-auto max-h-[70vh] w-auto max-w-full rounded"
          />
          {boxed.map((f) => (
            <button
              key={f.id}
              id={`mark-${f.id}`}
              title={f.message}
              onClick={() => onSelect(f.id)}
              className={`absolute rounded-sm border-2 transition ${boxClass(f, selectedId === f.id)}`}
              style={{
                left: `${(f.region.x / f.region.img_w) * 100}%`,
                top: `${(f.region.y / f.region.img_h) * 100}%`,
                width: `${(f.region.w / f.region.img_w) * 100}%`,
                height: `${(f.region.h / f.region.img_h) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      {whole.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Whole-image findings</div>
          {whole.map((f) => (
            <button
              key={f.id}
              id={`mark-${f.id}`}
              onClick={() => onSelect(f.id)}
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                selectedId === f.id ? "ring-2 ring-indigo-500 " : ""
              }${
                f.status === "accepted"
                  ? "border-green-300 bg-green-50 text-green-800"
                  : f.status === "rejected"
                  ? "border-slate-200 bg-slate-50 text-slate-500"
                  : "border-amber-300 bg-amber-50 text-amber-900"
              }`}
            >
              {f.message}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Boxes mark low-contrast text, logo problems and other visual issues. Click a box to jump to its finding.
        Red = high, amber = medium, blue = low.
      </p>
    </div>
  );
}