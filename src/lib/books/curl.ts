/**
 * Geometry of a turning page, the way a real sheet folds when you pull its corner.
 *
 * Coordinates: origin at the spine's top, x to the right, y down. The right page covers x ∈ [0, W], the left page
 * x ∈ [-W, 0], both y ∈ [0, H]. A sheet is hinged at the spine; the person holds a corner `c` and pulls it to `p`.
 * The fold line is the perpendicular bisector of c→p: the part of the sheet on c's side is folded over onto p's side
 * (its mirror image), the rest stays flat. Pure maths, no DOM, so it is unit-tested.
 */
export type Pt = { x: number; y: number };
export type TurnDirection = "next" | "prev";

export type CurlGeometry = {
  /** True when the sheet is (almost) flat: nothing is folded. */
  flat: boolean;
  /** The pulled corner after limiting it to what a real sheet can reach. */
  p: Pt;
  /** The part of the sheet still lying flat, and the folded part where it ends up (spread coordinates). */
  flat_polygon: Pt[];
  flap_polygon: Pt[];
  /** CSS matrix(a, b, c, d, e, f) placing the sheet's back face (a W×H box, origin top-left) on the flap; `e` is in spread x. */
  matrix: [number, number, number, number, number, number];
  /** Unit normal of the fold line (points from the corner towards p) and a point on the fold line. */
  normal: Pt;
  mid: Pt;
  /** 0 when the sheet lies flat on its own side, 1 when it has landed on the other side. */
  progress: number;
};

export function corner(direction: TurnDirection, W: number, cornerY: number): Pt {
  return { x: direction === "next" ? W : -W, y: cornerY };
}

/** Keeps the pulled corner where a sheet of width W hinged at the spine could really put it. */
export function limitPull(p: Pt, direction: TurnDirection, W: number, cornerY: number, H: number): Pt {
  let { x, y } = p;
  // never past the corner's own side: you cannot pull a page outwards
  x = direction === "next" ? Math.min(x, W) : Math.max(x, -W);
  // The sheet is bound to the spine and cannot stretch: the pulled corner must stay no further from any spine point than
  // the corner started. That distance difference is linear along the spine, so the two spine ends are the only limits.
  // Without both, pulling a corner far up or down would tear the spine edge off.
  const c = corner(direction, W, cornerY);
  const limits = [
    { cy: 0, r: Math.hypot(c.x, c.y - 0) },
    { cy: H, r: Math.hypot(c.x, c.y - H) },
  ];
  for (let pass = 0; pass < 12; pass += 1) {
    for (const { cy, r } of limits) {
      const dx = x;
      const dy = y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance > r) {
        x = (dx * r) / distance;
        y = cy + (dy * r) / distance;
      }
    }
  }
  return { x, y };
}

/** Sutherland–Hodgman against one half-plane: keeps the points with sign·((q − m)·n) ≥ 0. */
export function clipHalfPlane(polygon: Pt[], n: Pt, m: Pt, sign: 1 | -1): Pt[] {
  const side = (q: Pt) => sign * ((q.x - m.x) * n.x + (q.y - m.y) * n.y);
  const out: Pt[] = [];
  polygon.forEach((current, index) => {
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const a = side(previous);
    const b = side(current);
    if ((a >= 0) !== (b >= 0)) {
      const t = a / (a - b);
      out.push({ x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t });
    }
    if (b >= 0) out.push(current);
  });
  return out;
}

export function pageRect(direction: TurnDirection, W: number, H: number): Pt[] {
  const left = direction === "next" ? 0 : -W;
  return [{ x: left, y: 0 }, { x: left + W, y: 0 }, { x: left + W, y: H }, { x: left, y: H }];
}

export function curl(rawPull: Pt, direction: TurnDirection, W: number, H: number, cornerY: number): CurlGeometry {
  const c = corner(direction, W, cornerY);
  const p = limitPull(rawPull, direction, W, cornerY, H);
  const vx = p.x - c.x;
  const vy = p.y - c.y;
  const length = Math.hypot(vx, vy);
  const rect = pageRect(direction, W, H);
  const progress = Math.max(0, Math.min(1, direction === "next" ? (W - p.x) / (2 * W) : (p.x + W) / (2 * W)));
  if (length < 0.5) return { flat: true, p, flat_polygon: rect, flap_polygon: [], matrix: [1, 0, 0, 1, 0, 0], normal: { x: 0, y: 0 }, mid: c, progress };

  const n = { x: vx / length, y: vy / length };
  const m = { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 };
  const reflect = (q: Pt): Pt => {
    const k = 2 * ((q.x - m.x) * n.x + (q.y - m.y) * n.y);
    return { x: q.x - k * n.x, y: q.y - k * n.y };
  };

  // A = I − 2nnᵀ. The back face of the sheet maps (u, v) → sheet point (ox − u, v) → reflected.
  const a00 = 1 - 2 * n.x * n.x;
  const a01 = -2 * n.x * n.y;
  const a11 = 1 - 2 * n.y * n.y;
  const ox = direction === "next" ? W : 0;
  const t = { x: 2 * (m.x * n.x + m.y * n.y) * n.x, y: 2 * (m.x * n.x + m.y * n.y) * n.y };
  const matrix: CurlGeometry["matrix"] = [-a00, -a01, a01, a11, a00 * ox + t.x, a01 * ox + t.y];

  return {
    flat: false,
    p,
    flat_polygon: clipHalfPlane(rect, n, m, 1),
    flap_polygon: clipHalfPlane(rect, n, m, -1).map(reflect),
    matrix,
    normal: n,
    mid: m,
    progress,
  };
}

/** The path of the pulled corner for a turn started by a button or key: lifts from the corner, sweeps across, lands. */
export function autoPull(t: number, direction: TurnDirection, W: number, H: number, cornerY: number): Pt {
  const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const c = corner(direction, W, cornerY);
  const sign = direction === "next" ? -1 : 1;
  const lift = (cornerY === 0 ? 1 : -1) * H * 0.14 * Math.sin(Math.PI * eased);
  return { x: c.x + sign * 2 * W * eased, y: c.y + lift };
}
