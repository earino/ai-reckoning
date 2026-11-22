/**
 * One shared WebGL world. The same company marks move between analytical layouts, so every
 * transition shows a change of perspective on the same companies rather than a new chart.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { GEdge, Role } from "../data/types";
import { DECLINE, EDGE_FAMILY, FAMILY_COLOR, GAIN, ROLE_COLOR, ROLE_LABEL } from "../data/roles";
import { pct, usd } from "../data/format";
import { guideSpec } from "./guides";
import { AXES, BAND_ROLES, CAMERA, computeLayout } from "./layouts";
import type { CameraPreset, Entity, LayoutOpts, Placement, ViewKey } from "./layouts";

export interface EdgeFilter { types: Set<string>; statuses: Set<string> }
export interface WorldProps {
  entities: Entity[]; edges: GEdge[]; view: ViewKey; opts: LayoutOpts; camera: CameraPreset; interactive: boolean;
  selectedId: string | null; onSelect: (id: string | null) => void; labels: string[]; focus: string[] | null;
  colorMode: "role" | "return"; edgeFilter: EdgeFilter; roleFilter: Set<Role>; reducedMotion: boolean; mobile: boolean; paused: boolean; quiet?: boolean;
  marketReturn: number | null; fit: { intercept: number; slope: number } | null; dateLabel: string;
}

const BG = new THREE.Color("#0b0c0e");
const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

function geometryFor(role: Role): THREE.BufferGeometry {
  switch (role) {
    case "compute": return new THREE.SphereGeometry(1, 20, 14);
    case "infrastructure": return new THREE.BoxGeometry(1.5, 1.5, 1.5);
    case "models_apps": return new THREE.ConeGeometry(1.15, 1.9, 3);
    case "capital": return new THREE.OctahedronGeometry(1.3, 0);
    case "energy": return new THREE.CylinderGeometry(1.05, 1.05, 1.5, 6);
    default: return new THREE.IcosahedronGeometry(0.95, 0);
  }
}

function Rig({ preset, interactive, reducedMotion, mobile }: { preset: CameraPreset; interactive: boolean; reducedMotion: boolean; mobile: boolean }) {
  const { camera, size } = useThree();
  // Wide screens: shift the picture right, clear of the text column. Narrow screens: the scene has its own band,
  // so there is no shift; the field of view widens to keep the same horizontal coverage in a near-square band.
  const wantShift = (): [number, number] => (mobile ? [0, 0] : preset.shift ?? [0.09, 0]);
  const shift = useRef<[number, number]>(wantShift());
  const applyShift = () => {
    const c = camera as THREE.PerspectiveCamera; const [sx, sy] = shift.current;
    if (sx === 0 && sy === 0) c.clearViewOffset(); else c.setViewOffset(size.width, size.height, -size.width * sx, -size.height * sy, size.width, size.height);
    c.updateProjectionMatrix();
  };
  const controls = useRef<any>(null);
  const goal = useRef({ pos: new THREE.Vector3(...preset.position), tgt: new THREE.Vector3(...preset.target), moving: true });
  const tgt = useRef(new THREE.Vector3(...preset.target));
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    const t = mobile ? Math.min(Math.tan((33 * Math.PI) / 180), Math.max(Math.tan((21 * Math.PI) / 180), 0.68 / (size.width / size.height))) : Math.tan((21 * Math.PI) / 180);
    c.fov = (2 * Math.atan(t) * 180) / Math.PI;
    if (mobile) shift.current = [0, 0];
    applyShift(); goal.current.moving = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size, mobile]);
  useEffect(() => {
    goal.current.pos.set(...preset.position); goal.current.tgt.set(...preset.target); goal.current.moving = true;
  }, [preset]);
  useFrame((_, dt) => {
    const g = goal.current;
    if (!g.moving) return;
    const k = reducedMotion ? 1 : Math.min(1, dt * 2.2);
    camera.position.lerp(g.pos, k); tgt.current.lerp(g.tgt, k);
    const w = wantShift();
    if (Math.abs(w[0] - shift.current[0]) + Math.abs(w[1] - shift.current[1]) > 0.0005) { shift.current = [shift.current[0] + (w[0] - shift.current[0]) * k, shift.current[1] + (w[1] - shift.current[1]) * k]; applyShift(); }
    else if (shift.current[0] !== w[0] || shift.current[1] !== w[1]) { shift.current = w; applyShift(); }
    camera.lookAt(tgt.current);
    if (controls.current) { controls.current.target.copy(tgt.current); controls.current.update(); }
    if (camera.position.distanceTo(g.pos) < 0.02) g.moving = false;
  });
  if (!interactive) return null;
  return <OrbitControls ref={controls} enableZoom={false} enablePan={false} rotateSpeed={0.5} onStart={() => { goal.current.moving = false; }} makeDefault />;
}

interface Shared { cur: Float32Array; alpha: Float32Array; placements: Placement[] }

function Marks(props: WorldProps & { shared: React.MutableRefObject<Shared>; onHover: (i: number | null) => void }) {
  const { entities, view, selectedId, focus, colorMode, roleFilter, reducedMotion, shared, onHover, onSelect, opts } = props;
  const groups = useMemo(() => {
    const m = new Map<Role, number[]>();
    entities.forEach((e, i) => { const k = (BAND_ROLES.includes(e.role) ? e.role : "other") as Role; (m.get(k) ?? m.set(k, []).get(k)!).push(i); });
    return [...m.entries()].map(([role, idx]) => ({ role, idx, geo: geometryFor(role) }));
  }, [entities]);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const stems = useRef<THREE.LineSegments>(null);
  const stemGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(entities.length * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(entities.length * 6), 3));
    return g;
  }, [entities]);
  const focusSet = useMemo(() => (focus ? new Set(focus) : null), [focus]);
  const settled = useRef(0);
  useEffect(() => { settled.current = 0; }, [view, opts.dateIndex, opts.window, opts.model, opts.absolute, selectedId, focus, colorMode, roleFilter]);

  useFrame((_, dt) => {
    if (settled.current > 40) return; // nothing is changing: skip the per-instance work
    const { cur, alpha, placements } = shared.current;
    const k = reducedMotion ? 1 : Math.min(1, dt * 3.2);
    let moved = 0;
    for (let i = 0; i < entities.length; i++) {
      const p = placements[i]; const j = i * 3;
      const dx = p.x - cur[j], dy = p.y - cur[j + 1], dz = p.z - cur[j + 2], da = p.alpha - alpha[i];
      cur[j] += dx * k; cur[j + 1] += dy * k; cur[j + 2] += dz * k; alpha[i] += da * k;
      moved += Math.abs(dx) + Math.abs(dy) + Math.abs(dz) + Math.abs(da);
    }
    settled.current = moved < 0.01 ? settled.current + 1 : 0;
    const stemPos = stemGeo.attributes.position as THREE.BufferAttribute; const stemCol = stemGeo.attributes.color as THREE.BufferAttribute;
    const showStems = view === "repricing";
    groups.forEach((g, gi) => {
      const mesh = meshes.current[gi]; if (!mesh) return;
      g.idx.forEach((ei, local) => {
        const e = entities[ei]; const p = placements[ei]; const j = ei * 3;
        let a = alpha[ei];
        if (!roleFilter.has(e.role) && e.inUniverse) a *= 0.12;
        if (focusSet && !focusSet.has(e.id)) a *= 0.28;
        const sel = e.id === selectedId;
        const s = e.radius * (sel ? 1.6 : 1) * (a < 0.02 ? 0.0001 : 1);
        tmpObj.position.set(cur[j], cur[j + 1], cur[j + 2]); tmpObj.scale.setScalar(s); tmpObj.updateMatrix();
        mesh.setMatrixAt(local, tmpObj.matrix);
        if (colorMode === "return" && p.value != null && !p.parked) {
          const v = p.value; const t = Math.min(1, Math.abs(v) / (opts.window === "peak" ? 0.5 : 0.2));
          tmpColor.set(v < 0 ? DECLINE : GAIN).lerp(new THREE.Color("#8a8f98"), 1 - (0.25 + 0.75 * t));
        } else tmpColor.set(e.inUniverse ? ROLE_COLOR[e.role] : "#d8d2c4");
        if (sel) tmpColor.lerp(new THREE.Color("#ffffff"), 0.35);
        tmpColor.lerp(BG, 1 - Math.min(1, a));
        mesh.setColorAt(local, tmpColor);
        // stems: a vertical line from the 6 October level to the mark
        const y0 = 0, y1 = showStems && !p.parked ? cur[j + 1] : 0;
        stemPos.setXYZ(ei * 2, cur[j], y0, cur[j + 2]); stemPos.setXYZ(ei * 2 + 1, cur[j], y1, cur[j + 2]);
        tmpColor.set(y1 < 0 ? DECLINE : GAIN).lerp(BG, 1 - 0.55 * Math.min(1, a));
        stemCol.setXYZ(ei * 2, tmpColor.r, tmpColor.g, tmpColor.b); stemCol.setXYZ(ei * 2 + 1, tmpColor.r, tmpColor.g, tmpColor.b);
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    stemPos.needsUpdate = true; stemCol.needsUpdate = true;
    if (stems.current) stems.current.visible = showStems;
  });

  return (
    <group>
      {groups.map((g, gi) => (
        <instancedMesh key={g.role} ref={(m) => { meshes.current[gi] = m; }} args={[g.geo, undefined, g.idx.length]} frustumCulled={false}
          onPointerMove={(e) => { e.stopPropagation(); const ei = g.idx[e.instanceId ?? -1]; if (ei != null && shared.current.alpha[ei] > 0.2) onHover(ei); }}
          onPointerOut={() => onHover(null)}
          onClick={(e) => { e.stopPropagation(); const ei = g.idx[e.instanceId ?? -1]; if (ei != null && shared.current.alpha[ei] > 0.2) onSelect(entities[ei].id); }}>
          <meshStandardMaterial roughness={0.55} metalness={0.05} />
        </instancedMesh>
      ))}
      <lineSegments ref={stems} geometry={stemGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

function edgeCurve(a: THREE.Vector3, b: THREE.Vector3, bow: number): THREE.QuadraticBezierCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a); const perp = new THREE.Vector3(-dir.z, 0.35 * dir.length(), dir.x).normalize();
  mid.addScaledVector(perp, bow);
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}
export function edgeWidth(e: GEdge): number {
  return e.comparable_amount ? Math.min(6, 1 + 5 * Math.sqrt(e.comparable_amount / 3e11)) : 0.8;
}
const DASH: Record<string, { dashed: boolean; dash: number; gap: number; opacity: number }> = {
  completed: { dashed: false, dash: 1, gap: 0, opacity: 0.85 }, ongoing: { dashed: false, dash: 1, gap: 0, opacity: 0.6 },
  announced: { dashed: true, dash: 0.42, gap: 0.2, opacity: 0.55 }, conditional: { dashed: true, dash: 0.16, gap: 0.16, opacity: 0.5 },
  estimated: { dashed: true, dash: 0.05, gap: 0.13, opacity: 0.5 },
};

function Edges({ entities, edges, shared, selectedId, edgeFilter, reducedMotion, focus }: WorldProps & { shared: React.MutableRefObject<Shared> }) {
  const index = useMemo(() => new Map(entities.map((e, i) => [e.id, i])), [entities]);
  const [ready, setReady] = useState(reducedMotion);
  useEffect(() => { const t = setTimeout(() => setReady(true), reducedMotion ? 0 : 900); return () => clearTimeout(t); }, [reducedMotion]);
  const focusSet = useMemo(() => (focus ? new Set(focus) : null), [focus]);
  const built = useMemo(() => {
    if (!ready) return [];
    const pl = shared.current.placements; const seen = new Map<string, number>();
    return edges.filter((e) => !e.cancelled).map((e) => {
      const ia = index.get(e.source), ib = index.get(e.target);
      if (ia == null || ib == null) return null;
      const a = new THREE.Vector3(pl[ia].x, pl[ia].y, pl[ia].z), b = new THREE.Vector3(pl[ib].x, pl[ib].y, pl[ib].z);
      const key = [e.source, e.target].sort().join("|"); const k = seen.get(key) ?? 0; seen.set(key, k + 1);
      const bow = (k === 0 ? 0.12 : Math.ceil(k / 2) * 0.34 * (k % 2 ? 1 : -1)) * (e.source < e.target ? 1 : -1) + 0.1;
      const curve = edgeCurve(a, b, bow);
      return { e, curve, points: curve.getPoints(14), rb: entities[ib].radius };
    }).filter(Boolean) as { e: GEdge; curve: THREE.QuadraticBezierCurve3; points: THREE.Vector3[]; rb: number }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, edges, entities, index]);
  const visible = (e: GEdge) => edgeFilter.types.has(e.type) && edgeFilter.statuses.has(e.status);
  const emphasised = (e: GEdge) => (selectedId ? e.source === selectedId || e.target === selectedId : focusSet ? focusSet.has(e.source) && focusSet.has(e.target) : true);
  const cones = useRef<THREE.InstancedMesh>(null); const dots = useRef<THREE.InstancedMesh>(null);
  const moving = useMemo(() => built.filter((b) => b.e.status === "completed" || b.e.realized_amount != null), [built]);
  useEffect(() => {
    const m = cones.current; if (!m) return;
    built.forEach((b, i) => {
      const show = visible(b.e); const em = emphasised(b.e);
      const len = b.curve.getLength(); const t = Math.max(0.5, 1 - (b.rb + 0.16) / Math.max(len, 0.001));
      const p = b.curve.getPoint(t); const tan = b.curve.getTangent(t);
      tmpObj.position.copy(p); tmpObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan.normalize());
      tmpObj.scale.setScalar(show ? (em ? 1 : 0.5) : 0.0001); tmpObj.updateMatrix(); m.setMatrixAt(i, tmpObj.matrix);
      tmpColor.set(FAMILY_COLOR[EDGE_FAMILY[b.e.type]]).lerp(BG, em ? 0.1 : 0.8); m.setColorAt(i, tmpColor);
    });
    m.count = built.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, edgeFilter, selectedId, focusSet]);
  useFrame(({ clock }) => {
    const m = dots.current; if (!m) return;
    const time = reducedMotion ? 0.35 : clock.elapsedTime * 0.16;
    moving.forEach((b, i) => {
      const show = visible(b.e) && emphasised(b.e);
      const t = 0.08 + ((time + (i * 0.137) % 1) % 1) * 0.74;
      tmpObj.position.copy(b.curve.getPoint(t)); tmpObj.quaternion.identity(); tmpObj.scale.setScalar(show ? 1 : 0.0001); tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.count = moving.length; m.instanceMatrix.needsUpdate = true;
  });
  if (!ready) return null;
  return (
    <group>
      {built.map((b) => {
        if (!visible(b.e)) return null;
        const d = DASH[b.e.status]; const em = emphasised(b.e);
        return <Line key={b.e.id} points={b.points} color={FAMILY_COLOR[EDGE_FAMILY[b.e.type]]} lineWidth={edgeWidth(b.e) * (em ? 1 : 0.6)}
          dashed={d.dashed} dashSize={d.dash} gapSize={d.gap} transparent opacity={em ? d.opacity : 0.06} depthWrite={false} />;
      })}
      <instancedMesh ref={cones} args={[undefined, undefined, Math.max(1, edges.length)]} frustumCulled={false}>
        <coneGeometry args={[0.07, 0.22, 8]} /><meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={dots} args={[undefined, undefined, Math.max(1, edges.length)]} frustumCulled={false}>
        <sphereGeometry args={[0.055, 8, 8]} /><meshBasicMaterial color="#fff6dc" />
      </instancedMesh>
    </group>
  );
}


/** Projects world positions to the DOM label layer each frame. Labels are ordinary HTML: crisp, selectable and cheap. */
function Projector({ layer, shared, edge }: { layer: React.RefObject<HTMLDivElement | null>; shared: React.MutableRefObject<Shared>; edge: number }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const root = layer.current; if (!root) return;
    const cur = shared.current.cur;
    for (const el of Array.from(root.children) as HTMLElement[]) {
      const ei = el.dataset.ei;
      if (ei != null) { const i = Number(ei) * 3; v.set(cur[i], cur[i + 1] + Number(el.dataset.dy ?? 0), cur[i + 2]); }
      else { const [x, y, z] = el.dataset.wp!.split(",").map(Number); v.set(x, y, z); }
      v.project(camera);
      const vis = v.z < 1 && Math.abs(v.x) < edge && Math.abs(v.y) < edge;
      el.style.visibility = vis ? "visible" : "hidden";
      if (vis) el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    }
  });
  return null;
}

