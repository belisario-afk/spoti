// NOTE: We intentionally do NOT import config.js as a module.
// We read the client id from window.SPOTIFY_CLIENT_ID so the app still works on GitHub Pages
// even if a module import would fail. Visualizer remains an ES module import.
import { Visualizer, THEMES } from "./visualizer.js";

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

// Settings controls (may be missing if HTML not updated yet)
const vizModeSel = $("#viz-mode");
const themeSel = $("#theme");
const customColorInp = $("#custom-color");
const customColorField = $("#custom-color-field");
const lockPaletteChk = $("#lock-palette");

const ringsRange = $("#rings");
const barsRange = $("#bars");
const particlesCount = $("#particles-count");
const particleSize = $("#particle-size");
const nodesRange = $("#nodes");
const linkDistRange = $("#link-distance");
const tunnelDensity = $("#tunnel-density");
const tunnelTwist = $("#tunnel-twist");
const coversCount = $("#covers-count");
const coverSize = $("#cover-size");

const complexityRange = $("#complexity");
const rotationRange = $("#rotation");
const pulseRange = $("#pulse");
const glowRange = $("#glow");
const trailRange = $("#trail");
const bloomRange = $("#bloom");
const out = (id) => (drawer ? drawer.querySelector(`[data-out="${id}"]`) : null);

// -------- Helpers --------
function status(msg) {
  console.log("[status]", msg);
  if (statusEl) statusEl.textContent = msg;
}

// Attach auth handlers immediately so login works even if later code fails.
function safeBind(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}

// -------- Device detection --------
const ua = navigator.userAgent || "";
const isIPhone = /\biPhone\b/.test(ua) || (/\bCPU iPhone OS\b/.test(ua) && /\bMobile\b/.test(ua));
if (isIPhone) document.documentElement.classList.add("iphone");

// -------- Visualizer defaults --------
const defaultSettings = {
  mode: "rings",
  theme: "album",
  customColor: "#1db954",
  lockPalette: false,

  complexity: isIPhone ? 0.8 : 1.0,
  rotationMul: 1.0,
  pulseMul: 1.0,
  glowOpacity: 0.25,
  trailAlpha: 0.06,
  bloomStrength: 0.24,
  dprCap: isIPhone ? 1.5 : Math.max(1, window.devicePixelRatio || 1),

  rings: isIPhone ? 3 : 4,
  barsPerRing: isIPhone ? 44 : 64,

  numParticles: isIPhone ? 220 : 360,
  particleSize: 1.4,

  numNodes: isIPhone ? 36 : 64,
  linkDistance: 160,

  tunnelDensity: isIPhone ? 36 : 50,
  tunnelTwist: 0.6,

  numCovers: isIPhone ? 9 : 16,
  coverMaxSize: isIPhone ? 120 : 160,
};
const LS_SETTINGS = "viz_settings_v3";

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}
function saveSettings(s) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch {}
}
let settings = loadSettings();

// Visualizer instance
const viz = new Visualizer(document.getElementById("visualizer"), {
  mode: settings.mode,
  rotationMul: settings.rotationMul,
  pulseMul: settings.pulseMul,
  glowOpacity: settings.glowOpacity,
  trailAlpha: settings.trailAlpha,
  bloomStrength: settings.bloomStrength,
  dprCap: settings.dprCap,
  complexity: settings.complexity,
});
viz.configure({
  rings: settings.rings,
  barsPerRing: settings.barsPerRing,
  numParticles: settings.numParticles,
  particleSize: settings.particleSize,
  numNodes: settings.numNodes,
  linkDistance: settings.linkDistance,
  tunnelDensity: settings.tunnelDensity,
  tunnelTwist: settings.tunnelTwist,
  numCovers: settings.numCovers,
  coverMaxSize: settings.coverMaxSize,
});
viz.setTheme(settings.theme, null);
viz.setCustomMono(settings.customColor);

