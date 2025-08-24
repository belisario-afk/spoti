import { SPOTIFY_CLIENT_ID } from "./config.js";
import { Visualizer } from "./visualizer.js";

// -------- DOM Refs --------
const $ = (sel) => document.querySelector(sel);
const loginBtn = $("#login-btn");
const logoutBtn = $("#logout-btn");
const settingsBtn = $("#settings-btn");
const overlay = $("#overlay");
const drawer = $("#drawer");
const drawerClose = $("#drawer-close");

const userSection = $("#user");
const userName = $("#user-name");
const userProduct = $("#user-product");
const userAvatar = $("#user-avatar");
const playerSection = $("#player");
const albumArt = $("#album-art");
const trackName = $("#track-name");
const trackArtist = $("#track-artist");
const trackAlbum = $("#track-album");
const playBtn = $("#play");
const prevBtn = $("#prev");
const nextBtn = $("#next");
const seek = $("#seek");
const elapsed = $("#elapsed");
const duration = $("#duration");
const volumeSlider = $("#volume-slider");
const statusEl = $("#status");

// Settings controls
const colorModeSel = $("#color-mode");
const customColorInp = $("#custom-color");
const lockPaletteChk = $("#lock-palette");

const ringsRange = $("#rings");
const barsRange = $("#bars");
const rotationRange = $("#rotation");
const pulseRange = $("#pulse");
const glowRange = $("#glow");
const trailRange = $("#trail");
const bloomRange = $("#bloom");
const out = (id) => drawer.querySelector(`[data-out="${id}"]`);

// -------- Device detection --------
const ua = navigator.userAgent || "";
const isIPhone = /\biPhone\b/.test(ua) || (/\bCPU iPhone OS\b/.test(ua) && /\bMobile\b/.test(ua));
const isIOS = isIPhone || /\biPad\b/.test(ua);
if (isIPhone) document.documentElement.classList.add("iphone");

// -------- Visualizer --------
const defaultSettings = {
  colorMode: "album", // album | brand | mono
  customColor: "#1db954",
  lockPalette: false,
  rings: isIPhone ? 2 : 3,
  barsPerRing: isIPhone ? 36 : 48,
  rotationMul: 1.0,
  pulseMul: 1.0,
  glowOpacity: 0.25,
  trailAlpha: 0.06,
  bloomStrength: 0.22,
  dprCap: isIPhone ? 1.5 : Math.max(1, window.devicePixelRatio || 1),
};
const LS_SETTINGS = "viz_settings_v2";

function loadSettings() {
  const raw = localStorage.getItem(LS_SETTINGS);
  if (!raw) return { ...defaultSettings };
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}
function saveSettings(s) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

let settings = loadSettings();

// Visualizer instance
const viz = new Visualizer(document.getElementById("visualizer"), {
  rings: settings.rings,
  barsPerRing: settings.barsPerRing,
  rotationMul: settings.rotationMul,
  pulseMul: settings.pulseMul,
  glowOpacity: settings.glowOpacity,
  trailAlpha: settings.trailAlpha,
  bloomStrength: settings.bloomStrength,
  dprCap: settings.dprCap,
});

