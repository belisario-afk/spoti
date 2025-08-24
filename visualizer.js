// Advanced visualizer with multiple modes, themes, and adaptive performance.
// Note: Driven by tempo/energy metadata (no raw audio tap from Spotify).

// Theme palettes
export const THEMES = {
  album: null, // set from album art
  neon: ["#00ffd5", "#a259ff", "#ffec19", "#ff3366"],
  midnight: ["#0f1020", "#2b2d42", "#8d99ae", "#edf2f4"],
  sunset: ["#ff7e5f", "#feb47b", "#ffd166", "#ef476f"],
  ocean: ["#0a9396", "#94d2bd", "#e9d8a6", "#ee9b00"],
  vaporwave: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff"],
  cyber: ["#00e1ff", "#ff00e1", "#00ff9f", "#ffe600"],
  candy: ["#ff9aa2", "#ffb7b2", "#ffdac1", "#e2f0cb"],
  noir: ["#0f0f12", "#2b2b30", "#c9c9d1", "#ffffff"],
  mono: null, // set by user custom color
};

// Utility
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

class SceneBase {
  init(viz) { this.viz = viz; }
  resize() {}
  setOption() {}
  setAlbumImage() {}
  update() {}
  render() {}
}

class RingsScene extends SceneBase {
  constructor() {
    super();
    this.rings = 3;
    this.bars = 60;
  }
  setOption(k, v) {
    if (k === "rings") this.rings = Math.max(1, Math.floor(v));
    if (k === "bars") this.bars = Math.max(8, Math.floor(v));
  }
  render(ctx, w, h, d) {
    const { palette, rotationMul, pulseMul, bloomStrength } = this.viz;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(d.rotation * 0.2);

    for (let r = 0; r < this.rings; r++) {
      const radius = 80 + r * 60 + d.pulse * 8 * (r + 1) * pulseMul;
      for (let i = 0; i < this.bars; i++) {
        const a = (i / this.bars) * Math.PI * 2 + d.rotation * (0.1 + r * 0.05) * rotationMul;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;

        const col = palette[(i + r) % palette.length] || "#ffffff";
        const len = 12 + Math.sin(a * 2 + d.time * (1.5 + r * 0.4)) * 8 + d.pulse * 22 * (0.6 + d.energy);
        const wBar = 3 + (r === 0 ? 1 : 0);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = rgba(col, 0.9);
        ctx.fillRect(-wBar / 2, -len / 2, wBar, len);
        ctx.restore();
      }
    }

    // Center bloom
    const bloom = ctx.createRadialGradient(0, 0, 4, 0, 0, 70 + d.pulse * 30);
    bloom.addColorStop(0, rgba(palette[1] || "#ffffff", bloomStrength));
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, 0, 120 + d.pulse * 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class ParticlesScene extends SceneBase {
  constructor() {
    super();
    this.n = 300;
    this.size = 1.4;
    this.particles = [];
    this.w = 0; this.h = 0;
  }
  setOption(k, v) {
    if (k === "count") this.n = Math.max(10, Math.floor(v));
    if (k === "size") this.size = v;
    if (k === "complexity") this.n = Math.floor(200 * v);
  }
  resize(w, h) { this.w = w; this.h = h; this._ensure(); }
  _ensure() {
    while (this.particles.length < this.n) {
      this.particles.push({
        x: rand(-this.w, this.w * 2), y: rand(-this.h, this.h * 2),
        vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2),
        hue: Math.random(),
        life: rand(0, 1)
      });
    }
    if (this.particles.length > this.n) this.particles.length = this.n;
  }
  update(dt, d) {
    this._ensure();
    const cx = this.w / 2, cy = this.h / 2;
    const attract = 10 * (0.5 + d.energy);
    for (const p of this.particles) {
      const dx = cx - p.x, dy = cy - p.y;
      const dist = Math.hypot(dx, dy) + 1;
      const ax = (dx / dist) * attract * dt;
      const ay = (dy / dist) * attract * dt;
      p.vx += ax + (Math.sin((p.y + d.time * 60) * 0.002) * 0.05);
      p.vy += ay + (Math.cos((p.x - d.time * 60) * 0.002) * 0.05);
      const speed = 40 + 200 * d.energy + d.pulse * 160;
      p.x += p.vx * speed * dt;
      p.y += p.vy * speed * dt;
      p.life += dt * (0.2 + d.energy * 0.8);
      if (p.x < -100 || p.x > this.w + 100 || p.y < -100 || p.y > this.h + 100) {
        p.x = rand(0, this.w); p.y = rand(0, this.h);
        p.vx = rand(-0.2, 0.2); p.vy = rand(-0.2, 0.2);
        p.life = 0;
      }
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const t = (Math.sin(p.life * Math.PI) * 0.5 + 0.5);
      const col = palette[Math.floor(p.hue * palette.length) % palette.length] || "#ffffff";
      ctx.fillStyle = rgba(col, 0.12 + t * 0.6);
      const r = this.size + t * 2.5 + d.pulse * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}

class OrbitLinesScene extends SceneBase {
  constructor() {
    super();
    this.nodes = 60;
    this.linkDist = 160;
    this.points = [];
    this.w = 0; this.h = 0;
  }
  setOption(k, v) {
    if (k === "nodes") this.nodes = Math.max(4, Math.floor(v));
    if (k === "link") this.linkDist = v;
    if (k === "complexity") this.nodes = Math.floor(40 * v + 20);
  }
  resize(w, h) { this.w = w; this.h = h; this._regen(); }
  _regen() {
    const cx = this.w / 2, cy = this.h / 2;
    this.points = Array.from({ length: this.nodes }, (_, i) => {
      const r = rand(60, Math.min(this.w, this.h) * 0.45);
      const a = rand(0, Math.PI * 2);
      return { r, a, speed: rand(0.2, 1.2), z: rand(0.2, 1.2), x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
  }
  update(dt, d) {
    if (this.points.length !== this.nodes) this._regen();
    const cx = this.w / 2, cy = this.h / 2;
    for (const p of this.points) {
      p.a += dt * p.speed * (0.3 + d.energy) * (1 + d.pulse * 0.2);
      const twist = 0.2 + d.energy * 0.6;
      const rr = p.r * (1 + Math.sin(d.time * 0.5 + p.r * 0.01) * 0.05 * twist);
      p.x = cx + Math.cos(p.a) * rr;
      p.y = cy + Math.sin(p.a) * rr;
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.strokeStyle = rgba(palette[0] || "#fff", 0.4);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i];
      for (let j = i + 1; j < this.points.length; j++) {
        const b = this.points[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.linkDist) {
          const t = 1 - dist / this.linkDist;
          ctx.strokeStyle = rgba(palette[(i + j) % palette.length] || "#fff", 0.15 + t * 0.45);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    // orbit dots
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      ctx.fillStyle = rgba(palette[i % palette.length] || "#fff", 0.9);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4 + d.pulse * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class TunnelScene extends SceneBase {
  constructor() {
    super();
    this.density = 40;
    this.twist = 0.6;
  }
  setOption(k, v) {
    if (k === "density") this.density = Math.floor(v);
    if (k === "twist") this.twist = v;
    if (k === "complexity") this.density = Math.floor(30 * v + 20);
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const maxR = Math.hypot(w, h) * 0.6;
    for (let i = 0; i < this.density; i++) {
      const t = i / this.density;
      const r = maxR * t;
      const a = d.rotation * (0.5 + this.twist) + t * Math.PI * 8;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const col = palette[i % palette.length] || "#fff";
      const alpha = 0.15 + (1 - t) * 0.6;
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

class CoversScene extends SceneBase {
  constructor() {
    super();
    this.n = 16;
    this.maxSize = 160;
    this.sprites = [];
    this.tex = null; // Image
    this.w = 0; this.h = 0;
  }
  setOption(k, v) {
    if (k === "count") this.n = Math.max(1, Math.floor(v));
    if (k === "size") this.maxSize = v;
    if (k === "complexity") this.n = Math.floor(10 * v + 8);
  }
  setAlbumImage(img) {
    this.tex = img || null;
    // randomize rotations on new album
    for (const s of this.sprites) s.rot = rand(-Math.PI, Math.PI);
  }
  resize(w, h) { this.w = w; this.h = h; this._ensure(); }
  _ensure() {
    while (this.sprites.length < this.n) {
      this.sprites.push({
        x: rand(0, this.w), y: rand(0, this.h), z: rand(0.2, 1), rot: rand(-Math.PI, Math.PI),
        vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vr: rand(-0.3, 0.3),
      });
    }
    if (this.sprites.length > this.n) this.sprites.length = this.n;
  }
  update(dt, d) {
    this._ensure();
    for (const s of this.sprites) {
      s.x += s.vx * (60 + 200 * d.energy + d.pulse * 120) * dt;
      s.y += s.vy * (60 + 200 * d.energy + d.pulse * 120) * dt;
      s.rot += s.vr * dt * (0.2 + d.energy);
      if (s.x < -200) s.x = this.w + 200;
      if (s.x > this.w + 200) s.x = -200;
      if (s.y < -200) s.y = this.h + 200;
      if (s.y > this.h + 200) s.y = -200;
      // subtle zoom pulsation
      s.z = clamp(s.z + (Math.sin(d.time * 0.6 + s.rot) * 0.002), 0.2, 1.2);
    }
  }
  render(ctx, w, h, d) {
    const { palette } = this.viz;
    ctx.save();
    ctx.translate(0, 0);
    for (const s of this.sprites) {
      const size = (this.maxSize * (0.3 + s.z)) * (0.8 + d.pulse * 0.2);
      const x = s.x, y = s.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rot + d.rotation * 0.05);
      ctx.globalAlpha = 0.7 + 0.3 * (s.z);
      if (this.tex) {
        ctx.drawImage(this.tex, -size / 2, -size / 2, size, size);
        // glow border
        ctx.strokeStyle = rgba(palette[1] || "#fff", 0.25);
        ctx.lineWidth = clamp(size * 0.02, 1, 6);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = rgba(palette[0] || "#fff", 0.8);
        ctx.fillRect(-size / 2, -size / 2, size, size);
      }
      ctx.restore();
    }
    ctx.restore();
  }
}

export class Visualizer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });

    // Core state
    this.palette = opts.palette || ["#1db954", "#3ddc97", "#ffffff"];
    this.bg = this.palette[0] || "#0b0b10";
    this.tempo = 120;
    this.energy = 0.6;
    this.rotation = 0;
    this.lastTs = 0;
    this.running = false;

    // Global settings
    this.mode = opts.mode || "rings";
    this.rotationMul = opts.rotationMul ?? 1.0;
    this.pulseMul = opts.pulseMul ?? 1.0;
    this.glowOpacity = opts.glowOpacity ?? 0.25;
    this.trailAlpha = opts.trailAlpha ?? 0.06;
    this.bloomStrength = opts.bloomStrength ?? 0.22;
    this.complexity = opts.complexity ?? 1.0;
    this.themeName = opts.themeName || "album";
    this.customMono = opts.customMono || "#1db954";

    // Performance
    this.maxDpr = Math.max(1, window.devicePixelRatio || 1);
    this.dprCap = opts.dprCap ?? this.maxDpr;
    this.adaptPerf = true;
    this._fpsClock = 0;
    this._frames = 0;

    // Album texture for covers scene
    this.albumImage = null;

    // Scenes
    this.scenes = {
      rings: new RingsScene(),
      particles: new ParticlesScene(),
      orbit: new OrbitLinesScene(),
      tunnel: new TunnelScene(),
      covers: new CoversScene(),
    };
    Object.values(this.scenes).forEach(s => s.init(this));

    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleResize, { passive: true });
    }
    this.resize();
  }

  setMode(mode) {
    if (this.scenes[mode]) {
      this.mode = mode;
      this.resize(); // let scene recalc layout
    }
  }
  setTheme(name, palette = null) {
    this.themeName = name;
    if (name === "album" && palette) {
      this.setPalette(palette);
    } else if (name === "mono") {
      const c = this.customMono || "#1db954";
      this.setPalette([c, c, "#ffffff"]);
    } else {
      const p = THEMES[name];
      if (Array.isArray(p)) this.setPalette(p);
    }
  }
  setCustomMono(hex) {
    this.customMono = hex;
    if (this.themeName === "mono") this.setTheme("mono");
  }

  setPalette(colors) {
    if (Array.isArray(colors) && colors.length) {
      this.palette = colors;
      this.bg = colors[0];
    }
  }
  setTempo(bpm) { if (typeof bpm === "number" && bpm > 0) this.tempo = bpm; }
  setEnergy(val) { if (typeof val === "number") this.energy = clamp(val, 0, 1); }
  setAlbumImage(img) {
    this.albumImage = img || null;
    if (this.scenes.covers) this.scenes.covers.setAlbumImage(this.albumImage);
  }

  configure(partial) {
    Object.assign(this, partial);
    // forward some options into scenes
    if (partial.rings !== undefined) this.scenes.rings?.setOption("rings", partial.rings);
    if (partial.barsPerRing !== undefined) this.scenes.rings?.setOption("bars", partial.barsPerRing);
    if (partial.numParticles !== undefined) this.scenes.particles?.setOption("count", partial.numParticles);
    if (partial.particleSize !== undefined) this.scenes.particles?.setOption("size", partial.particleSize);
    if (partial.numNodes !== undefined) this.scenes.orbit?.setOption("nodes", partial.numNodes);
    if (partial.linkDistance !== undefined) this.scenes.orbit?.setOption("link", partial.linkDistance);
    if (partial.tunnelDensity !== undefined) this.scenes.tunnel?.setOption("density", partial.tunnelDensity);
    if (partial.tunnelTwist !== undefined) this.scenes.tunnel?.setOption("twist", partial.tunnelTwist);
    if (partial.numCovers !== undefined) this.scenes.covers?.setOption("count", partial.numCovers);
    if (partial.coverMaxSize !== undefined) this.scenes.covers?.setOption("size", partial.coverMaxSize);
    if (partial.complexity !== undefined) {
      for (const s of Object.values(this.scenes)) s.setOption?.("complexity", partial.complexity);
    }
  }

  setDprCap(x) { this.dprCap = x; this.resize(); }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    requestAnimationFrame(this.loop.bind(this));
  }
  stop() { this.running = false; }

  resize() {
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const dpr = Math.min(this.dprCap, this.maxDpr);
    this.canvas.width = Math.floor(vw * dpr);
    this.canvas.height = Math.floor(vh * dpr);
    this.canvas.style.width = vw + "px";
    this.canvas.style.height = vh + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.values(this.scenes).forEach(s => s.resize(vw, vh));
  }

  loop(ts) {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    this.update(dt);
    this.render();

    // FPS-based adaptive DPR
    if (this.adaptPerf) {
      this._frames++; this._fpsClock += dt;
      if (this._fpsClock >= 2) {
        const fps = this._frames / this._fpsClock;
        if (fps < 28 && this.dprCap > 1) {
          this.dprCap = Math.max(1, this.dprCap - 0.25);
          this.resize();
        } else if (fps > 55 && this.dprCap < this.maxDpr) {
          this.dprCap = Math.min(this.maxDpr, this.dprCap + 0.25);
          this.resize();
        }
        this._frames = 0; this._fpsClock = 0;
      }
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    const baseSpeed = this.tempo / 120;
    this.rotation += dt * baseSpeed * (0.5 + this.energy) * this.rotationMul;

    // Driver values shared with scenes
    this._driver = this._driver || {};
    const beatSec = 60 / clamp(this.tempo, 40, 220);
    const t = performance.now() / 1000;
    const beatPhase = (t % beatSec) / beatSec;
    const pulse = Math.exp(-10 * Math.pow(beatPhase - 0.02, 2)) * (0.5 + this.energy * 0.8) * this.pulseMul;

    this._driver.time = t;
    this._driver.pulse = pulse;
    this._driver.rotation = this.rotation;
    this._driver.energy = this.energy;

    // Update active scene
    this.scenes[this.mode]?.update(dt, this._driver);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Trails
    if (this.trailAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.trailAlpha})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    // Background glow
    const gradient = ctx.createRadialGradient(w * 0.8, -h * 0.2, 50, w * 0.8, -h * 0.2, Math.max(w, h));
    gradient.addColorStop(0, rgba(this.bg, this.glowOpacity));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Scene
    this.scenes[this.mode]?.render(ctx, w, h, this._driver);
  }
}

// Helpers
function rgba(hex, a = 1) {
  if (!hex) return `rgba(255,255,255,${a})`;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}