// -------- Settings UI init (runs only if the elements exist) --------
function switchModeSection(mode) {
  document.querySelectorAll(".mode-section").forEach((sec) => {
    if (sec.getAttribute("data-mode") === mode) sec.classList.add("active");
    else sec.classList.remove("active");
  });
}
function initSettingsUI() {
  if (!drawer) return; // No settings UI present; skip

  if (vizModeSel) vizModeSel.value = settings.mode;
  if (themeSel) themeSel.value = settings.theme;
  if (customColorInp) customColorInp.value = settings.customColor;
  if (customColorField) customColorField.hidden = settings.theme !== "mono";
  if (lockPaletteChk) lockPaletteChk.checked = settings.lockPalette;

  const setOut = (k, v) => {
    const o = out(k);
    if (o) o.textContent = v;
  };

  // Global
  if (complexityRange) complexityRange.value = String(settings.complexity);
  if (rotationRange) rotationRange.value = String(settings.rotationMul);
  if (pulseRange) pulseRange.value = String(settings.pulseMul);
  if (glowRange) glowRange.value = String(settings.glowOpacity);
  if (trailRange) trailRange.value = String(settings.trailAlpha);
  if (bloomRange) bloomRange.value = String(settings.bloomStrength);
  setOut("complexity-val", settings.complexity.toFixed(1));
  setOut("rotation-val", settings.rotationMul.toFixed(1));
  setOut("pulse-val", settings.pulseMul.toFixed(2));
  setOut("glow-val", settings.glowOpacity.toFixed(2));
  setOut("trail-val", settings.trailAlpha.toFixed(2));
  setOut("bloom-val", settings.bloomStrength.toFixed(2));

  // Rings
  if (ringsRange) ringsRange.value = String(settings.rings);
  if (barsRange) barsRange.value = String(settings.barsPerRing);
  setOut("rings-val", settings.rings);
  setOut("bars-val", settings.barsPerRing);

  // Particles
  if (particlesCount) particlesCount.value = String(settings.numParticles);
  if (particleSize) particleSize.value = String(settings.particleSize);
  setOut("particles-val", settings.numParticles);
  setOut("particle-size-val", settings.particleSize.toFixed(1));

  // Orbit
  if (nodesRange) nodesRange.value = String(settings.numNodes);
  if (linkDistRange) linkDistRange.value = String(settings.linkDistance);
  setOut("nodes-val", settings.numNodes);
  setOut("link-val", settings.linkDistance);

  // Tunnel
  if (tunnelDensity) tunnelDensity.value = String(settings.tunnelDensity);
  if (tunnelTwist) tunnelTwist.value = String(settings.tunnelTwist);
  setOut("tunnel-val", settings.tunnelDensity);
  setOut("twist-val", settings.tunnelTwist.toFixed(2));

  // Covers
  if (coversCount) coversCount.value = String(settings.numCovers);
  if (coverSize) coverSize.value = String(settings.coverMaxSize);
  setOut("covers-val", settings.numCovers);
  setOut("cover-size-val", settings.coverMaxSize);

  switchModeSection(settings.mode);

  // Listeners: mode & theme
  safeBind(vizModeSel, "change", () => {
    settings.mode = vizModeSel.value;
    viz.setMode(settings.mode);
    switchModeSection(settings.mode);
    saveSettings(settings);
  });
  safeBind(themeSel, "change", () => {
    settings.theme = themeSel.value;
    if (customColorField) customColorField.hidden = settings.theme !== "mono";
    applyTheme();
    saveSettings(settings);
  });
  safeBind(customColorInp, "input", () => {
    settings.customColor = customColorInp.value;
    viz.setCustomMono(settings.customColor);
    if (settings.theme === "mono") applyTheme();
    saveSettings(settings);
  });
  safeBind(lockPaletteChk, "change", () => {
    settings.lockPalette = lockPaletteChk.checked;
    saveSettings(settings);
  });

  // Global sliders
  safeBind(complexityRange, "input", () => {
    settings.complexity = Number(complexityRange.value);
    setOut("complexity-val", settings.complexity.toFixed(1));
    viz.configure({ complexity: settings.complexity });
    saveSettings(settings);
  });
  safeBind(rotationRange, "input", () => {
    settings.rotationMul = Number(rotationRange.value);
    setOut("rotation-val", settings.rotationMul.toFixed(1));
    viz.configure({ rotationMul: settings.rotationMul });
    saveSettings(settings);
  });
  safeBind(pulseRange, "input", () => {
    settings.pulseMul = Number(pulseRange.value);
    setOut("pulse-val", settings.pulseMul.toFixed(2));
    viz.configure({ pulseMul: settings.pulseMul });
    saveSettings(settings);
  });
  safeBind(glowRange, "input", () => {
    settings.glowOpacity = Number(glowRange.value);
    setOut("glow-val", settings.glowOpacity.toFixed(2));
    viz.configure({ glowOpacity: settings.glowOpacity });
    saveSettings(settings);
  });
  safeBind(trailRange, "input", () => {
    settings.trailAlpha = Number(trailRange.value);
    setOut("trail-val", settings.trailAlpha.toFixed(2));
    viz.configure({ trailAlpha: settings.trailAlpha });
    saveSettings(settings);
  });
  safeBind(bloomRange, "input", () => {
    settings.bloomStrength = Number(bloomRange.value);
    setOut("bloom-val", settings.bloomStrength.toFixed(2));
    viz.configure({ bloomStrength: settings.bloomStrength });
    saveSettings(settings);
  });

  // Rings
  safeBind(ringsRange, "input", () => {
    settings.rings = Number(ringsRange.value);
    setOut("rings-val", settings.rings);
    viz.configure({ rings: settings.rings });
    saveSettings(settings);
  });
  safeBind(barsRange, "input", () => {
    settings.barsPerRing = Number(barsRange.value);
    setOut("bars-val", settings.barsPerRing);
    viz.configure({ barsPerRing: settings.barsPerRing });
    saveSettings(settings);
  });

  // Particles
  safeBind(particlesCount, "input", () => {
    settings.numParticles = Number(particlesCount.value);
    setOut("particles-val", settings.numParticles);
    viz.configure({ numParticles: settings.numParticles });
    saveSettings(settings);
  });
  safeBind(particleSize, "input", () => {
    settings.particleSize = Number(particleSize.value);
    setOut("particle-size-val", settings.particleSize.toFixed(1));
    viz.configure({ particleSize: settings.particleSize });
    saveSettings(settings);
  });

  // Orbit Lines
  safeBind(nodesRange, "input", () => {
    settings.numNodes = Number(nodesRange.value);
    setOut("nodes-val", settings.numNodes);
    viz.configure({ numNodes: settings.numNodes });
    saveSettings(settings);
  });
  safeBind(linkDistRange, "input", () => {
    settings.linkDistance = Number(linkDistRange.value);
    setOut("link-val", settings.linkDistance);
    viz.configure({ linkDistance: settings.linkDistance });
    saveSettings(settings);
  });

  // Tunnel
  safeBind(tunnelDensity, "input", () => {
    settings.tunnelDensity = Number(tunnelDensity.value);
    setOut("tunnel-val", settings.tunnelDensity);
    viz.configure({ tunnelDensity: settings.tunnelDensity });
    saveSettings(settings);
  });
  safeBind(tunnelTwist, "input", () => {
    settings.tunnelTwist = Number(tunnelTwist.value);
    setOut("twist-val", settings.tunnelTwist.toFixed(2));
    viz.configure({ tunnelTwist: settings.tunnelTwist });
    saveSettings(settings);
  });

  // Covers
  safeBind(coversCount, "input", () => {
    settings.numCovers = Number(coversCount.value);
    setOut("covers-val", settings.numCovers);
    viz.configure({ numCovers: settings.numCovers });
    saveSettings(settings);
  });
  safeBind(coverSize, "input", () => {
    settings.coverMaxSize = Number(coverSize.value);
    setOut("cover-size-val", settings.coverMaxSize);
    viz.configure({ coverMaxSize: settings.coverMaxSize });
    saveSettings(settings);
  });

  // Preset/theme chips
  drawer.querySelectorAll(".chip[data-preset]")?.forEach((btn) => {
    safeBind(btn, "click", () => applyVisualizerPreset(btn.getAttribute("data-preset")));
  });
  drawer.querySelectorAll(".chip[data-theme]")?.forEach((btn) => {
    safeBind(btn, "click", () => {
      settings.theme = btn.getAttribute("data-theme");
      if (themeSel) themeSel.value = settings.theme;
      if (customColorField) customColorField.hidden = settings.theme !== "mono";
      applyTheme();
      saveSettings(settings);
    });
  });

  // Drawer controls
  safeBind(settingsBtn, "click", openDrawer);
  safeBind(drawerClose, "click", closeDrawer);
  safeBind(overlay, "click", closeDrawer);

  // Initial theme apply
  applyTheme();
}

