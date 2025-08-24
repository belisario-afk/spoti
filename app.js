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
const snapshotBtn = $("#snapshot-btn");

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
const vizModeSel = $("#viz-mode");
const vizPresetsRow = $("#viz-presets");
const themePresetsRow = $("#theme-presets");

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

const autoCycleChk = $("#auto-cycle");
const cycleMinRange = $("#cycle-min");
const out = (id) => drawer.querySelector(`[data-out="${id}"]`);

// -------- Device detection --------
const ua = navigator.userAgent || "";
const isIPhone = /\biPhone\b/.test(ua) || (/\bCPU iPhone OS\b/.test(ua) && /\bMobile\b/.test(ua));
if (isIPhone) document.documentElement.classList.add("iphone");

// -------- Themes & Presets --------
const THEMES = {
  neon: { name: "Neon City", palette: ["#00f5d4", "#00bbf9", "#fee440", "#f15bb5"] },
  cyber: { name: "Cyberpunk", palette: ["#ff2a6d", "#05d9e8", "#005678", "#f9c80e"] },
  vapor: { name: "Vaporwave", palette: ["#ff9de2", "#79e9f3", "#a07dfb", "#ffd6a5"] },
  sunset: { name: "Sunset", palette: ["#ff6b6b", "#f7b267", "#ffd166", "#06d6a0"] },
  aurora: { name: "Aurora", palette: ["#74c69d", "#52b788", "#40916c", "#d8f3dc"] },
  matrix: { name: "Matrix", palette: ["#00ff41", "#00b32a", "#005f15", "#a8ffb7"] },
  candy: { name: "Candy", palette: ["#ff95c5", "#ff85a1", "#fbb1bd", "#9bf6ff"] },
  ocean: { name: "Ocean", palette: ["#00a5cf", "#00d1ff", "#0077b6", "#caf0f8"] },
  fire: { name: "Firestorm", palette: ["#ff5400", "#ffbd00", "#ff0054", "#ffd166"] },
  monoDark: { name: "Mono Dark", palette: ["#1f2937", "#4b5563", "#9ca3af", "#e5e7eb"] },
};

const VIZ_PRESETS = [
  { name: "Neon Rings", scene: "Radiant Rings", theme: "neon", cfg: { rings: 4, barsPerRing: 80, trailAlpha: 0.07, rotationMul: 1.2, pulseMul: 1.2, bloomStrength: 0.26 } },
  { name: "Particle Storm", scene: "Particle Burst", theme: "cyber", cfg: { trailAlpha: 0.05, glowOpacity: 0.22, bloomStrength: 0.22 } },
  { name: "Flow Drift", scene: "Flow Field", theme: "aurora", cfg: { trailAlpha: 0.04, glowOpacity: 0.14, bloomStrength: 0.18 } },
  { name: "Spectrum Halo", scene: "Spectrum Waves", theme: "sunset", cfg: { rings: 3, barsPerRing: 64, trailAlpha: 0.06, rotationMul: 0.9, pulseMul: 1.0 } },
  { name: "Floating Covers", scene: "Floating Covers", theme: "vapor", cfg: { trailAlpha: 0.02, glowOpacity: 0.26, bloomStrength: 0.24 } },
  { name: "Aurora Veil", scene: "Aurora Ribbons", theme: "ocean", cfg: { trailAlpha: 0.03, glowOpacity: 0.18, bloomStrength: 0.22 } },
];

// -------- Visualizer --------
const defaultSettings = {
  colorMode: "album", // album | theme | mono
  themeKey: "neon",
  customColor: "#1db954",
  lockPalette: false,

  rings: isIPhone ? 2 : 3,
  barsPerRing: isIPhone ? 40 : 56,
  rotationMul: 1.0,
  pulseMul: 1.0,
  glowOpacity: 0.25,
  trailAlpha: 0.06,
  bloomStrength: 0.22,
  dprCap: isIPhone ? 1.5 : Math.max(1, window.devicePixelRatio || 1),

  scene: "Radiant Rings",
  autoCycle: false,
  cycleMin: 3,
};
const LS_SETTINGS = "viz_settings_v3";