// Initialize settings UI
function initSettingsUI() {
  colorModeSel.value = settings.colorMode;
  customColorInp.value = settings.customColor;
  lockPaletteChk.checked = settings.lockPalette;

  ringsRange.value = String(settings.rings);
  barsRange.value = String(settings.barsPerRing);
  rotationRange.value = String(settings.rotationMul);
  pulseRange.value = String(settings.pulseMul);
  glowRange.value = String(settings.glowOpacity);
  trailRange.value = String(settings.trailAlpha);
  bloomRange.value = String(settings.bloomStrength);

  out("rings-val").textContent = settings.rings;
  out("bars-val").textContent = settings.barsPerRing;
  out("rotation-val").textContent = settings.rotationMul.toFixed(1);
  out("pulse-val").textContent = settings.pulseMul.toFixed(2);
  out("glow-val").textContent = settings.glowOpacity.toFixed(2);
  out("trail-val").textContent = settings.trailAlpha.toFixed(2);
  out("bloom-val").textContent = settings.bloomStrength.toFixed(2);

  // Listeners
  colorModeSel.addEventListener("change", () => {
    settings.colorMode = colorModeSel.value;
    applyColorMode();
    saveSettings(settings);
  });
  customColorInp.addEventListener("input", () => {
    settings.customColor = customColorInp.value;
    if (settings.colorMode === "mono") applyColorMode();
    saveSettings(settings);
  });
  lockPaletteChk.addEventListener("change", () => {
    settings.lockPalette = lockPaletteChk.checked;
    saveSettings(settings);
  });

  ringsRange.addEventListener("input", () => {
    settings.rings = Number(ringsRange.value);
    out("rings-val").textContent = settings.rings;
    viz.configure({ rings: settings.rings });
    saveSettings(settings);
  });
  barsRange.addEventListener("input", () => {
    settings.barsPerRing = Number(barsRange.value);
    out("bars-val").textContent = settings.barsPerRing;
    viz.configure({ barsPerRing: settings.barsPerRing });
    saveSettings(settings);
  });
  rotationRange.addEventListener("input", () => {
    settings.rotationMul = Number(rotationRange.value);
    out("rotation-val").textContent = settings.rotationMul.toFixed(1);
    viz.configure({ rotationMul: settings.rotationMul });
    saveSettings(settings);
  });
  pulseRange.addEventListener("input", () => {
    settings.pulseMul = Number(pulseRange.value);
    out("pulse-val").textContent = settings.pulseMul.toFixed(2);
    viz.configure({ pulseMul: settings.pulseMul });
    saveSettings(settings);
  });
  glowRange.addEventListener("input", () => {
    settings.glowOpacity = Number(glowRange.value);
    out("glow-val").textContent = settings.glowOpacity.toFixed(2);
    viz.configure({ glowOpacity: settings.glowOpacity });
    saveSettings(settings);
  });
  trailRange.addEventListener("input", () => {
    settings.trailAlpha = Number(trailRange.value);
    out("trail-val").textContent = settings.trailAlpha.toFixed(2);
    viz.configure({ trailAlpha: settings.trailAlpha });
    saveSettings(settings);
  });
  bloomRange.addEventListener("input", () => {
    settings.bloomStrength = Number(bloomRange.value);
    out("bloom-val").textContent = settings.bloomStrength.toFixed(2);
    viz.configure({ bloomStrength: settings.bloomStrength });
    saveSettings(settings);
  });

  // Presets
  drawer.querySelectorAll(".chip[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-preset");
      applyPreset(p);
    });
  });

  // Drawer controls
  settingsBtn.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // Apply initial color mode
  applyColorMode();
}

function openDrawer() {
  overlay.classList.add("open");
  drawer.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  drawer.setAttribute("aria-hidden", "false");
}
function closeDrawer() {
  overlay.classList.remove("open");
  drawer.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-hidden", "true");
}

function applyPreset(name) {
  const presets = {
    chill: {
      rings: isIPhone ? 2 : 3,
      barsPerRing: isIPhone ? 28 : 40,
      rotationMul: 0.7,
      pulseMul: 0.8,
      glowOpacity: 0.32,
      trailAlpha: 0.08,
      bloomStrength: 0.28,
    },
    energetic: {
      rings: isIPhone ? 3 : 4,
      barsPerRing: isIPhone ? 44 : 64,
      rotationMul: 1.6,
      pulseMul: 1.6,
      glowOpacity: 0.22,
      trailAlpha: 0.04,
      bloomStrength: 0.26,
    },
    minimal: {
      rings: 1,
      barsPerRing: 32,
      rotationMul: 0.9,
      pulseMul: 0.6,
      glowOpacity: 0.18,
      trailAlpha: 0.02,
      bloomStrength: 0.15,
    },
  };
  const p = presets[name];
  if (!p) return;
  Object.assign(settings, p);
  viz.configure(p);

  // Reflect in UI
  ringsRange.value = String(settings.rings);
  barsRange.value = String(settings.barsPerRing);
  rotationRange.value = String(settings.rotationMul);
  pulseRange.value = String(settings.pulseMul);
  glowRange.value = String(settings.glowOpacity);
  trailRange.value = String(settings.trailAlpha);
  bloomRange.value = String(settings.bloomStrength);

  out("rings-val").textContent = settings.rings;
  out("bars-val").textContent = settings.barsPerRing;
  out("rotation-val").textContent = settings.rotationMul.toFixed(1);
  out("pulse-val").textContent = settings.pulseMul.toFixed(2);
  out("glow-val").textContent = settings.glowOpacity.toFixed(2);
  out("trail-val").textContent = settings.trailAlpha.toFixed(2);
  out("bloom-val").textContent = settings.bloomStrength.toFixed(2);

  saveSettings(settings);
}