function openDrawer() {
  if (!overlay || !drawer) return;
  overlay.classList.add("open");
  drawer.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  drawer.setAttribute("aria-hidden", "false");
}
function closeDrawer() {
  if (!overlay || !drawer) return;
  overlay.classList.remove("open");
  drawer.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-hidden", "true");
}

function applyTheme() {
  if (settings.theme === "album") {
    document.documentElement.style.setProperty("--primary", viz.palette[1] || viz.palette[0] || "#1db954");
  } else if (settings.theme === "mono") {
    viz.setTheme("mono");
    document.documentElement.style.setProperty("--primary", settings.customColor);
  } else {
    viz.setTheme(settings.theme);
    const p = THEMES[settings.theme];
    const primary = p?.[0] || "#1db954";
    document.documentElement.style.setProperty("--primary", primary);
  }
}

function applyVisualizerPreset(name) {
  const presets = {
    "classic-rings": () => ({
      mode: "rings",
      theme: "album",
      rings: 4,
      barsPerRing: 64,
      rotationMul: 1.0,
      pulseMul: 1.1,
      glowOpacity: 0.28,
      trailAlpha: 0.06,
      bloomStrength: 0.28,
      complexity: 1.0,
    }),
    "aurora-particles": () => ({
      mode: "particles",
      theme: "ocean",
      numParticles: 420,
      particleSize: 1.4,
      rotationMul: 0.8,
      pulseMul: 1.3,
      glowOpacity: 0.32,
      trailAlpha: 0.08,
      bloomStrength: 0.3,
      complexity: 1.2,
    }),
    "cyber-lines": () => ({
      mode: "orbit",
      theme: "cyber",
      numNodes: 80,
      linkDistance: 180,
      rotationMul: 1.3,
      pulseMul: 1.2,
      glowOpacity: 0.22,
      trailAlpha: 0.04,
      bloomStrength: 0.26,
      complexity: 1.1,
    }),
    "sunset-tunnel": () => ({
      mode: "tunnel",
      theme: "sunset",
      tunnelDensity: 60,
      tunnelTwist: 1.2,
      rotationMul: 1.4,
      pulseMul: 1.5,
      glowOpacity: 0.24,
      trailAlpha: 0.05,
      bloomStrength: 0.25,
      complexity: 1.1,
    }),
    "vapor-float": () => ({
      mode: "covers",
      theme: "vaporwave",
      numCovers: 18,
      coverMaxSize: 170,
      rotationMul: 1.0,
      pulseMul: 1.1,
      glowOpacity: 0.28,
      trailAlpha: 0.06,
      bloomStrength: 0.28,
      complexity: 1.0,
    }),
    "minimal-noir": () => ({
      mode: "rings",
      theme: "noir",
      rings: 2,
      barsPerRing: 36,
      rotationMul: 0.8,
      pulseMul: 0.7,
      glowOpacity: 0.18,
      trailAlpha: 0.02,
      bloomStrength: 0.16,
      complexity: 0.8,
    }),
  }[name];
  if (!presets) return;

  const cfg = presets();
  Object.assign(settings, cfg);
  viz.setMode(settings.mode);
  viz.configure({
    rings: settings.rings,
    barsPerRing: settings.barsPerRing,
    numParticles: settings.numParticles,
    particleSize: settings.particleSize,
    numNodes: settings.numNodes,
    linkDistance: settings.linkDistance,
    tunnelDensity: settings.tunnelDensity,
    tunnelTwist: settings.tunnelTwist,
    numCovers: settings.numCovers,
    coverMaxSize: settings.coverMaxSize,
    rotationMul: settings.rotationMul,
    pulseMul: settings.pulseMul,
    glowOpacity: settings.glowOpacity,
    trailAlpha: settings.trailAlpha,
    bloomStrength: settings.bloomStrength,
    complexity: settings.complexity,
  });
  viz.setTheme(settings.theme);
  applyTheme();
  saveSettings(settings);
  // Reflect section visibility
  switchModeSection(settings.mode);
}

