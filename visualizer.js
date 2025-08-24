// Ultra Visualizer: multi-scene stack, camera, post FX, analysis-driven triggers.
// 2D canvas implementation optimized for GitHub Pages (no build, no heavy deps).

export const THEMES = {
  album: null,
  neon: ["#00ffd5", "#a259ff", "#ffec19", "#ff3366"],
  midnight: ["#0f1020", "#2b2d42", "#8d99ae", "#edf2f4"],
  sunset: ["#ff7e5f", "#feb47b", "#ffd166", "#ef476f"],
  ocean: ["#0a9396", "#94d2bd", "#e9d8a6", "#ee9b00"],
  vaporwave: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff"],
  cyber: ["#00e1ff", "#ff00e1", "#00ff9f", "#ffe600"],
  candy: ["#ff9aa2", "#ffb7b2", "#ffdac1", "#e2f0cb"],
  noir: ["#0f0f12", "#2b2b30", "#c9c9d1", "#ffffff"],
  mono: null,
};

// ----- Utils -----
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
function rgba(hex, a = 1) {
  if (!hex) return `rgba(255,255,255,${a})`;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Simplex-ish noise (value noise + smoothing)
function makeNoise(seed = Math.random() * 1e9) {
  const perm = new Uint32Array(512);
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 256; i++) perm[i] = perm[i + 256] = (rnd() * 256) | 0;
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(hash, x, y) { const h = hash & 3; return (h < 2 ? x : y) * (h & 1 ? -1 : 1); }
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = perm[X + perm[Y]];
    const ab = perm[X + perm[Y + 1]];
    const ba = perm[X + 1 + perm[Y]];
    const bb = perm[X + 1 + perm[Y + 1]];
    const n0 = grad(aa, x, y);
    const n1 = grad(ba, x - 1, y);
    const n2 = grad(ab, x, y - 1);
    const n3 = grad(bb, x - 1, y - 1);
    const nx0 = lerp(n0, n1, u);
    const nx1 = lerp(n2, n3, u);
    return lerp(nx0, nx1, v); // [-1,1]
  }
  return { noise2 };
}

// ----- Base scene -----
class Scene {
  init(viz) { this.viz = viz; this.seedNoise = makeNoise(); }
  resize() {}
  setOption() {}
  setAlbumImage() {}
  onBeat() {}
  onBar() {}
  onSection() {}
  update(/*dt, driver*/) {}
  render(/*ctx, w, h, driver*/) {}
}