function applyColorMode() {
  if (settings.colorMode === "album") {
    // keep dynamic; palette updated per-track unless locked
    document.documentElement.style.setProperty("--primary", viz.palette[1] || viz.palette[0] || "#1db954");
  } else if (settings.colorMode === "brand") {
    const brand = ["#1db954", "#1db954", "#ffffff"];
    viz.setPalette(brand);
    document.documentElement.style.setProperty("--primary", brand[0]);
  } else if (settings.colorMode === "mono") {
    const c = settings.customColor || "#1db954";
    viz.setPalette([c, c, "#ffffff"]);
    document.documentElement.style.setProperty("--primary", c);
  }
}

// -------- Config / Redirect URI (Spotify policy compliant) --------
function computeRedirectUri() {
  const u = new URL("./", window.location.href); // current directory with trailing slash
  const isHttps = u.protocol === "https:";
  const host = u.hostname;

  const isLoopback = host === "127.0.0.1" || host === "::1";

  if (isHttps || isLoopback) return u.toString();

  if (host === "localhost" || host === "0.0.0.0") {
    u.hostname = "127.0.0.1";
    return u.toString();
  }
  return u.toString();
}

const REDIRECT_URI = computeRedirectUri();
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

function status(msg) {
  console.log("[status]", msg);
  statusEl.textContent = msg;
}

if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === "YOUR_SPOTIFY_CLIENT_ID") {
  status("Set your Spotify Client ID in config.js (copy config.example.js).");
} else {
  const url = new URL(REDIRECT_URI);
  const isHttp = url.protocol === "http:";
  const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (isHttp && !isLoopback) {
    status("Warning: Spotify requires HTTPS for non-loopback redirect URIs. Use 127.0.0.1 or enable HTTPS.");
  }
}

// -------- Auth (PKCE) --------
const LS_KEY = "sp_auth";
const VERIFIER_KEY = "sp_verifier";

