import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/** All textures are generated in code (no external assets), seeded so renders are stable. */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, opts: { color?: boolean; repeat?: [number, number] } = {}) {
  const texture = new CanvasTexture(canvas);
  if (opts.color !== false) texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  if (opts.repeat) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return texture;
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp((n >> 16) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `rgb(${r},${g},${b})`;
}

/** Oak plank floor with staggered joints. Planks run along world x; the texture covers the whole floor once. */
export function floorTextures(width: number, depth: number): { map: Texture; bump: Texture } {
  const pxPerM = 230;
  const w = Math.round(width * pxPerM);
  const h = Math.round(depth * pxPerM);
  const { canvas, ctx } = makeCanvas(w, h);
  const { canvas: bumpCanvas, ctx: bctx } = makeCanvas(w, h);
  const rand = rng(11);
  const plankW = 0.3;
  const rows = Math.round(depth / plankW);
  const rowH = h / rows;
  const tones = ["#c8a074", "#d1aa7f", "#bf9868", "#cba37a", "#c39b6d", "#d4af86"];

  bctx.fillStyle = "#c8c8c8";
  bctx.fillRect(0, 0, w, h);

  for (let row = 0; row < rows; row++) {
    const y = row * rowH;
    let x = -rand() * pxPerM * 1.6;
    while (x < w) {
      const len = pxPerM * (1.3 + rand() * 1.1);
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
      ctx.fillRect(x, y, len, rowH);

      for (let i = 0; i < 18; i++) {
        const gy = y + rand() * rowH;
        ctx.strokeStyle = `rgba(${90 + rand() * 40},${55 + rand() * 25},30,${0.05 + rand() * 0.1})`;
        ctx.lineWidth = 0.6 + rand() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        const wave = (rand() - 0.5) * 5;
        ctx.bezierCurveTo(x + len * 0.3, gy + wave, x + len * 0.6, gy - wave, x + len, gy + wave * 0.4);
        ctx.stroke();
      }
      if (rand() > 0.82) {
        ctx.fillStyle = "rgba(95,58,30,.28)";
        ctx.beginPath();
        ctx.ellipse(x + len * (0.2 + rand() * 0.6), y + rowH / 2, 6 + rand() * 4, 2.5 + rand() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(70,42,22,.55)";
      ctx.fillRect(x, y, 2, rowH);
      bctx.fillStyle = "#222";
      bctx.fillRect(x, y, 3, rowH);
      x += len;
    }
    ctx.fillStyle = "rgba(70,42,22,.6)";
    ctx.fillRect(0, y, w, 2.5);
    ctx.fillStyle = "rgba(255,235,200,.16)";
    ctx.fillRect(0, y + 2.5, w, 1.5);
    bctx.fillStyle = "#1c1c1c";
    bctx.fillRect(0, y, w, 3);
  }

  return { map: toTexture(canvas), bump: toTexture(bumpCanvas, { color: false }) };
}

/** Height-map canvas to tangent-space normal map (Sobel). Gives wood grain and weave real relief under light. */
function normalFromCanvas(source: HTMLCanvasElement, strength: number, opts: { repeat?: [number, number] } = {}) {
  const { width, height } = source;
  const src = source.getContext("2d")!.getImageData(0, 0, width, height).data;
  const { canvas, ctx } = makeCanvas(width, height);
  const out = ctx.createImageData(width, height);
  const lum = (x: number, y: number) => {
    const i = (((y + height) % height) * width + ((x + width) % width)) * 4;
    return (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1) - (lum(x - 1, y - 1) + 2 * lum(x - 1, y) + lum(x - 1, y + 1));
      const dy = lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1) - (lum(x - 1, y - 1) + 2 * lum(x, y - 1) + lum(x + 1, y - 1));
      const nx = -dx * strength;
      const ny = -dy * strength;
      const inv = 1 / Math.hypot(nx, ny, 1);
      const i = (y * width + x) * 4;
      out.data[i] = (nx * inv * 0.5 + 0.5) * 255;
      out.data[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      out.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return toTexture(canvas, { color: false, repeat: opts.repeat });
}

/** Furniture wood: base tone + long grain streaks, with a matching normal map. */
export function woodTextures(base: string, seed: number, repeat: [number, number] = [1, 1]) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const { canvas: heightCanvas, ctx: hctx } = makeCanvas(512, 512);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  hctx.fillStyle = "#808080";
  hctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 110; i++) {
    const y = rand() * 512;
    const dark = rand() > 0.45;
    const lw = 0.6 + rand() * 2.2;
    const w = (rand() - 0.5) * 14;
    ctx.strokeStyle = dark ? `rgba(60,34,16,${0.05 + rand() * 0.12})` : `rgba(255,225,180,${0.04 + rand() * 0.08})`;
    ctx.lineWidth = lw;
    hctx.strokeStyle = dark ? "rgba(30,30,30,.55)" : "rgba(200,200,200,.35)";
    hctx.lineWidth = lw;
    for (const c of [ctx, hctx]) {
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(170, y + w, 340, y - w, 512, y + w * 0.3);
      c.stroke();
    }
  }
  return { map: toTexture(canvas, { repeat }), normal: normalFromCanvas(heightCanvas, 1.6, { repeat }) };
}

/** Woven fabric colour + bump pair. */
export function fabricTextures(base: string, seed: number, repeat: [number, number] = [6, 6]) {
  const { canvas, ctx } = makeCanvas(256, 256);
  const { canvas: bumpCanvas, ctx: bctx } = makeCanvas(256, 256);
  const rand = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = "#888";
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.05})`;
    ctx.fillRect(i, 0, 1.2, 256);
    ctx.fillStyle = `rgba(255,255,255,${0.04 + rand() * 0.05})`;
    ctx.fillRect(0, i, 256, 1.2);
    bctx.fillStyle = "#555";
    bctx.fillRect(i, 0, 1.4, 256);
    bctx.fillStyle = "#bbb";
    bctx.fillRect(0, i, 256, 1.4);
  }
  return { map: toTexture(canvas, { repeat }), normal: normalFromCanvas(bumpCanvas, 2.2, { repeat }) };
}

/** Fine plaster relief for the walls (normal map). */
export function plasterNormal() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const rand = rng(5);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const v = 110 + rand() * 40;
    ctx.fillStyle = `rgba(${v},${v},${v},.35)`;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, 1 + rand() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  return normalFromCanvas(canvas, 1.4, { repeat: [6, 6] });
}

/** Woven rug: sage field, cream border, speckled yarn. */
export function rugTexture() {
  const w = 768;
  const h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = rng(23);
  ctx.fillStyle = "#e6dbc2";
  ctx.fillRect(0, 0, w, h);
  const yarn = ["#e9dfc8", "#d9ccaf", "#c8b994", "#f2eada"];
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = yarn[Math.floor(rand() * yarn.length)];
    ctx.fillRect(rand() * w, rand() * h, 3 + rand() * 4, 2);
  }
  const m = 70;
  ctx.fillStyle = "#7f9479";
  ctx.fillRect(m, m, w - m * 2, h - m * 2);
  const greens = ["#7f9479", "#6d866c", "#92a68a", "#587457", "#a4b59b"];
  for (let i = 0; i < 16000; i++) {
    ctx.fillStyle = greens[Math.floor(rand() * greens.length)];
    ctx.fillRect(m + rand() * (w - m * 2), m + rand() * (h - m * 2), 3 + rand() * 4, 2);
  }
  ctx.strokeStyle = "rgba(244,236,214,.85)";
  ctx.lineWidth = 6;
  ctx.strokeRect(m + 26, m + 26, w - (m + 26) * 2, h - (m + 26) * 2);
  return toTexture(canvas);
}

/** Cream/tan/sage plaid for the throw blanket. */
export function plaidTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = "#e7dcc3";
  ctx.fillRect(0, 0, 256, 256);
  const stripes: [number, string, number][] = [
    [30, "rgba(150,120,80,.55)", 22],
    [120, "rgba(110,135,105,.5)", 14],
    [200, "rgba(150,120,80,.45)", 10],
  ];
  for (const [pos, color, width] of stripes) {
    ctx.fillStyle = color;
    ctx.fillRect(pos, 0, width, 256);
    ctx.fillRect(0, pos, 256, width);
  }
  return toTexture(canvas, { repeat: [2, 2] });
}

const ART_PALETTES = [
  { sky: ["#f6c58a", "#e9906a", "#7c6f9c"], hills: ["#6d6f8f", "#4c5a6e", "#33434f"], sun: "#fff0c0" },
  { sky: ["#bfe0ef", "#e3f0ee", "#f7efdc"], hills: ["#7ea6a0", "#4f7f7a", "#2f5a55"], sun: "#fffbe8" },
  { sky: ["#f4d6d0", "#f8e8e0", "#fbf1e6"], hills: ["#cba0a5", "#8fa07f", "#58754f"], sun: "#fff6ee" },
  { sky: ["#1f2f4f", "#3b4a6b", "#d58a4d"], hills: ["#2b3550", "#1d2538", "#121827"], sun: "#ffd27a" },
  { sky: ["#9fc8e8", "#cfe3ee", "#f1ecd9"], hills: ["#8ba878", "#5f8660", "#3d6446"], sun: "#fff7da" },
  { sky: ["#f2b98a", "#f7d9a7", "#fbeed0"], hills: ["#b08a6a", "#7c6a4f", "#4a4a3b"], sun: "#fff3c7" },
] as const;

const artCache = new Map<number, Texture>();

/** Procedural landscape used by decorative frames (no memory attached). */
export function artTexture(variant: number) {
  const key = variant % ART_PALETTES.length;
  const cached = artCache.get(key);
  if (cached) return cached;

  const p = ART_PALETTES[key];
  const w = 512;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = rng(90 + key * 7);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, p.sky[0]);
  sky.addColorStop(0.55, p.sky[1]);
  sky.addColorStop(1, p.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunX = w * (0.25 + rand() * 0.5);
  const glow = ctx.createRadialGradient(sunX, h * 0.38, 4, sunX, h * 0.38, 130);
  glow.addColorStop(0, p.sun);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  p.hills.forEach((color, layer) => {
    const base = h * (0.5 + layer * 0.14);
    const amp = 46 - layer * 10;
    const phase = rand() * 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, base + Math.sin(x / (70 + layer * 18) + phase) * amp + Math.sin(x / 23 + phase * 2) * 7);
    }
    ctx.lineTo(w, h);
    ctx.fill();
  });

  for (let i = 0; i < 16; i++) {
    const x = rand() * w;
    const y = h * (0.78 + rand() * 0.2);
    const r = 14 + rand() * 18;
    ctx.fillStyle = key === 2 ? `rgba(245,${190 + rand() * 40},${200 + rand() * 30},.9)` : shade(p.hills[2], rand() * 30 - 10);
    ctx.beginPath();
    ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60,40,28,.85)";
    ctx.fillRect(x - 2, y - r * 0.4, 4, r * 1.1);
  }

  const texture = toTexture(canvas);
  artCache.set(key, texture);
  return texture;
}

/** Cloth diary cover with a small leaf emblem. */
export function diaryCoverTexture(color: string, dark: boolean) {
  const { canvas, ctx } = makeCanvas(256, 340);
  const rand = rng(31);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 340);
  for (let i = 0; i < 340; i += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.04})`;
    ctx.fillRect(0, i, 256, 1);
  }
  ctx.strokeStyle = dark ? "rgba(240,230,205,.8)" : "rgba(95,122,98,.85)";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(128, 214);
  ctx.lineTo(128, 150);
  ctx.stroke();
  for (const [dx, dy, rot] of [[-16, -6, -0.6], [16, -6, 0.6], [0, -34, 0]] as const) {
    ctx.save();
    ctx.translate(128 + dx, 178 + dy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return toTexture(canvas);
}

/** Small cream tent card with a title and a sub line, used on shelves. */
export function labelTexture(title: string, sub: string) {
  const { canvas, ctx } = makeCanvas(384, 192);
  ctx.fillStyle = "#f4ecd9";
  ctx.fillRect(0, 0, 384, 192);
  ctx.strokeStyle = "rgba(120,90,60,.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 368, 176);
  ctx.fillStyle = "#4d4132";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
  ctx.font = "italic 38px Georgia, serif";
  ctx.fillText(clip(title, 18), 192, 78);
  ctx.fillStyle = "#7b6a55";
  ctx.font = "30px Georgia, serif";
  ctx.fillText(clip(sub, 22), 192, 130);
  return toTexture(canvas);
}

/** Leaf blade colour map: gradient, midrib and side veins. UVs: u across, v base to tip. */
export function leafTexture() {
  const w = 128;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, "#e8f0e0");
  g.addColorStop(0.5, "#f3f7ee");
  g.addColorStop(1, "#dfeadb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(80,110,70,.35)";
  ctx.lineWidth = 1.4;
  for (let y = 24; y < h - 10; y += 22) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y + 8);
      ctx.quadraticCurveTo(w / 2 + side * 22, y - 2, w / 2 + side * 54, y - 24);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, 6);
  ctx.stroke();
  return toTexture(canvas);
}
