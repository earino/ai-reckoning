/** Generic accessible 2D SVG chart: the perspective-free alternative to every 3D view, and the non-WebGL fallback. */
import { scaleLinear, scaleLog } from "d3-scale";
import type { Role } from "../data/types";
import { ROLE_COLOR } from "../data/roles";

export interface FlatPoint { id: string; x: number; y: number; r: number; role: Role; label: string; title: string; color?: string; dim?: boolean; lo?: number; hi?: number; hollow?: boolean }
export interface FlatLine { x1: number; y1: number; x2: number; y2: number; color: string; width?: number; dash?: string; opacity?: number; label?: string; arrow?: boolean }
export interface FlatAxis { label: string; domain: [number, number]; ticks: number[]; format: (v: number) => string; log?: boolean }
interface Props {
  points: FlatPoint[]; lines?: FlatLine[]; x: FlatAxis; y: FlatAxis; selectedId: string | null; onSelect: (id: string | null) => void;
  labels?: string[]; title: string; desc: string; height?: number; bands?: { y: number; label: string; color: string }[]; hideXAxis?: boolean;
}

export function Shape({ role, r, fill, stroke, hollow }: { role: Role; r: number; fill: string; stroke?: string; hollow?: boolean }) {
  const p = { fill: hollow ? "none" : fill, stroke: stroke ?? (hollow ? fill : "#0b0c0e"), strokeWidth: hollow ? 1.5 : 0.75 };
  switch (role) {
    case "infrastructure": return <rect x={-r} y={-r} width={2 * r} height={2 * r} {...p} />;
    case "models_apps": return <polygon points={`0,${-r * 1.25} ${r * 1.15},${r * 0.9} ${-r * 1.15},${r * 0.9}`} {...p} />;
    case "capital": return <polygon points={`0,${-r * 1.3} ${r * 1.3},0 0,${r * 1.3} ${-r * 1.3},0`} {...p} />;
    case "energy": return <polygon points={[0, 1, 2, 3, 4, 5].map((i) => `${Math.cos((i * Math.PI) / 3) * r * 1.15},${Math.sin((i * Math.PI) / 3) * r * 1.15}`).join(" ")} {...p} />;
    case "compute": return <circle r={r} {...p} />;
    default: return <circle r={r * 0.85} fill="none" stroke={fill} strokeWidth={1.5} />;
  }
}

export default function Flat({ points, lines = [], x, y, selectedId, onSelect, labels = [], title, desc, height = 520, bands, hideXAxis }: Props) {
  const W = 920, H = height, m = { l: 64, r: 24, t: 18, b: hideXAxis ? 16 : 52 };
  const sx = (x.log ? scaleLog() : scaleLinear()).domain(x.domain).range([m.l, W - m.r]).clamp(true);
  const sy = scaleLinear().domain(y.domain).range([H - m.b, m.t]).clamp(true);
  const labelSet = new Set([...labels, ...(selectedId ? [selectedId] : [])]);
  const sorted = [...points].sort((a, b) => Number(!!b.dim) - Number(!!a.dim) || b.r - a.r);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="flat" role="img" aria-label={title} onClick={() => onSelect(null)}>
      <title>{title}</title><desc>{desc}</desc>
      <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke" /></marker></defs>
      {y.ticks.map((t) => (
        <g key={`y${t}`}><line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke={t === 0 ? "#6b7079" : "#24272c"} strokeWidth={1} />
          <text x={m.l - 8} y={sy(t) + 4} textAnchor="end" className="tick">{y.format(t)}</text></g>
      ))}
      {!hideXAxis && x.ticks.map((t) => (
        <g key={`x${t}`}><line y1={m.t} y2={H - m.b} x1={sx(t)} x2={sx(t)} stroke="#1d2024" strokeWidth={1} />
          <text x={sx(t)} y={H - m.b + 18} textAnchor="middle" className="tick">{x.format(t)}</text></g>
      ))}
      {bands?.map((b) => <text key={b.label} x={m.l + 4} y={sy(b.y) - 16} className="band-label" fill={b.color}>{b.label}</text>)}
      {!hideXAxis && <text x={(m.l + W - m.r) / 2} y={H - 8} textAnchor="middle" className="axis-title">{x.label}</text>}
      <text transform={`translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">{y.label}</text>
      {lines.map((l, i) => (
        <g key={i}><line x1={sx(l.x1)} y1={sy(l.y1)} x2={sx(l.x2)} y2={sy(l.y2)} stroke={l.color} strokeWidth={l.width ?? 1.5} strokeDasharray={l.dash} opacity={l.opacity ?? 1} markerEnd={l.arrow ? "url(#arr)" : undefined} />
          {l.label && <text x={sx(l.x2) - 6} y={sy(l.y2) - 8} textAnchor="end" className="line-label" fill={l.color}>{l.label}</text>}</g>
      ))}
      {sorted.map((p) => {
        const sel = p.id === selectedId; const c = p.color ?? ROLE_COLOR[p.role];
        return (
          <g key={p.id} transform={`translate(${sx(p.x)} ${sy(p.y)})`} opacity={p.dim && !sel ? 0.22 : 0.92} className="pt" onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}>
            <title>{p.title}</title>
            {p.lo != null && p.hi != null && <line x1={0} x2={0} y1={sy(p.lo) - sy(p.y)} y2={sy(p.hi) - sy(p.y)} stroke={c} strokeWidth={1} opacity={0.45} />}
            <Shape role={p.role} r={sel ? p.r + 2.5 : p.r} fill={c} stroke={sel ? "#fff" : undefined} hollow={p.hollow} />
            {labelSet.has(p.id) && <text x={p.r + 5} y={4} className={`pt-label ${sel ? "sel" : ""}`}>{p.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}