function randomString(length = 64) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let s = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) s += possible[arr[i] % possible.length];
  return s;
}
async function sha256(buffer) {
  const data = new TextEncoder().encode(buffer);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function saveTokens(tokens) {
  const now = Math.floor(Date.now() / 1000);
  const data = {
    ...tokens,
    expires_at: now + (tokens.expires_in || 3600) - 30,
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  return data;
}
function getTokens() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function clearTokens() {
  localStorage.removeItem(LS_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}

async function ensureAccessToken() {
  let tok = getTokens();
  if (tok && tok.expires_at > Math.floor(Date.now() / 1000)) return tok.access_token;

  if (tok && tok.refresh_token) {
    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", tok.refresh_token);

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      clearTokens();
      throw new Error("Failed to refresh token");
    }
    const data = await res.json();
    tok = saveTokens({ ...tok, ...data, refresh_token: data.refresh_token || tok.refresh_token });
    return tok.access_token;
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem("pkce_state");
  if (code) {
    if (storedState && state !== storedState) {
      throw new Error("State mismatch; aborting auth.");
    }
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("Missing PKCE verifier");

    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", REDIRECT_URI);
    params.set("code_verifier", verifier);

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      throw new Error("Token exchange failed");
    }
    const data = await res.json();
    saveTokens(data);

    window.history.replaceState({}, document.title, new URL("./", window.location.href).toString());
    return data.access_token;
  }

  return null;
}

async function login() {
  const verifier = randomString(96);
  const challenge = await sha256(verifier);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem("pkce_state", state);

  const params = new URLSearchParams();
  params.set("client_id", SPOTIFY_CLIENT_ID);
  params.set("response_type", "code");
  params.set("redirect_uri", REDIRECT_URI);
  params.set("code_challenge_method", "S256");
  params.set("code_challenge", challenge);
  params.set("state", state);
  params.set("scope", SCOPES);

  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

function logout() {
  clearTokens();
  location.reload();
}

// Attach auth button handlers immediately so login works before SDK/token.
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

// -------- Spotify APIs --------
async function api(path, init = {}) {
  const token = await ensureAccessToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

async function getMe() { return api("/me"); }
async function transferPlayback(device_id, play = false) {
  return api(`/me/player`, { method: "PUT", body: JSON.stringify({ device_ids: [device_id], play }) });
}
async function startResumePlayback(body = undefined) {
  return api(`/me/player/play`, { method: "PUT", body: body ? JSON.stringify(body) : null });
}
async function pausePlayback() { return api(`/me/player/pause`, { method: "PUT" }); }
async function getAudioFeatures(trackId) { return api(`/audio-features/${trackId}`); }

// -------- Player SDK --------
let player;
let deviceId = null;
let isPlaying = false;
let currentState = null;
let sdkReadyResolve;
const spotifySDKReady = new Promise((res) => (sdkReadyResolve = res));
window.onSpotifyWebPlaybackSDKReady = () => sdkReadyResolve();

function msToTime(ms) {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

async function init() {
  try {
    const token = await ensureAccessToken();
    updateAuthUI(!!token);

    if (!token) {
      status("Please log in with Spotify.");
      viz.start();
      initSettingsUI();
      return;
    }

    // Show user info
    const me = await getMe().catch((e) => {
      console.warn(e);
      return null;
    });
    if (me) {
      userSection.hidden = false;
      userName.textContent = me.display_name || me.id;
      userProduct.textContent = (me.product || "").toUpperCase();
      userAvatar.src = me.images?.[0]?.url || "https://avatars.githubusercontent.com/u/9919?s=32&v=4";
      userAvatar.alt = me.display_name || me.id;
      if (me.product !== "premium") {
        status("Note: In-browser playback requires Spotify Premium. You can still log in and see the visualizer adapt to album covers if playback happens on another device.");
      }
    }

    await spotifySDKReady;

    player = new Spotify.Player({
      name: "Album Color Visualizer",
      getOAuthToken: async (cb) => {
        const t = await ensureAccessToken();
        cb(t);
      },
      volume: 0.5,
    });

    player.addListener("ready", async ({ device_id }) => {
      deviceId = device_id;
      status(`Player ready on device ${device_id}. Transferring playback...`);
      playerSection.hidden = false;

      try {
        await transferPlayback(device_id, false);
        status(`Playback transferred. Press Play to start or control from any Spotify app.`);
      } catch (e) {
        console.warn(e);
        status(`Playback transfer failed. Open Spotify on any device, then press Play here.`);
      }
    });

    player.addListener("not_ready", ({ device_id }) => {
      status(`Device ${device_id} went offline.`);
    });

    player.addListener("initialization_error", ({ message }) => console.error(message));
    player.addListener("authentication_error", ({ message }) => console.error(message));
    player.addListener("account_error", ({ message }) => {
      status("Account error: " + message);
    });

    player.addListener("player_state_changed", onPlayerState);

    const connected = await player.connect();
    if (!connected) {
      status("Failed to connect Spotify player.");
      viz.start();
      initSettingsUI();
      return;
    }

    bindPlayerControls();

    viz.start();
    initSettingsUI();
  } catch (e) {
    console.error(e);
    status(e.message || "Error initializing app");
    viz.start();
    initSettingsUI();
  }
}

function bindPlayerControls() {
  playBtn.addEventListener("click", async () => {
    try {
      await player.togglePlay();
    } catch {
      if (isPlaying) await pausePlayback();
      else await startResumePlayback();
    }
  });

  prevBtn.addEventListener("click", () => player.previousTrack());
  nextBtn.addEventListener("click", () => player.nextTrack());

  seek.addEventListener("input", () => {
    const pos = Number(seek.value) / 1000;
    if (currentState?.duration) {
      elapsed.textContent = msToTime(currentState.duration * pos);
    }
  });
  seek.addEventListener("change", async () => {
    if (!currentState?.duration) return;
    const posMs = Math.floor(currentState.duration * (Number(seek.value) / 1000));
    try {
      await player.seek(posMs);
    } catch (e) {
      console.warn(e);
    }
  });

  volumeSlider.addEventListener("input", async () => {
    const vol = Number(volumeSlider.value) / 100;
    try {
      await player.setVolume(vol);
    } catch (e) {
      console.warn(e);
    }
  });
}

function updateAuthUI(isAuthed) {
  loginBtn.hidden = !!isAuthed;
  logoutBtn.hidden = !isAuthed;
}

async function onPlayerState(state) {
  if (!state) return;
  currentState = {
    position: state.position,
    duration: state.duration,
    paused: state.paused,
    track: state.track_window?.current_track || null,
  };
  isPlaying = !state.paused;

  playBtn.textContent = isPlaying ? "⏸" : "▶️";
  elapsed.textContent = msToTime(state.position);
  duration.textContent = msToTime(state.duration);
  seek.value = state.duration ? Math.floor((state.position / state.duration) * 1000) : 0;

  const track = currentState.track;
  if (track) {
    trackName.textContent = track.name || "—";
    trackArtist.textContent = (track.artists || []).map((a) => a.name).join(", ") || "—";
    trackAlbum.textContent = track.album?.name || "—";
    const img = (track.album?.images || []).find((i) => i.width >= 300) || track.album?.images?.[0];
    const imgUrl = img?.url || "";
    if (imgUrl) {
      albumArt.src = imgUrl;
      if (!settings.lockPalette && settings.colorMode === "album") {
        updatePaletteFromImage(imgUrl).catch(console.warn);
      }
    }

    try {
      const id = (track.uri || "").split(":").pop();
      if (id) {
        const feat = await getAudioFeatures(id);
        if (feat?.tempo) viz.setTempo(feat.tempo);
        if (typeof feat?.energy === "number") viz.setEnergy(feat.energy);
      }
    } catch (e) {
      console.warn("Audio features failed", e);
    }
  }
}

// Palette extraction
async function updatePaletteFromImage(url) {
  const img = await loadImage(url);
  const colors = extractPalette(img, 5);
  if (settings.colorMode === "album" && !settings.lockPalette) {
    viz.setPalette(colors);
    document.documentElement.style.setProperty("--primary", colors[1] || colors[0] || "#1db954");
  }
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function extractPalette(image, maxColors = 5) {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = Math.min(240, image.naturalWidth || image.width));
  const h = (canvas.height = Math.min(240, image.naturalHeight || image.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const buckets = new Map();
  const step = 4 * 4;
  for (let i = 0; i < data.length; i += step) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma <= 30) continue;
    const rq = r & 0xF0, gq = g & 0xF0, bq = b & 0xF0;
    const key = (rq << 16) | (gq << 8) | bq;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors + 2);
  const colors = top.map(([key]) => {
    const r = (key >> 16) & 0xFF;
    const g = (key >> 8) & 0xFF;
    const b = key & 0xFF;
    return "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("");
  });

  const withLuma = colors.map(c => ({ c, l: hexLuma(c) }));
  withLuma.sort((a, b) => a.l - b.l);
  const ordered = [
    withLuma[0]?.c,
    withLuma[Math.floor(withLuma.length * 0.66)]?.c || withLuma.at(-1)?.c,
    withLuma.at(-1)?.c,
    ...withLuma.slice(1, -1).map(x => x.c),
  ].filter(Boolean);

  const uniq = [...new Set(ordered)];
  return uniq.slice(0, maxColors);
}
function hexLuma(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Kick off
init();