export default function World(props: WorldProps) {
  const { entities, view, opts, selectedId, labels, mobile } = props;
  const placements = useMemo(() => computeLayout(view, entities, opts), [view, entities, opts]);
  const shared = useRef<Shared>({ cur: new Float32Array(entities.length * 3), alpha: new Float32Array(entities.length), placements });
  const first = useRef(true);
  if (first.current) { // start at the first layout so that nothing flies in from the origin
    placements.forEach((p, i) => { shared.current.cur.set([p.x, p.y, p.z], i * 3); shared.current.alpha[i] = p.alpha; });
    first.current = false;
  }
  shared.current.placements = placements;
  const [hover, setHover] = useState<number | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const index = useMemo(() => new Map(entities.map((e, i) => [e.id, i])), [entities]);
  const guides = useMemo(() => guideSpec(view, opts, mobile, props.marketReturn, props.fit), [view, opts, mobile, props.marketReturn, props.fit]);
  const labelIdx = [...new Set([...labels, ...(selectedId ? [selectedId] : [])])].map((id) => index.get(id)).filter((i): i is number => i != null && placements[i].alpha > 0.2).slice(0, mobile ? 6 : 14);
  const hv = hover != null ? entities[hover] : null; const hp = hover != null ? placements[hover] : null;
  return (
    <div className="world">
      <Canvas dpr={[1, mobile ? 1.5 : 2]} camera={{ position: CAMERA.field.position, fov: 42, near: 0.1, far: 200 }} frameloop={props.paused ? "never" : "always"}
        gl={{ antialias: true, powerPreference: "high-performance" }} onPointerMissed={() => props.onSelect(null)}
        aria-hidden="true" style={{ touchAction: props.interactive && !mobile ? "none" : "pan-y" }}>
        <color attach="background" args={["#0b0c0e"]} />
        <ambientLight intensity={0.9} /><directionalLight position={[6, 12, 8]} intensity={1.6} /><directionalLight position={[-8, -4, -6]} intensity={0.35} />
        <Rig preset={props.camera} interactive={props.interactive} reducedMotion={props.reducedMotion} mobile={mobile} />
        {guides.lines.map((l, i) => <Line key={`${view}-${i}`} points={l.points} color={l.color} lineWidth={l.width ?? 1} dashed={!!l.dash} dashSize={l.dash?.[0]} gapSize={l.dash?.[1]} transparent opacity={l.opacity ?? 1} />)}
        {guides.plane && <mesh position={guides.plane.position} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={guides.plane.size} /><meshBasicMaterial color="#ece7dc" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
        <Marks {...props} shared={shared} onHover={setHover} />
        {view === "network" && <Edges key={view} {...props} shared={shared} />}
        <Projector layer={layer} shared={shared} edge={mobile ? 0.97 : 1.15} />
      </Canvas>
      <div className={`label-layer ${props.quiet ? "quiet" : ""}`} ref={layer} aria-hidden="true">
        {guides.ticks.map((t, i) => <span key={`${view}-t${i}`} data-wp={t.p.join(",")} className={`axis-label ${t.cls ?? ""}`} style={t.color ? { color: t.color } : undefined}>{t.swatch && <i style={{ background: t.swatch }} />}{t.text}</span>)}
        {labelIdx.map((i) => <span key={entities[i].id} data-ei={i} data-dy={entities[i].radius + 0.34} className={`mark-label ${entities[i].id === selectedId ? "sel" : ""}`}>{entities[i].company?.ticker ?? entities[i].name.split(" (")[0]}</span>)}
        {hv && hp && hover != null && (
          <div className="tooltip" data-ei={hover} data-dy={-(hv.radius + 0.75)}>
            <b>{hv.name}</b>{hv.company && <span> · {hv.company.ticker}</span>}<br />
            <span>{ROLE_LABEL[hv.role]}{!hv.inUniverse ? " · not in the listed universe" : ""}</span><br />
            {view === "repricing" && hp.value != null && <span>{opts.absolute ? `${usd(hp.value)} market value since 6 Oct (approx.)` : `${pct(hp.value)} since ${hv.company && hv.company.first_trade_in_data > "2026-10-06" ? "its first close (listed after 6 Oct)" : "6 Oct"}`} · {props.dateLabel}<br />Source: adjusted closing prices</span>}
            {(view === "landscape" || view === "verdict") && hp.value != null && <span>{pct(hp.value)} in window{hv.ev?.beta != null ? ` · beta ${hv.ev.beta.toFixed(2)}` : ""}</span>}
            {(view === "network" || view === "layers") && <span>{hv.degree} documented counterparties</span>}
            {hp.parked && (view === "repricing" || view === "landscape" || view === "verdict") && <span>No value for this view</span>}
          </div>
        )}
      </div>
    </div>
  );
}
export { AXES, BAND_ROLES };
