// Lightweight album-color-driven visualizer using canvas.
// Not analyzing raw audio (Spotify DRM prevents audio taps), instead:
// - Colors are extracted from the album art
// - Motion is driven by BPM (tempo) + energy from Spotify Audio Features
export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.palette = ["#1db954", "#3ddc97", "#ffffff"]; // default
    this.bg = "#0b0b10";
    this.tempo = 120;
    this.energy = 0.6;
    this.rotation = 0;
    this.lastTs = 0;
    this.running = false;
    this.devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);

    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.resize();
  }

  setPalette(colors) {
    if (Array.isArray(colors) && colors.length) {
      this.palette = colors;
      // Use the darkest-ish color for a subtle glow background
      this.bg = colors[0];
    }
  }

  setTempo(bpm) {
    if (typeof bpm === "number" && bpm > 0) this.tempo = bpm;
  }

  setEnergy(val) {
    if (typeof val === "number") this.energy = Math.min(1, Math.max(0, val));
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
    const { innerWidth: w, innerHeight: h } = window;
    this.canvas.width = Math.floor(w * this.devicePixelRatio);
    this.canvas.height = Math.floor(h * this.devicePixelRatio);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
  }

  loop(ts) {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000; // seconds
    this.lastTs = ts;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    // Rotate a little, influenced by energy
    const baseSpeed = this.tempo / 120; // faster rotation for higher tempos
    this.rotation += dt * baseSpeed * (0.5 + this.energy);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Clear with subtle transparent fill for trails
    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // Background glow gradient based on palette[0]
    const gradient = ctx.createRadialGradient(w * 0.8, -h * 0.2, 50, w * 0.8, -h * 0.2, Math.max(w, h));
    gradient.addColorStop(0, this.hexToRgba(this.bg, 0.25));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Centered radial bars
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.rotation * 0.2);

    const rings = 3;
    const barsPerRing = 48;
    const beatSec = 60 / Math.max(40, Math.min(220, this.tempo));
    const t = performance.now() / 1000;
    const beatPhase = (t % beatSec) / beatSec;
    // Pulse strength peaks at the beat
    const pulse = Math.exp(-10 * Math.pow(beatPhase - 0.02, 2)) * (0.5 + this.energy * 0.8);

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
    bloom.addColorStop(0, this.hexToRgba(this.palette[1] || "#ffffff", 0.22));
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