function loadSettings() {
  const raw = localStorage.getItem(LS_SETTINGS);
  if (!raw) return { ...defaultSettings };
  try { return { ...defaultSettings, ...JSON.parse(raw) }; } catch { return { ...defaultSettings }; }
}
function saveSettings(s) { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }

let settings = loadSettings();

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

// Apply theme/palette mode
function applyColorMode() {
  if (settings.colorMode === "album") {
    document.documentElement.style.setProperty("--primary", viz.palette[1] || viz.palette[0] || "#1db954");
  } else if (settings.colorMode === "theme") {
    const theme = THEMES[settings.themeKey] || THEMES.neon;
    viz.setPalette(theme.palette);
    document.documentElement.style.setProperty("--primary", theme.palette[0]);
  } else if (settings.colorMode === "mono") {
    const c = settings.customColor || "#1db954";
    viz.setPalette([c, c, "#ffffff"]);
    document.documentElement.style.setProperty("--primary", c);
  }
}

// Scene switching
function setScene(name) {
  settings.scene = name;
  viz.setScene(name);
  saveSettings(settings);
  // update UI
  vizModeSel.value = name;
  [...vizPresetsRow.querySelectorAll(".chip")].forEach(ch => ch.classList.remove("active"));
}

// Build UI dynamically
function initSettingsUI() {
  // Mode options
  vizModeSel.innerHTML = "";
  for (const name of viz.getScenes()) {
    const o = document.createElement("option");
    o.value = o.textContent = name;
    vizModeSel.appendChild(o);
  }
  vizModeSel.value = settings.scene;
  vizModeSel.addEventListener("change", () => setScene(vizModeSel.value));

  // Visual presets
  vizPresetsRow.innerHTML = "";
  VIZ_PRESETS.forEach(p => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = p.name;
    btn.addEventListener("click", () => {
      // Theme
      settings.themeKey = p.theme;
      settings.colorMode = "theme";
      applyColorMode();
      // Config
      Object.assign(settings, p.cfg);
      viz.configure(p.cfg);
      // Scene
      setScene(p.scene);
      // Reflect values
      colorModeSel.value = settings.colorMode;
      ringsRange.value = String(settings.rings);
      barsRange.value = String(settings.barsPerRing);
      rotationRange.value = String(settings.rotationMul);
      pulseRange.value = String(settings.pulseMul);
      glowRange.value = String(settings.glowOpacity);
      trailRange.value = String(settings.trailAlpha);
      bloomRange.value = String(settings.bloomStrength);
      updateOuts();
      // Theme UI
      [...themePresetsRow.querySelectorAll(".chip")].forEach(ch => ch.classList.toggle("active", ch.dataset.key === settings.themeKey));
      saveSettings(settings);
    });
    vizPresetsRow.appendChild(btn);
  });

  // Theme presets
  themePresetsRow.innerHTML = "";
  Object.entries(THEMES).forEach(([key, th]) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = th.name;
    btn.dataset.key = key;
    btn.addEventListener("click", () => {
      settings.themeKey = key;
      settings.colorMode = "theme";
      applyColorMode();
      colorModeSel.value = settings.colorMode;
      [...themePresetsRow.querySelectorAll(".chip")].forEach(ch => ch.classList.toggle("active", ch.dataset.key === key));
      saveSettings(settings);
    });
    themePresetsRow.appendChild(btn);
  });
  [...themePresetsRow.querySelectorAll(".chip")].forEach(ch => ch.classList.toggle("active", ch.dataset.key === settings.themeKey));

  // Color section
  colorModeSel.value = settings.colorMode;
  customColorInp.value = settings.customColor;
  lockPaletteChk.checked = settings.lockPalette;

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

  // Motion + Look
  ringsRange.value = String(settings.rings);
  barsRange.value = String(settings.barsPerRing);
  rotationRange.value = String(settings.rotationMul);
  pulseRange.value = String(settings.pulseMul);
  glowRange.value = String(settings.glowOpacity);
  trailRange.value = String(settings.trailAlpha);
  bloomRange.value = String(settings.bloomStrength);

  ringsRange.addEventListener("input", () => { settings.rings = Number(ringsRange.value); viz.configure({ rings: settings.rings }); out("rings-val").textContent = settings.rings; saveSettings(settings); });
  barsRange.addEventListener("input", () => { settings.barsPerRing = Number(barsRange.value); viz.configure({ barsPerRing: settings.barsPerRing }); out("bars-val").textContent = settings.barsPerRing; saveSettings(settings); });
  rotationRange.addEventListener("input", () => { settings.rotationMul = Number(rotationRange.value); viz.configure({ rotationMul: settings.rotationMul }); out("rotation-val").textContent = settings.rotationMul.toFixed(1); saveSettings(settings); });
  pulseRange.addEventListener("input", () => { settings.pulseMul = Number(pulseRange.value); viz.configure({ pulseMul: settings.pulseMul }); out("pulse-val").textContent = settings.pulseMul.toFixed(2); saveSettings(settings); });
  glowRange.addEventListener("input", () => { settings.glowOpacity = Number(glowRange.value); viz.configure({ glowOpacity: settings.glowOpacity }); out("glow-val").textContent = settings.glowOpacity.toFixed(2); saveSettings(settings); });
  trailRange.addEventListener("input", () => { settings.trailAlpha = Number(trailRange.value); viz.configure({ trailAlpha: settings.trailAlpha }); out("trail-val").textContent = settings.trailAlpha.toFixed(2); saveSettings(settings); });
  bloomRange.addEventListener("input", () => { settings.bloomStrength = Number(bloomRange.value); viz.configure({ bloomStrength: settings.bloomStrength }); out("bloom-val").textContent = settings.bloomStrength.toFixed(2); saveSettings(settings); });

  // Automation
  autoCycleChk.checked = settings.autoCycle;
  cycleMinRange.value = String(settings.cycleMin);
  autoCycleChk.addEventListener("change", () => { settings.autoCycle = autoCycleChk.checked; scheduleAutoCycle(); saveSettings(settings); });
  cycleMinRange.addEventListener("input", () => { settings.cycleMin = Number(cycleMinRange.value); out("cycle-val").textContent = settings.cycleMin.toFixed(1); scheduleAutoCycle(); saveSettings(settings); });

  updateOuts();

  // Drawer controls
  settingsBtn.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  // Snapshot
  snapshotBtn.addEventListener("click", snapshot);
}

