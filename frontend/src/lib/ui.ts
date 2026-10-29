export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function fmtDate(s: string): string {
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDateShort(s: string): string {
  const d = new Date(/[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? "n/a" : `${Math.round(n * 100)}%`;
}

export function clsx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}
