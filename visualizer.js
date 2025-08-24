// Ultra visualizer engine with multiple scenes, crossfades, themes, particles, flow fields, ribbons, waves, and floating album covers.
// Driven by metadata (tempo/energy) + album palettes (no raw audio taps due to DRM).
// API:
//  - setPalette(colors), setTempo(bpm), setEnergy(0..1)
//  - configure({...}), setDprCap(x)
//  - setScene(name), getScenes()
//  - setAlbumImages(urls[])  // optional, used by "Floating Covers" scene
//  - start(), stop()

export class Visualizer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.palette = opts.palette || ["#1db954", "#3ddc97", "#ffffff"];
    this.bg = this.palette[0] || "#0b0b10";
    this.tempo = 120;
    this.energy = 0.6;

    // Globals
    this.rotationMul = opts.rotationMul ?? 1.0;
    this.pulseMul = opts.pulseMul ?? 1.0;
    this.glowOpacity = opts.glowOpacity ?? 0.25;
    this.trailAlpha = opts.trailAlpha ?? 0.06;
    this.bloomStrength = opts.bloomStrength ?? 0.22;
    this.rings = opts.rings ?? 3;
    this.barsPerRing = opts.barsPerRing ?? 48;

    // DPR handling
    this.dprCap = opts.dprCap ?? Math.max(1, window.devicePixelRatio || 1);

    // Scenes
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
    this.prevCanvas = null; // for crossfade
    this.prevAlpha = 0;
    this.crossfadeDur = 650; // ms
    this.switchAt = 0;

    // Album images (for Floating Covers)
    this.albumImages = [];
    this.loadedImages = []; // Image objects

    // Loop
    this.running = false;
    this.lastTs = 0;

    // Resize
    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleResize, { passive: true });
    }
    this.resize();

    // Register built-in scenes
    this.registerDefaultScenes();
    // Default scene
    this.setScene("Radiant Rings");
  }

  setPalette(colors) {
    if (Array.isArray(colors) && colors.length) {
      this.palette = colors;
      this.bg = colors[0];
      if (this.current?.onPalette) this.current.onPalette(this.palette);
    }
  }
  setTempo(bpm) { if (typeof bpm === "number" && bpm > 0) this.tempo = bpm; }
  setEnergy(val) { if (typeof val === "number") this.energy = Math.min(1, Math.max(0, val)); }

  configure(partial) {
    Object.assign(this, partial);
    if (this.current?.onConfig) this.current.onConfig(this);
  }
  setDprCap(x) {
    this.dprCap = x;
    this.resize();
  }

  async setAlbumImages(urls = []) {
    // Load as HTMLImageElement with CORS
    this.albumImages = urls.slice(0, 24);
    this.loadedImages = await Promise.all(
      this.albumImages.map(u => this.loadImage(u).catch(() => null))
    ).then(arr => arr.filter(Boolean));
    if (this.current?.onImages) this.current.onImages(this.loadedImages);
  }

  getScenes() {
    return [...this.scenes.keys()];
  }

  setScene(name) {
    const factory = this.scenes.get(name);
    if (!factory) return;
    // Prepare crossfade
    if (!this.prevCanvas) {
      this.prevCanvas = document.createElement("canvas");
    }
    const w = this.canvas.width, h = this.canvas.height;
    this.prevCanvas.width = w; this.prevCanvas.height = h;
    this.prevCanvas.getContext("2d").drawImage(this.canvas, 0, 0);

    // Dispose current
    if (this.current?.dispose) this.current.dispose();

    // Create new scene
    this.current = factory();
    this.currentName = name;
    if (this.current.init) {
      this.current.init(this.ctx, this.canvas.clientWidth, this.canvas.clientHeight, this.getCtx());
    }
    if (this.current.onPalette) this.current.onPalette(this.palette);
    if (this.current.onImages && this.loadedImages.length) this.current.onImages(this.loadedImages);
    if (this.current.onConfig) this.current.onConfig(this);

    // Crossfade
    this.switchAt = performance.now();
    this.prevAlpha = 1;
  }

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
    const dpr = Math.min(this.dprCap, Math.max(1, window.devicePixelRatio || 1));

    this.canvas.width = Math.floor(vw * dpr);
    this.canvas.height = Math.floor(vh * dpr);
    this.canvas.style.width = vw + "px";
    this.canvas.style.height = vh + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.current?.resize) this.current.resize(vw, vh, this.getCtx());
  }

  loop(ts) {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    // Update scene
    if (this.current?.update) this.current.update(dt, this.getCtx());

    // Render
    this.render(ts);

    requestAnimationFrame(this.loop.bind(this));
  }

  render(ts) {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Trails or clear
    if (this.trailAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.trailAlpha})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    // Background glow
    const g = ctx.createRadialGradient(w * 0.8, -h * 0.2, 50, w * 0.8, -h * 0.2, Math.max(w, h));
    g.addColorStop(0, hexToRgba(this.bg, this.glowOpacity));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Scene render
    if (this.current?.render) this.current.render(this.getCtx());

    // Bloom center (subtle)
    if (this.bloomStrength > 0) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const pulse = this.beatPulse(ts) * 30;
      const bloom = ctx.createRadialGradient(0, 0, 4, 0, 0, 70 + pulse);
      bloom.addColorStop(0, hexToRgba(this.palette[1] || "#ffffff", this.bloomStrength));
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(0, 0, 120 + pulse * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Crossfade from previous
    if (this.prevCanvas && this.prevAlpha > 0) {
      const elapsed = performance.now() - this.switchAt;
      this.prevAlpha = 1 - Math.min(1, elapsed / this.crossfadeDur);
      ctx.globalAlpha = this.prevAlpha * 0.9;
      ctx.drawImage(this.prevCanvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  beatPulse(ts) {
    const t = (ts || performance.now()) / 1000;
    const beat = 60 / Math.max(40, Math.min(220, this.tempo));
    const phase = (t % beat) / beat;
    return Math.exp(-10 * Math.pow(phase - 0.02, 2)) * (0.5 + this.energy * 0.8) * this.pulseMul;
  }

  // Context for scenes
  getCtx() {
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      w: this.canvas.clientWidth,
      h: this.canvas.clientHeight,
      palette: this.palette,
      tempo: this.tempo,
      energy: this.energy,
      rings: this.rings,
      barsPerRing: this.barsPerRing,
      rotationMul: this.rotationMul,
      pulseMul: this.pulseMul,
      trailAlpha: this.trailAlpha,
      glowOpacity: this.glowOpacity,
      bloomStrength: this.bloomStrength,
      beatPulse: (ts) => this.beatPulse(ts),
      random: seededRandom,
      images: this.loadedImages,
    };
  }

  register(name, factory) {
    this.scenes.set(name, factory);
  }

  registerDefaultScenes() {
    // 1) Radiant Rings (evolved)
    this.register("Radiant Rings", () => {
      let rotation = 0;
      return {
        onConfig: (viz) => { /* nothing extra */ },
        update: (dt, v) => {
          const baseSpeed = v.tempo / 120;
          rotation += dt * baseSpeed * (0.5 + v.energy) * v.rotationMul;
        },
        render: (v) => {
          const { ctx, w, h, rings, barsPerRing, palette } = v;
          const t = performance.now() / 1000;
          const beat = v.beatPulse();
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate(rotation * 0.2);
          const R = Math.min(w, h) * 0.36;
          for (let r = 0; r < rings; r++) {
            const radius = 40 + (R / rings) * r + beat * 6 * (r + 1);
            for (let i = 0; i < barsPerRing; i++) {
              const a = (i / barsPerRing) * Math.PI * 2 + rotation * (0.1 + r * 0.05);
              const x = Math.cos(a) * radius;
              const y = Math.sin(a) * radius;
              const col = palette[(i + r) % palette.length] || "#ffffff";
              const len = 10 + Math.sin(a * 2 + t * (1.5 + r * 0.4)) * 7 + beat * 20 * (0.6 + v.energy);
              const wBar = 2.4 + (r === 0 ? 0.6 : 0);
              ctx.save();
              ctx.translate(x, y); ctx.rotate(a);
              ctx.fillStyle = hexToRgba(col, 0.9);
              ctx.fillRect(-wBar / 2, -len / 2, wBar, len);
              ctx.restore();
            }
          }
          ctx.restore();
        },
      };
    });

    // 2) Particle Burst
    this.register("Particle Burst", () => {
      const parts = [];
      const MAX = 900;
      function spawnBurst(v, count) {
        const { w, h, palette, energy } = v;
        const cx = w / 2, cy = h / 2;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 70 + Math.random() * 240 * (0.5 + energy);
          parts.push({
            x: cx, y: cy,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.8 + Math.random() * 1.6,
            age: 0,
            size: 1 + Math.random() * 2.4,
            color: palette[Math.floor(Math.random() * palette.length)] || "#fff",
          });
        }
        while (parts.length > MAX) parts.shift();
      }
      return {
        update: (dt, v) => {
          const p = v.beatPulse();
          if (p > 0.35) spawnBurst(v, Math.floor(40 + p * 80));
          for (const it of parts) {
            it.age += dt;
            it.x += it.vx * dt;
            it.y += it.vy * dt;
            it.vx *= 1 - dt * 0.6;
            it.vy *= 1 - dt * 0.6;
          }
          // Remove dead
          for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age > parts[i].life) parts.splice(i, 1);
        },
        render: (v) => {
          const { ctx } = v;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const it of parts) {
            const alpha = Math.max(0, 1 - it.age / it.life);
            ctx.fillStyle = hexToRgba(it.color, alpha * 0.9);
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.size + (1 - alpha) * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      };
    });

    // 3) Flow Field Drift
    this.register("Flow Field", () => {
      const pts = [];
      const COUNT = 1800;
      let t0 = Math.random() * 1000;
      function field(x, y, t) {
        // Smooth pseudo noise with sines
        const n = Math.sin(x * 0.002 + t) + Math.sin(y * 0.0035 - t * 0.8);
        const a = n * Math.PI;
        return a;
      }
      return {
        init: (ctx, w, h) => {
          pts.length = 0;
          for (let i = 0; i < COUNT; i++) {
            pts.push({
              x: Math.random() * w,
              y: Math.random() * h,
              life: 40 + Math.random() * 120,
            });
          }
        },
        update: (dt, v) => {
          t0 += dt * 0.5;
          const sp = 35 + v.energy * 65;
          for (const p of pts) {
            const a = field(p.x, p.y, t0);
            p.x += Math.cos(a) * sp * dt;
            p.y += Math.sin(a) * sp * dt;
            if (p.x < 0) p.x += v.w; if (p.x > v.w) p.x -= v.w;
            if (p.y < 0) p.y += v.h; if (p.y > v.h) p.y -= v.h;
            if (--p.life < 0) {
              p.x = Math.random() * v.w; p.y = Math.random() * v.h; p.life = 40 + Math.random() * 120;
            }
          }
        },
        render: (v) => {
          const { ctx, palette } = v;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.lineWidth = 1;
          for (let i = 0; i < pts.length; i += 2) {
            const p = pts[i], q = pts[i + 1] || pts[0];
            const col = palette[i % palette.length] || "#fff";
            ctx.strokeStyle = hexToRgba(col, 0.18);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      };
    });

    // 4) Spectrum Waves (polylines)
    this.register("Spectrum Waves", () => {
      return {
        render: (v) => {
          const { ctx, w, h, palette, tempo, energy } = v;
          const t = performance.now() / 1000;
          const lines = 6;
          const cx = w / 2, cy = h / 2;
          const baseR = Math.min(w, h) * 0.3;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.05 * (0.5 + energy));
          for (let L = 0; L < lines; L++) {
            const col = palette[L % palette.length] || "#fff";
            ctx.strokeStyle = hexToRgba(col, 0.85);
            ctx.lineWidth = 1.2 + L * 0.2;
            ctx.beginPath();
            const segs = 240;
            for (let i = 0; i <= segs; i++) {
              const a = (i / segs) * Math.PI * 2;
              const m = (Math.sin(a * 3 + t * (1.6 + L * 0.2)) + Math.sin(a * 1.3 - t * 1.2)) * 0.5;
              const beat = Math.min(1.6, (60 / tempo) * 1.4) * (0.4 + energy) * v.pulseMul;
              const r = baseR * (0.7 + L * 0.05) + m * 18 + beat * 10;
              const x = Math.cos(a) * r;
              const y = Math.sin(a) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();
        }
      };
    });

    // 5) Floating Covers
    this.register("Floating Covers", () => {
      let sprites = [];
      let bounds = { w: 0, h: 0 };
      function buildSprites(images, v) {
        sprites = [];
        const N = Math.min(images.length || 1, 18);
        for (let i = 0; i < N; i++) {
          const img = images[i % images.length];
          const size = Math.min(v.w, v.h) * (0.12 + Math.random() * 0.1);
          sprites.push({
            img,
            x: Math.random() * v.w, y: Math.random() * v.h,
            vx: (-0.5 + Math.random()) * (36 + v.energy * 40),
            vy: (-0.5 + Math.random()) * (36 + v.energy * 40),
            a: Math.random() * Math.PI * 2,
            va: (-0.5 + Math.random()) * 0.5,
            s: size,
          });
        }
      }
      return {
        onImages: (imgs) => { /* handled in update via init */ },
        init: (ctx, w, h, v) => { bounds = { w, h }; if (v.images?.length) buildSprites(v.images, v); },
        onPalette: () => {},
        update: (dt, v) => {
          bounds = { w: v.w, h: v.h };
          if (!sprites.length && v.images?.length) buildSprites(v.images, v);
          const beatJolt = v.beatPulse();
          for (const s of sprites) {
            s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
            // Beat nudge
            if (beatJolt > 0.35) {
              s.vx += (-0.5 + Math.random()) * 40 * beatJolt;
              s.vy += (-0.5 + Math.random()) * 40 * beatJolt;
            }
            // Bounds bounce
            if (s.x < 0) { s.x = 0; s.vx *= -1; }
            if (s.y < 0) { s.y = 0; s.vy *= -1; }
            if (s.x + s.s > bounds.w) { s.x = bounds.w - s.s; s.vx *= -1; }
            if (s.y + s.s > bounds.h) { s.y = bounds.h - s.s; s.vy *= -1; }
            // Damp
            s.vx *= (1 - dt * 0.05);
            s.vy *= (1 - dt * 0.05);
          }
        },
        render: (v) => {
          const { ctx, palette } = v;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const s of sprites) {
            // Glow shadow
            ctx.shadowColor = hexToRgba(palette[1] || "#fff", 0.35);
            ctx.shadowBlur = 24;
            ctx.translate(s.x + s.s / 2, s.y + s.s / 2);
            ctx.rotate(s.a);
            if (s.img) {
              ctx.drawImage(s.img, -s.s / 2, -s.s / 2, s.s, s.s);
            } else {
              ctx.fillStyle = hexToRgba(palette[0], 0.9);
              ctx.fillRect(-s.s / 2, -s.s / 2, s.s, s.s);
            }
            ctx.setTransform(1,0,0,1,0,0);
          }
          ctx.restore();
        },
        dispose: () => { sprites = []; }
      };
    });

    // 6) Aurora Ribbons
    this.register("Aurora Ribbons", () => {
      const ribbons = [];
      const N = 5;
      for (let i = 0; i < N; i++) ribbons.push({ seed: Math.random() * 1000, offset: i * 0.4 });
      return {
        render: (v) => {
          const { ctx, w, h, palette, energy } = v;
          const t = performance.now() / 1000;
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          for (let i = 0; i < ribbons.length; i++) {
            const rb = ribbons[i];
            const col = palette[i % palette.length] || "#fff";
            const path = [];
            const rows = 80;
            for (let x = 0; x <= rows; x++) {
              const px = (x / rows) * w;
              const y0 = h * (0.3 + 0.15 * i) + Math.sin((x * 0.12) + t * (0.8 + rb.offset)) * 30 * (0.6 + energy);
              const y1 = y0 + 18 + Math.sin((x * 0.32) - t * (1.2 + rb.offset)) * 16;
              path.push({ x: px, y0, y1 });
            }
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, hexToRgba(col, 0.16));
            grad.addColorStop(1, hexToRgba("#ffffff", 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y0);
            for (let k = 1; k < path.length; k++) ctx.lineTo(path[k].x, path[k].y0);
            for (let k = path.length - 1; k >= 0; k--) ctx.lineTo(path[k].x, path[k].y1);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      };
    });
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// A simple seeded-like randomness via sin hashing; used for subtle consistency.
function seededRandom(i = Math.random()) {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}