function updateOuts() {
  out("rings-val").textContent = settings.rings;
  out("bars-val").textContent = settings.barsPerRing;
  out("rotation-val").textContent = settings.rotationMul.toFixed(1);
  out("pulse-val").textContent = settings.pulseMul.toFixed(2);
  out("glow-val").textContent = settings.glowOpacity.toFixed(2);
  out("trail-val").textContent = settings.trailAlpha.toFixed(2);
  out("bloom-val").textContent = settings.bloomStrength.toFixed(2);
  out("cycle-val").textContent = settings.cycleMin.toFixed(1);
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

function snapshot() {
  // Downloads a PNG snapshot of the current canvas
  const link = document.createElement("a");
  link.download = `visualizer-${Date.now()}.png`;
  link.href = document.getElementById("visualizer").toDataURL("image/png");
  link.click();
}

// -------- Config / Redirect URI (Spotify policy compliant) --------
function computeRedirectUri() {
  const u = new URL("./", window.location.href);
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
  "user-read-recently-played", // for floating covers
].join(" ");

// -------- Status helper --------
function status(msg) { console.log("[status]", msg); statusEl.textContent = msg; }

// -------- Auth (PKCE) --------
const LS_KEY = "sp_auth";
const VERIFIER_KEY = "sp_verifier";
function randomString(length = 64) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let s = ""; const arr = new Uint8Array(length); crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) s += possible[arr[i] % possible.length];
  return s;
}
async function sha256(buffer) {
  const data = new TextEncoder().encode(buffer);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function saveTokens(tokens) {
  const now = Math.floor(Date.now() / 1000);
  const data = { ...tokens, expires_at: now + (tokens.expires_in || 3600) - 30 };
  localStorage.setItem(LS_KEY, JSON.stringify(data)); return data;
}
function getTokens() { const raw = localStorage.getItem(LS_KEY); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } }
function clearTokens() { localStorage.removeItem(LS_KEY); sessionStorage.removeItem(VERIFIER_KEY); }

