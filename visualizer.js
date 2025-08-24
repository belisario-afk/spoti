// Album-color-driven visualizer with configurable parameters.
// Driven by metadata (tempo/energy) not raw audio.
// New: settings for rings/bars, rotation, pulse, trails, glow, bloom, DPR cap.

export class Visualizer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });

    // Config
    this.palette = opts.palette || ["#1db954", "#3ddc97", "#ffffff"];
    this.bg = "#0b0b10";
    this.tempo = 120;
    this.energy = 0.6;
    this.rotation = 0;
    this.lastTs = 0;
    this.running = false;

    this.rings = opts.rings ?? 3;
    this.barsPerRing = opts.barsPerRing ?? 48;
    this.rotationMul = opts.rotationMul ?? 1.0;
    this.pulseMul = opts.pulseMul ?? 1.0;
    this.glowOpacity = opts.glowOpacity ?? 0.25;
    this.trailAlpha = opts.trailAlpha ?? 0.06;
    this.bloomStrength = opts.bloomStrength ?? 0.22;
    this.dprCap = opts.dprCap ?? Math.max(1, window.devicePixelRatio || 1);

    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleResize, { passive: true });
    }
    this.resize();
  }

  setPalette(colors) {
    if (Array.isArray(colors) && colors.length) {
      this.palette = colors;
      this.bg = colors[0];
    }
  }
  setTempo(bpm) {
    if (typeof bpm === "number" && bpm > 0) this.tempo = bpm;
  }
  setEnergy(val) {
    if (typeof val === "number") this.energy = Math.min(1, Math.max(0, val));
  }

  configure(partial) {
    Object.assign(this, partial);
  }
  setDprCap(x) {
    this.dprCap = x;
    this.resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    this.running = false;
  }

  resize() {
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const dpr = Math.min(this.dprCap, Math.max(1, window.devicePixelRatio || 1));

    this.canvas.width = Math.floor(vw * dpr);
    this.canvas.height = Math.floor(vh * dpr);
    this.canvas.style.width = vw + "px";
    this.canvas.style.height = vh + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  loop(ts) {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    const baseSpeed = this.tempo / 120;
    this.rotation += dt * baseSpeed * (0.5 + this.energy) * this.rotationMul;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Trail fade for smooth motion
    if (this.trailAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.trailAlpha})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    ctx.save();

    // Background glow gradient based on palette[0]
    const gradient = ctx.createRadialGradient(w * 0.8, -h * 0.2, 50, w * 0.8, -h * 0.2, Math.max(w, h));
    gradient.addColorStop(0, this.hexToRgba(this.bg, this.glowOpacity));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Centered radial bars
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.rotation * 0.2);

    const rings = Math.max(1, Math.floor(this.rings));
    const barsPerRing = Math.max(8, Math.floor(this.barsPerRing));
    const beatSec = 60 / Math.max(40, Math.min(220, this.tempo));
    const t = performance.now() / 1000;
    const beatPhase = (t % beatSec) / beatSec;
    const pulse = Math.exp(-10 * Math.pow(beatPhase - 0.02, 2)) * (0.5 + this.energy * 0.8) * this.pulseMul;

    for (let r = 0; r < rings; r++) {
      const radius = 80 + r * 60 + pulse * 8 * (r + 1);
      for (let i = 0; i < barsPerRing; i++) {
        const a = (i / barsPerRing) * Math.PI * 2 + this.rotation * (0.1 + r * 0.05);
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;

        const col = this.palette[(i + r) % this.palette.length] || "#ffffff";
        const len = 12 + Math.sin(a * 2 + t * (1.5 + r * 0.4)) * 8 + pulse * 22 * (0.6 + this.energy);
        const wBar = 3 + (r === 0 ? 1 : 0);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = this.hexToRgba(col, 0.9);
        ctx.fillRect(-wBar / 2, -len / 2, wBar, len);
        ctx.restore();
      }
    }

    // Center bloom
    const bloom = ctx.createRadialGradient(0, 0, 4, 0, 0, 70 + pulse * 30);
    bloom.addColorStop(0, this.hexToRgba(this.palette[1] || "#ffffff", this.bloomStrength));
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, 0, 120 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(255,255,255,${alpha})`;
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}