// -------- Redirect URI (Spotify policy compliant) --------
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
].join(" ");

// -------- Auth (PKCE) --------
const LS_KEY = "sp_auth";
const VERIFIER_KEY = "sp_verifier";
const SPOTIFY_CLIENT_ID = window.SPOTIFY_CLIENT_ID || "";

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
  const data = { ...tokens, expires_at: now + (tokens.expires_in || 3600) - 30 };
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  return data;
}
function getTokens() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearTokens() {
  try { localStorage.removeItem(LS_KEY); } catch {}
  try { sessionStorage.removeItem(VERIFIER_KEY); } catch {}
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
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
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
  if (!SPOTIFY_CLIENT_ID) {
    status("Missing Spotify Client ID. Make sure config.js is present and has window.SPOTIFY_CLIENT_ID set.");
    console.error("SPOTIFY_CLIENT_ID missing. Ensure config.js is deployed.");
    return;
  }
  try {
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

    // Navigate to Spotify auth
    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  } catch (e) {
    console.error(e);
    status("Failed to start login. See console for details.");
  }
}
function logout() {
  clearTokens();
  location.reload();
}

// Bind auth buttons right away
safeBind(loginBtn, "click", login);
safeBind(logoutBtn, "click", logout);

// -------- Spotify APIs --------
async function api(path, init = {}) {
  const token = await ensureAccessToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
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

// -------- App init --------
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

    const me = await getMe().catch(() => null);
    if (me) {
      if (userSection) userSection.hidden = false;
      if (userName) userName.textContent = me.display_name || me.id;
      if (userProduct) userProduct.textContent = (me.product || "").toUpperCase();
      if (userAvatar) {
        userAvatar.src = me.images?.[0]?.url || "https://avatars.githubusercontent.com/u/9919?s=32&v=4";
        userAvatar.alt = me.display_name || me.id;
      }
      if (me.product !== "premium") {
        status("Note: In-browser playback requires Spotify Premium.");
      }
    }

    await spotifySDKReady;
    player = new Spotify.Player({
      name: "Ultra Visualizer",
      getOAuthToken: async (cb) => cb(await ensureAccessToken()),
      volume: 0.5,
    });

    player.addListener("ready", async ({ device_id }) => {
      status(`Player ready. Device ${device_id}.`);
      if (playerSection) playerSection.hidden = false;
      try {
        await transferPlayback(device_id, false);
        status(`Playback transferred. Press Play to start.`);
      } catch {
        status(`Playback transfer failed. Open Spotify on a device, then press Play here.`);
      }
    });
    player.addListener("not_ready", ({ device_id }) => status(`Device ${device_id} went offline.`));
    player.addListener("initialization_error", ({ message }) => console.error(message));
    player.addListener("authentication_error", ({ message }) => console.error(message));
    player.addListener("account_error", ({ message }) => status("Account error: " + message));
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
  safeBind(playBtn, "click", async () => {
    try { await player.togglePlay(); }
    catch { if (isPlaying) await pausePlayback(); else await startResumePlayback(); }
  });
  safeBind(prevBtn, "click", () => player.previousTrack());
  safeBind(nextBtn, "click", () => player.nextTrack());

  safeBind(seek, "input", () => {
    const pos = Number(seek.value) / 1000;
    if (currentState?.duration && elapsed) elapsed.textContent = msToTime(currentState.duration * pos);
  });
  safeBind(seek, "change", async () => {
    if (!currentState?.duration) return;
    const posMs = Math.floor(currentState.duration * (Number(seek.value) / 1000));
    try { await player.seek(posMs); } catch (e) { console.warn(e); }
  });

  safeBind(volumeSlider, "input", async () => {
    const vol = Number(volumeSlider.value) / 100;
    try { await player.setVolume(vol); } catch (e) { console.warn(e); }
  });
}