async function ensureAccessToken() {
  let tok = getTokens();
  if (tok && tok.expires_at > Math.floor(Date.now() / 1000)) return tok.access_token;

  if (tok && tok.refresh_token) {
    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", tok.refresh_token);
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(),
    });
    if (!res.ok) { clearTokens(); throw new Error("Failed to refresh token"); }
    const data = await res.json();
    tok = saveTokens({ ...tok, ...data, refresh_token: data.refresh_token || tok.refresh_token });
    return tok.access_token;
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem("pkce_state");
  if (code) {
    if (storedState && state !== storedState) throw new Error("State mismatch; aborting auth.");
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("Missing PKCE verifier");
    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", REDIRECT_URI);
    params.set("code_verifier", verifier);
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(),
    });
    if (!res.ok) throw new Error("Token exchange failed");
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
function logout() { clearTokens(); location.reload(); }
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
  if (!res.ok) { const body = await res.text().catch(() => ""); throw new Error(`API ${res.status}: ${body || res.statusText}`); }
  return res.json();
}
const getMe = () => api("/me");
const transferPlayback = (device_id, play = false) => api(`/me/player`, { method: "PUT", body: JSON.stringify({ device_ids: [device_id], play }) });
const startResumePlayback = (body = undefined) => api(`/me/player/play`, { method: "PUT", body: body ? JSON.stringify(body) : null });
const pausePlayback = () => api(`/me/player/pause`, { method: "PUT" });
const getAudioFeatures = (trackId) => api(`/audio-features/${trackId}`);
const getRecentlyPlayed = (limit = 20) => api(`/me/player/recently-played?limit=${limit}`);

// -------- Player SDK --------
let player;
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

// -------- Covers (for Floating Covers) --------
let coverUrls = [];
async function refreshCovers(currentTrack) {
  try {
    const urls = new Set();
    if (currentTrack?.album?.images?.length) {
      currentTrack.album.images.forEach(i => urls.add(i.url));
    }
    const recent = await getRecentlyPlayed().catch(() => null);
    if (recent?.items?.length) {
      recent.items.forEach(it => {
        const imgs = it.track?.album?.images || [];
        imgs.forEach(i => urls.add(i.url));
      });
    }
    coverUrls = [...urls].slice(0, 24);
    await viz.setAlbumImages(coverUrls);
  } catch (e) {
    console.warn("Covers fetch failed", e);
  }
}

// -------- Auto-cycle --------
let cycleTimer = null;
function scheduleAutoCycle() {
  if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
  if (!settings.autoCycle) return;
  const ms = Math.max(0.5, settings.cycleMin) * 60 * 1000;
  cycleTimer = setInterval(() => {
    const scenes = viz.getScenes();
    const idx = Math.max(0, scenes.indexOf(settings.scene));
    const next = scenes[(idx + 1) % scenes.length];
    setScene(next);
  }, ms);
}

// -------- Init --------
function status(msg) { console.log("[status]", msg); statusEl.textContent = msg; }

