/** Number formatting used by narrative and graphics. Null always renders as an explicit "n/a". */
export const NA = "n/a";
export function pct(v: number | null | undefined, digits = 1, signed = true): string {
  if (v == null || Number.isNaN(v)) return NA;
  const x = v * 100;
  const s = Math.abs(x).toFixed(digits);
  return (x < 0 ? "−" : signed ? "+" : "") + s + "%";
}
export function pctPlain(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return NA;
  return (v * 100).toFixed(digits) + "%";
}
export function usd(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return NA;
  const a = Math.abs(v); const sign = v < 0 ? "−" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(digits)}tn`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(a >= 1e11 ? 0 : digits)}bn`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(0)}m`;
  return `${sign}$${a.toFixed(0)}`;
}
export function num(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return NA;
  return (v < 0 ? "−" : "") + Math.abs(v).toFixed(digits);
}
export function pValue(p: number | null | undefined): string {
  if (p == null) return NA;
  return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(p < 0.01 ? 3 : 2)}`;
}
export function dateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[m - 1]} ${y}`;
}
export function dateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}
/** Magnitude only, for sentences where the verb gives the direction ("fell 12%"). */
export function mag(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return NA;
  return Math.abs(v * 100).toFixed(digits) + "%";
}