function updateAuthUI(isAuthed) {
  if (loginBtn) loginBtn.hidden = !!isAuthed;
  if (logoutBtn) logoutBtn.hidden = !isAuthed;
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

  if (playBtn) playBtn.textContent = isPlaying ? "⏸" : "▶️";
  if (elapsed) elapsed.textContent = msToTime(state.position);
  if (duration) duration.textContent = msToTime(state.duration);
  if (seek) seek.value = state.duration ? Math.floor((state.position / state.duration) * 1000) : 0;

  const track = currentState.track;
  if (track) {
    if (trackName) trackName.textContent = track.name || "—";
    if (trackArtist) trackArtist.textContent = (track.artists || []).map((a) => a.name).join(", ") || "—";
    if (trackAlbum) trackAlbum.textContent = track.album?.name || "—";
    const img = (track.album?.images || []).find((i) => i.width >= 300) || track.album?.images?.[0];
    const imgUrl = img?.url || "";
    if (imgUrl && albumArt) {
      albumArt.src = imgUrl;
      updatePaletteFromImage(imgUrl).catch(console.warn);
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
  viz.setAlbumImage(img);
  const colors = extractPalette(img, 5);
  if (!settings.lockPalette && settings.theme === "album") {
    viz.setTheme("album", colors);
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

  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors + 3);
  const colors = top.map(([key]) => {
    const r = (key >> 16) & 0xFF,
      g = (key >> 8) & 0xFF,
      b = key & 0xFF;
    return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  });

  const withLuma = colors.map((c) => ({ c, l: hexLuma(c) }));
  withLuma.sort((a, b) => a.l - b.l);
  const ordered = [withLuma[0]?.c, withLuma[Math.floor(withLuma.length * 0.66)]?.c || withLuma.at(-1)?.c, withLuma.at(-1)?.c, ...withLuma.slice(1, -1).map((x) => x.c)].filter(
    Boolean
  );

  const uniq = [...new Set(ordered)];
  return uniq.slice(0, maxColors);
}
function hexLuma(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Kick off
init();