async function init() {
  try {
    // Start viz + settings UI immediately
    viz.start();
    initSettingsUI();
    applyColorMode();
    setScene(settings.scene);
    scheduleAutoCycle();

    const token = await ensureAccessToken();
    updateAuthUI(!!token);

    if (!token) {
      status("Please log in with Spotify.");
      return;
    }

    const me = await getMe().catch((e) => { console.warn(e); return null; });
    if (me) {
      userSection.hidden = false;
      userName.textContent = me.display_name || me.id;
      userProduct.textContent = (me.product || "").toUpperCase();
      userAvatar.src = me.images?.[0]?.url || "https://avatars.githubusercontent.com/u/9919?s=32&v=4";
      userAvatar.alt = me.display_name || me.id;
      if (me.product !== "premium") {
        status("Note: In-browser playback requires Spotify Premium. You can still log in and see visuals adapt to album covers if playback happens on another device.");
      }
    }

    await spotifySDKReady;

    player = new Spotify.Player({
      name: "Ultra Visualizer",
      getOAuthToken: async (cb) => { const t = await ensureAccessToken(); cb(t); },
      volume: 0.5,
    });

    player.addListener("ready", async ({ device_id }) => {
      status(`Player ready. Device ${device_id}`);
      playerSection.hidden = false;
      try {
        await transferPlayback(device_id, false);
        status("Playback transferred. Press Play or use any Spotify app.");
      } catch (e) {
        console.warn(e);
        status("Playback transfer failed. Open Spotify somewhere, then press Play here.");
      }
    });

    player.addListener("not_ready", ({ device_id }) => { status(`Device ${device_id} went offline.`); });
    player.addListener("initialization_error", ({ message }) => console.error(message));
    player.addListener("authentication_error", ({ message }) => console.error(message));
    player.addListener("account_error", ({ message }) => { status("Account error: " + message); });

    player.addListener("player_state_changed", onPlayerState);

    const connected = await player.connect();
    if (!connected) { status("Failed to connect Spotify player."); return; }

    bindPlayerControls();
  } catch (e) {
    console.error(e);
    status(e.message || "Error initializing app");
  }
}

function bindPlayerControls() {
  playBtn.addEventListener("click", async () => {
    try { await player.togglePlay(); }
    catch { if (isPlaying) await pausePlayback(); else await startResumePlayback(); }
  });
  prevBtn.addEventListener("click", () => player.previousTrack());
  nextBtn.addEventListener("click", () => player.nextTrack());

  seek.addEventListener("input", () => {
    const pos = Number(seek.value) / 1000;
    if (currentState?.duration) { elapsed.textContent = msToTime(currentState.duration * pos); }
  });
  seek.addEventListener("change", async () => {
    if (!currentState?.duration) return;
    const posMs = Math.floor(currentState.duration * (Number(seek.value) / 1000));
    try { await player.seek(posMs); } catch (e) { console.warn(e); }
  });

  volumeSlider.addEventListener("input", async () => {
    const vol = Number(volumeSlider.value) / 100;
    try { await player.setVolume(vol); } catch (e) { console.warn(e); }
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
    // Audio features
    try {
      const id = (track.uri || "").split(":").pop();
      if (id) {
        const feat = await getAudioFeatures(id);
        if (feat?.tempo) viz.setTempo(feat.tempo);
        if (typeof feat?.energy === "number") viz.setEnergy(feat.energy);
      }
    } catch (e) { console.warn("Audio features failed", e); }

    // Covers
    refreshCovers(track).catch(() => {});
  }
}

// Palette extraction
async function updatePaletteFromImage(url) {
  const img = await loadImage(url);
  const colors = extractPalette(img, 6);
  viz.setPalette(colors);
  if (settings.colorMode === "album") {
    document.documentElement.style.setProperty("--primary", colors[1] || colors[0] || "#1db954");
  }
}
function loadImage(src) { return new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = src; }); }
function extractPalette(image, maxColors = 6) {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = Math.min(320, image.naturalWidth || image.width));
  const h = (canvas.height = Math.min(320, image.naturalHeight || image.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const buckets = new Map();
  const step = 4 * 3;
  for (let i = 0; i < data.length; i += step) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l <= 25) continue;
    const rq = r & 0xF0, gq = g & 0xF0, bq = b & 0xF0;
    const key = (rq << 16) | (gq << 8) | bq;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors + 2);
  const colors = top.map(([key]) => {
    const r = (key >> 16) & 0xFF, g = (key >> 8) & 0xFF, b = key & 0xFF;
    return "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("");
  });
  const withLuma = colors.map(c => ({ c, l: hexLuma(c) })).sort((a, b) => a.l - b.l);
  const ordered = [
    withLuma[0]?.c, withLuma[Math.floor(withLuma.length * 0.66)]?.c || withLuma.at(-1)?.c, withLuma.at(-1)?.c,
    ...withLuma.slice(1, -1).map(x => x.c),
  ].filter(Boolean);
  return [...new Set(ordered)].slice(0, maxColors);
}
function hexLuma(hex) {
  let c = hex.replace("#", ""); if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Kick off
init();