// ----- Scenes -----
// Flow field aurora
class FlowFieldScene extends Scene {
  constructor() {
    super();
    this.n = 320; this.size = 1.4;
    this.p = [];
    this.noiseScale = 0.0016;
    this.noiseSpeed = 0.08;
  }
  setOption(k, v) {
    if (k === "count") this.n = Math.max(60, Math.floor(v));
    if (k === "size") this.size = v;
    if (k === "complexity") this.n = Math.floor(240 * v);
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this._ensure();
  }
  _ensure() {
    while (this.p.length < this.n) {
      this.p.push({ x: rand(0, this.w), y: rand(0, this.h), vx: 0, vy: 0, life: Math.random() });
    }
    if (this.p.length > this.n) this.p.length = this.n;
  }
  onBeat(d) {
    // small burst
    for (let i = 0; i < 16; i++) {
      const idx = (Math.random() * this.p.length) | 0;
      const pt = this.p[idx];
      pt.vx += rand(-2, 2); pt.vy += rand(-2, 2);
    }
  }
  update(dt, d) {
    const N = this.seedNoise;
    const s = this.noiseScale;
    const t = d.time * this.noiseSpeed;
    for (const pt of this.p) {
      const n = N.noise2((pt.x + t * 400) * s, (pt.y - t * 380) * s); // [-1,1]
      const a = n * Math.PI * 2;
      const sp = 20 + 140 * d.energy + d.pulse * 160;
      pt.vx = Math.cos(a) * sp * dt;
      pt.vy = Math.sin(a) * sp * dt;
      pt.x += pt.vx; pt.y += pt.vy;
      pt.life += dt * 0.8;
      if (pt.x < -50) pt.x = this.w + 50;
      if (pt.x > this.w + 50) pt.x = -50;
      if (pt.y < -50) pt.y = this.h + 50;
      if (pt.y > this.h + 50) pt.y = -50;
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.p.length; i++) {
      const pt = this.p[i];
      const col = palette[i % palette.length] || "#ffffff";
      const alpha = 0.06 + 0.2 * Math.abs(Math.sin(pt.life)) + d.pulse * 0.06;
      ctx.strokeStyle = rgba(col, alpha);
      ctx.lineWidth = this.size + Math.abs(Math.sin(pt.life * 2)) * 1.5;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x - pt.vx * 0.15, pt.y - pt.vy * 0.15);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// Kaleidoscope mirrors
class KaleidoScene extends Scene {
  constructor() {
    super();
    this.segments = 8;
    this.speed = 0.15;
    this._tex = null;
    this._off = document.createElement("canvas");
    this._offCtx = this._off.getContext("2d");
  }
  setAlbumImage(img) { this._tex = img || null; }
  setOption(k, v) {
    if (k === "segments") this.segments = Math.max(2, Math.floor(v));
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this._off.width = Math.floor(w / 2);
    this._off.height = Math.floor(h / 2);
  }
  onBar() {
    // flip segments occasionally
    if (Math.random() < 0.4) this.segments = [6, 8, 10, 12][(Math.random() * 4) | 0];
  }
  render(ctx, w, h, d) {
    if (!this._tex) return;
    const seg = this.segments;
    const angle = (Math.PI * 2) / seg;
    const r = Math.hypot(w, h) * 0.6;
    const rot = d.rotation * this.speed;

    const off = this._off, octx = this._offCtx;
    octx.clearRect(0, 0, off.width, off.height);
    // draw album texture scaled
    const scale = 0.8 + Math.sin(d.time * 0.2) * 0.05 + d.pulse * 0.02;
    const tw = off.width * scale, th = off.height * scale;
    octx.save();
    octx.translate(off.width / 2, off.height / 2);
    octx.rotate(rot);
    octx.drawImage(this._tex, -tw / 2, -th / 2, tw, th);
    octx.restore();

    ctx.save();
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < seg; i++) {
      ctx.save();
      ctx.rotate(i * angle);
      if (i % 2 === 1) ctx.scale(1, -1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.arc(0, 0, r, 0, angle, false);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(off, -r, -r, r, r, 0, 0, r, r);
      ctx.restore();
    }
    ctx.restore();
  }
}

// Tunnel + starfield
class TunnelScene extends Scene {
  constructor() {
    super();
    this.density = 50;
    this.twist = 0.8;
    this.stars = [];
  }
  setOption(k, v) {
    if (k === "density") this.density = Math.max(10, Math.floor(v));
    if (k === "twist") this.twist = v;
    if (k === "complexity") this.density = Math.floor(30 * v + 30);
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this.stars = Array.from({ length: 200 }, () => ({
      x: rand(-w, w), y: rand(-h, h), z: Math.random()
    }));
  }
  update(dt, d) {
    for (const s of this.stars) {
      s.z -= dt * (0.2 + d.energy);
      if (s.z <= 0) { s.x = rand(-this.w, this.w); s.y = rand(-this.h, this.h); s.z = 1; }
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Starfield
    ctx.fillStyle = rgba(palette[2] || "#fff", 0.7);
    for (const s of this.stars) {
      const sx = s.x / s.z * 0.5, sy = s.y / s.z * 0.5;
      const r = (1 - s.z) * 2 + 0.5;
      ctx.globalAlpha = 0.3 + (1 - s.z) * 0.7;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Spiral beams
    const maxR = Math.hypot(w, h) * 0.6;
    for (let i = 0; i < this.density; i++) {
      const t = i / this.density;
      const r = maxR * t;
      const a = d.rotation * (0.5 + this.twist) + t * Math.PI * 8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const col = palette[i % palette.length] || "#fff";
      const alpha = 0.12 + (1 - t) * 0.5;
      ctx.strokeStyle = rgba(col, alpha);
      ctx.lineWidth = 2 + (1 - t) * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x * 0.85, y * 0.85);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Voronoi-like ripples
class RippleScene extends Scene {
  constructor() {
    super();
    this.centers = [];
  }
  onBeat(d) {
    const w = this.viz.w, h = this.viz.h;
    this.centers.push({ x: rand(0, w), y: rand(0, h), t0: d.time });
    if (this.centers.length > 12) this.centers.shift();
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    for (let i = 0; i < this.centers.length; i++) {
      const c = this.centers[i];
      const age = d.time - c.t0;
      const r = age * 240 * (0.6 + this.viz.energy) + d.pulse * 20;
      const a = Math.max(0, 0.35 - age * 0.16);
      if (a <= 0) continue;
      ctx.strokeStyle = rgba(palette[i % palette.length] || "#fff", a);
      ctx.lineWidth = 2 + Math.sin(age * 2) * 1.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();
    }

    // crackle grid threshold
    const step = 40;
    ctx.globalAlpha = 0.08 + d.pulse * 0.05;
    ctx.strokeStyle = rgba(palette[0] || "#fff", 0.15);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (((x * 13 + y * 7 + (d.time * 1000 | 0)) % 97) < 6) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + step, y + step); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Waveform ribbons (Bezier trails)
class RibbonsScene extends Scene {
  constructor() {
    super();
    this.lines = [];
    this.n = 6;
  }
  setOption(k, v) {
    if (k === "complexity") this.n = Math.max(2, Math.floor(4 + v * 4));
  }
  resize(w, h) {
    this.w = w; this.h = h;
    this.lines = Array.from({ length: this.n }, () => ({
      p: Array.from({ length: 4 }, () => ({ x: rand(0, w), y: rand(0, h) })), t: Math.random() * 100
    }));
  }
  update(dt, d) {
    const N = this.seedNoise;
    const s = 0.0012, t = d.time * 0.5;
    for (const l of this.lines) {
      for (let i = 0; i < l.p.length; i++) {
        const p = l.p[i];
        const n = N.noise2((p.x + i * 111 + t * 100) * s, (p.y - t * 120) * s);
        p.x = (p.x + Math.cos(n * Math.PI * 2) * (8 + i * 2)) % (this.w + 40);
        p.y = (p.y + Math.sin(n * Math.PI * 2) * (8 + i * 2)) % (this.h + 40);
        if (p.x < -20) p.x = this.w + 20;
        if (p.y < -20) p.y = this.h + 20;
      }
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      const col = palette[i % palette.length] || "#fff";
      ctx.strokeStyle = rgba(col, 0.15 + 0.2 * Math.abs(Math.sin(d.time + i)) + d.pulse * 0.1);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const [p0, p1, p2, p3] = l.p;
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

// Floating covers with DOF + tilt
class CoversScene extends Scene {
  constructor() { super(); this.n = 16; this.maxSize = 160; this.sprites = []; this.tex = null; this.tilt = { x: 0, y: 0 }; }
  setOption(k, v) { if (k === "count") this.n = Math.max(1, Math.floor(v)); if (k === "size") this.maxSize = v; if (k === "complexity") this.n = Math.floor(8 + v * 12); }
  setAlbumImage(img) { this.tex = img || null; for (const s of this.sprites) s.rot = rand(-Math.PI, Math.PI); }
  resize(w, h) { this.w = w; this.h = h; this._ensure(); }
  attachTilt() {
    if (this._tiltBound) return;
    this._tiltBound = true;
    window.addEventListener("mousemove", e => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      this.tilt.x = clamp((e.clientY - cy) / cy, -1, 1);
      this.tilt.y = clamp((e.clientX - cx) / cx, -1, 1);
    }, { passive: true });
    window.addEventListener("deviceorientation", e => {
      if (e.beta == null || e.gamma == null) return;
      this.tilt.x = clamp(e.beta / 30, -1, 1);
      this.tilt.y = clamp(e.gamma / 30, -1, 1);
    }, { passive: true });
  }
  _ensure() {
    while (this.sprites.length < this.n) {
      this.sprites.push({ x: rand(0, this.w), y: rand(0, this.h), z: rand(0.2, 1.2), rot: rand(-Math.PI, Math.PI), vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25), vr: rand(-0.3, 0.3) });
    }
    if (this.sprites.length > this.n) this.sprites.length = this.n;
  }
  update(dt, d) {
    this.attachTilt();
    for (const s of this.sprites) {
      const speed = 40 + 200 * d.energy + d.pulse * 140;
      s.x += (s.vx + this.tilt.y * 0.2) * speed * dt;
      s.y += (s.vy + this.tilt.x * 0.2) * speed * dt;
      s.rot += s.vr * dt * (0.2 + d.energy);
      if (s.x < -220) s.x = this.w + 220; if (s.x > this.w + 220) s.x = -220;
      if (s.y < -220) s.y = this.h + 220; if (s.y > this.h + 220) s.y = -220;
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    const arr = [...this.sprites].sort((a, b) => a.z - b.z);
    for (const s of arr) {
      const size = (this.maxSize * (0.3 + s.z)) * (0.85 + d.pulse * 0.15);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot + d.rotation * 0.04);
      // depth of field approximate
      const blur = clamp((s.z - 0.6) * 6, 0, 6) * (this.viz.fx.dof ? 1 : 0);
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      ctx.globalAlpha = 0.7 + 0.3 * (s.z);
      if (this.tex) ctx.drawImage(this.tex, -size / 2, -size / 2, size, size);
      else { ctx.fillStyle = rgba(palette[0] || "#fff", 0.8); ctx.fillRect(-size / 2, -size / 2, size, size); }
      // soft border glow
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(palette[1] || "#fff", 0.25);
      ctx.lineWidth = clamp(size * 0.02, 1, 6);
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }
}

// Classic rings (for stack base)
class RingsScene extends Scene {
  constructor() { super(); this.rings = 4; this.bars = 64; }
  setOption(k, v) { if (k === "rings") this.rings = Math.max(1, Math.floor(v)); if (k === "bars") this.bars = Math.max(8, Math.floor(v)); }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(d.rotation * 0.2);
    for (let r = 0; r < this.rings; r++) {
      const radius = 80 + r * 60 + d.pulse * 8 * (r + 1);
      for (let i = 0; i < this.bars; i++) {
        const a = (i / this.bars) * Math.PI * 2 + d.rotation * (0.1 + r * 0.05);
        const x = Math.cos(a) * radius; const y = Math.sin(a) * radius;
        const col = palette[(i + r) % palette.length] || "#ffffff";
        const len = 12 + Math.sin(a * 2 + d.time * (1.5 + r * 0.4)) * 8 + d.pulse * 22 * (0.6 + d.energy);
        const wBar = 3 + (r === 0 ? 1 : 0);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = rgba(col, 0.9);
        ctx.fillRect(-wBar / 2, -len / 2, wBar, len);
        ctx.restore();
      }
    }
    // center bloom
    const bloom = ctx.createRadialGradient(0, 0, 4, 0, 0, 70 + d.pulse * 30);
    bloom.addColorStop(0, rgba(palette[1] || "#ffffff", this.viz.bloomStrength));
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(0, 0, 120 + d.pulse * 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ----- Keyframes -----
class Keyframes {
  constructor() { this.map = new Map(); }
  set(name, frames) { this.map.set(name, frames.slice().sort((a, b) => a.t - b.t)); }
  eval(name, t) {
    const arr = this.map.get(name); if (!arr || arr.length === 0) return null;
    if (t <= arr[0].t) return arr[0].value;
    if (t >= arr[arr.length - 1].t) return arr[arr.length - 1].value;
    let i = 0; while (i < arr.length - 1 && t > arr[i + 1].t) i++;
    const a = arr[i], b = arr[i + 1]; const u = (t - a.t) / (b.t - a.t);
    return typeof a.value === "number" ? lerp(a.value, b.value, u) : (u < 0.5 ? a.value : b.value);
  }
}

// ----- Visualizer engine -----
export class Visualizer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });

    // Core
    this.palette = opts.palette || ["#1db954", "#3ddc97", "#ffffff"];
    this.bg = this.palette[0] || "#0b0b10";
    this.tempo = 120; this.energy = 0.6;
    this.rotation = 0; this.lastTs = 0; this.running = false;

    // Global look
    this.rotationMul = opts.rotationMul ?? 1.0;
    this.pulseMul = opts.pulseMul ?? 1.0;
    this.glowOpacity = opts.glowOpacity ?? 0.25;
    this.trailAlpha = opts.trailAlpha ?? 0.06;
    this.bloomStrength = opts.bloomStrength ?? 0.24;
    this.complexity = opts.complexity ?? 1.0;

    // FX toggles
    this.fx = { vignette: true, grain: true, chroma: false, bloom: true, dof: false };

    // Camera
    this.camera = { mode: "none", shake: 0, gyro: false, x: 0, y: 0, zoom: 1, rot: 0 };

    // DPR & size
    this.maxDpr = Math.max(1, window.devicePixelRatio || 1);
    this.dprCap = opts.dprCap ?? this.maxDpr;
    this.adaptPerf = true; this._fpsClock = 0; this._frames = 0;

    // Album image
    this.albumImage = null;

    // Scenes & layers
    this.layers = [
      { name: "tunnel", scene: new TunnelScene(), enabled: true, opacity: 0.9, blend: "screen" },
      { name: "particles", scene: new FlowFieldScene(), enabled: true, opacity: 1, blend: "lighter" },
      { name: "rings", scene: new RingsScene(), enabled: true, opacity: 0.9, blend: "source-over" },
      { name: "ribbons", scene: new RibbonsScene(), enabled: false, opacity: 0.9, blend: "lighter" },
      { name: "ripples", scene: new RippleScene(), enabled: false, opacity: 0.9, blend: "screen" },
      { name: "kaleido", scene: new KaleidoScene(), enabled: false, opacity: 0.6, blend: "screen" },
      { name: "covers", scene: new CoversScene(), enabled: true, opacity: 0.95, blend: "source-over" },
    ];
    this.layers.forEach(l => l.scene.init(this));

    // Offscreen buffers for each layer
    this.buffers = this.layers.map(() => {
      const c = document.createElement("canvas");
      return { c, ctx: c.getContext("2d") };
    });

    // Keyframes & analysis
    this.keyframes = new Keyframes();
    this.analysisEnabled = true;
    this._lastBeat = -1; this._lastBar = -1; this._lastSection = -1;

    // Resize events
    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", this.handleResize, { passive: true });
    this.resize();
  }

  setTheme(name, palette = null) {
    this.themeName = name;
    if (name === "album" && palette) this.setPalette(palette);
    else if (name === "mono") { const c = this.customMono || "#1db954"; this.setPalette([c, c, "#ffffff"]); }
    else { const p = THEMES[name]; if (Array.isArray(p)) this.setPalette(p); }
  }
  setCustomMono(hex) { this.customMono = hex; if (this.themeName === "mono") this.setTheme("mono"); }
  setPalette(colors) { if (Array.isArray(colors) && colors.length) { this.palette = colors; this.bg = colors[0]; } }
  setTempo(bpm) { if (typeof bpm === "number" && bpm > 0) this.tempo = bpm; }
  setEnergy(val) { if (typeof val === "number") this.energy = clamp(val, 0, 1); }
  setAlbumImage(img) { this.albumImage = img; this.layers.forEach(l => l.scene.setAlbumImage?.(img)); }

  // External control hooks
  setLayerEnabled(name, enabled) { const L = this.layers.find(l => l.name === name); if (L) L.enabled = !!enabled; }
  setFx(name, enabled) { if (name in this.fx) this.fx[name] = !!enabled; }
  setCameraMode(mode) { this.camera.mode = mode; }
  setCameraShake(v) { this.camera.shake = v; }
  setCameraGyro(on) { this.camera.gyro = !!on; }
  configure(partial) {
    Object.assign(this, partial);
    // route to scenes
    const r = (k, v) => this.layers.forEach(l => l.scene.setOption?.(k, v));
    if (partial.complexity !== undefined) r("complexity", partial.complexity);
    if (partial.rings !== undefined) this.layers.find(l => l.name === "rings")?.scene.setOption("rings", partial.rings);
    if (partial.barsPerRing !== undefined) this.layers.find(l => l.name === "rings")?.scene.setOption("bars", partial.barsPerRing);
    if (partial.numParticles !== undefined) this.layers.find(l => l.name === "particles")?.scene.setOption("count", partial.numParticles);
    if (partial.particleSize !== undefined) this.layers.find(l => l.name === "particles")?.scene.setOption("size", partial.particleSize);
    if (partial.numNodes !== undefined) this.layers.find(l => l.name === "orbit")?.scene.setOption("nodes", partial.numNodes);
    if (partial.linkDistance !== undefined) this.layers.find(l => l.name === "orbit")?.scene.setOption("link", partial.linkDistance);
    if (partial.tunnelDensity !== undefined) this.layers.find(l => l.name === "tunnel")?.scene.setOption("density", partial.tunnelDensity);
    if (partial.tunnelTwist !== undefined) this.layers.find(l => l.name === "tunnel")?.scene.setOption("twist", partial.tunnelTwist);
    if (partial.numCovers !== undefined) this.layers.find(l => l.name === "covers")?.scene.setOption("count", partial.numCovers);
    if (partial.coverMaxSize !== undefined) this.layers.find(l => l.name === "covers")?.scene.setOption("size", partial.coverMaxSize);
  }

  // Keyframes
  enableKeyframeDemo(trackDuration = 180) {
    // Example: zoom on drop, tweak pulse
    this.keyframes.set("rotationMul", [
      { t: 0, value: 1.0 }, { t: trackDuration * 0.45, value: 1.0 }, { t: trackDuration * 0.5, value: 1.8 }, { t: trackDuration * 0.6, value: 1.1 }
    ]);
    this.keyframes.set("pulseMul", [
      { t: 0, value: 1.0 }, { t: trackDuration * 0.5, value: 1.6 }, { t: trackDuration * 0.7, value: 1.0 }
    ]);
  }

  setAnalysisEnabled(on) { this.analysisEnabled = !!on; }

  // App informs us about playback position and analysis indices
  updateAnalysis(clock) {
    // clock: { pos, beatIndex, barIndex, sectionIndex }
    if (!this.analysisEnabled) return;
    const { beatIndex, barIndex, sectionIndex, time } = clock;
    if (beatIndex != null && beatIndex !== this._lastBeat) {
      this._lastBeat = beatIndex;
      this.layers.forEach(l => l.scene.onBeat?.(this._driver));
    }
    if (barIndex != null && barIndex !== this._lastBar) {
      this._lastBar = barIndex;
      this.layers.forEach(l => l.scene.onBar?.(this._driver));
    }
    if (sectionIndex != null && sectionIndex !== this._lastSection) {
      this._lastSection = sectionIndex;
      this.layers.forEach(l => l.scene.onSection?.(this._driver));
    }
  }

  setDprCap(x) { this.dprCap = x; this.resize(); }

  start() { if (this.running) return; this.running = true; this.lastTs = 0; requestAnimationFrame(this.loop.bind(this)); }
  stop() { this.running = false; }

  resize() {
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const dpr = Math.min(this.dprCap, this.maxDpr);
    this.w = vw; this.h = vh;
    this.canvas.width = Math.floor(vw * dpr);
    this.canvas.height = Math.floor(vh * dpr);
    this.canvas.style.width = vw + "px";
    this.canvas.style.height = vh + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // buffers
    for (const buf of this.buffers) {
      buf.c.width = Math.floor(vw * dpr);
      buf.c.height = Math.floor(vh * dpr);
      buf.c.style.width = vw + "px";
      buf.c.style.height = vh + "px";
      buf.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.layers.forEach(l => l.scene.resize(vw, vh));
  }

  loop(ts) {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000; this.lastTs = ts;
    this.update(dt); this.render();

    if (this.adaptPerf) {
      this._frames++; this._fpsClock += dt;
      if (this._fpsClock >= 2) {
        const fps = this._frames / this._fpsClock;
        if (fps < 28 && this.dprCap > 1) { this.dprCap = Math.max(1, this.dprCap - 0.25); this.resize(); }
        else if (fps > 55 && this.dprCap < this.maxDpr) { this.dprCap = Math.min(this.maxDpr, this.dprCap + 0.25); this.resize(); }
        this._frames = 0; this._fpsClock = 0;
      }
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    const baseSpeed = this.tempo / 120;
    this.rotation += dt * baseSpeed * (0.5 + this.energy) * this.rotationMul;
    const beatSec = 60 / clamp(this.tempo, 40, 220);
    const t = performance.now() / 1000;
    const beatPhase = (t % beatSec) / beatSec;
    const pulse = Math.exp(-10 * Math.pow(beatPhase - 0.02, 2)) * (0.5 + this.energy * 0.8) * this.pulseMul;

    // apply keyframes
    if (this.keyframes) {
      const pos = this._playPos || 0;
      const r = this.keyframes.eval("rotationMul", pos); if (typeof r === "number") this.rotationMul = r;
      const p = this.keyframes.eval("pulseMul", pos); if (typeof p === "number") this.pulseMul = p;
    }

    // camera auto
    if (this.camera.mode === "orbit") this.camera.rot += dt * 0.15 * (0.8 + this.energy);
    if (this.camera.mode === "dolly") this.camera.zoom = 1 + Math.sin(t * 0.3) * 0.05 + pulse * 0.03;

    // driver shared
    this._driver = { time: t, pulse, rotation: this.rotation, energy: this.energy };

    // update scenes
    for (const L of this.layers) if (L.enabled) L.scene.update(dt, this._driver);

    // store time for analysis updates
    this._driver.time = t;
  }

  // Update current playback position (seconds) for keyframes
  setPlayPosition(sec) { this._playPos = sec; }

  render() {
    const ctx = this.ctx; const w = this.canvas.clientWidth; const h = this.canvas.clientHeight;

    // Trails / clear
    if (this.trailAlpha > 0) { ctx.fillStyle = `rgba(0,0,0,${this.trailAlpha})`; ctx.fillRect(0, 0, w, h); }
    else { ctx.clearRect(0, 0, w, h); }

    // Background glow
    const gradient = ctx.createRadialGradient(w * 0.8, -h * 0.2, 50, w * 0.8, -h * 0.2, Math.max(w, h));
    gradient.addColorStop(0, rgba(this.bg, this.glowOpacity)); gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);

    // Camera transform (global)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const shake = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;
    ctx.rotate((this.camera.rot || 0) + shake * 0.001);
    ctx.scale(this.camera.zoom || 1, this.camera.zoom || 1);
    ctx.translate(-w / 2, -h / 2);

    // Render each layer to its buffer then composite
    for (let i = 0; i < this.layers.length; i++) {
      const L = this.layers[i]; const B = this.buffers[i];
      const bctx = B.ctx;
      bctx.clearRect(0, 0, w, h);
      if (L.enabled) {
        // subtle pre-fade for motion blur within layer
        bctx.fillStyle = "rgba(0,0,0,0)";
        L.scene.render(bctx, w, h, this._driver);
        // composite
        ctx.globalAlpha = L.opacity;
        ctx.globalCompositeOperation = L.blend;
        ctx.drawImage(B.c, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }

    ctx.restore();

    // Post FX (2D approximations)
    if (this.fx.bloom) {
      // simple bloom-ish: blur small copy and add
      const s = 0.5;
      if (!this._bloom) {
        this._bloom = document.createElement("canvas");
        this._bloomCtx = this._bloom.getContext("2d");
      }
      const bc = this._bloom, bctx = this._bloomCtx;
      bc.width = Math.max(1, (w * s) | 0); bc.height = Math.max(1, (h * s) | 0);
      bctx.filter = "blur(6px)";
      bctx.drawImage(this.canvas, 0, 0, bc.width, bc.height);
      bctx.filter = "none";
      this.ctx.globalCompositeOperation = "screen";
      this.ctx.globalAlpha = 0.6;
      this.ctx.drawImage(bc, 0, 0, bc.width, bc.height, 0, 0, w, h);
      this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = "source-over";
    }
    if (this.fx.vignette) {
      const v = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.7);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.35)");
      this.ctx.fillStyle = v; this.ctx.fillRect(0, 0, w, h);
    }
    if (this.fx.chroma) {
      // chromatic aberration: shift tinted copies
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.globalAlpha = 0.5;
      this.ctx.filter = "hue-rotate(30deg)";
      this.ctx.drawImage(this.canvas, 1, 0);
      this.ctx.filter = "hue-rotate(-30deg)";
      this.ctx.drawImage(this.canvas, -1, 0);
      this.ctx.filter = "none";
      this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = "source-over";
    }
    if (this.fx.grain) {
      this.ctx.globalAlpha = 0.06;
      for (let i = 0; i < 40; i++) {
        const x = (Math.random() * w) | 0, y = (Math.random() * h) | 0;
        const rw = 2 + (Math.random() * 4), rh = 2 + (Math.random() * 4);
        this.ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
        this.ctx.fillRect(x, y, rw, rh);
      }
      this.ctx.globalAlpha = 1;
    }
  }
}