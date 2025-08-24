// App entry: Spotify auth (PKCE), SDK, advanced visualizer control, analysis mapping.
// Reads client id from global window.SPOTIFY_CLIENT_ID to work on GitHub Pages.
import { Visualizer, THEMES } from "./visualizer.js";

// Canonicalize directory URL to have a trailing slash (prevents redirect_uri mismatches on Pages)
(function canonicalizePath() {
  const path = location.pathname;
  const looksLikeFile = /\.[^/]+$/.test(path);
  if (!path.endsWith("/") && !looksLikeFile) {
    const newUrl = path + "/" + location.search + location.hash;
    history.replaceState({}, "", newUrl);
  }
})();

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
const themeSel = $("#theme");
const customColorInp = $("#custom-color");
const customColorField = $("#custom-color-field");
const lockPaletteChk = $("#lock-palette");

const complexityRange = $("#complexity");
const rotationRange = $("#rotation");
const pulseRange = $("#pulse");
const glowRange = $("#glow");
const trailRange = $("#trail");
const bloomRange = $("#bloom");

const layerIds = ["rings","particles","orbit","tunnel","ripples","ribbons","kaleido","covers"];
const layerCheckboxes = Object.fromEntries(layerIds.map(id => [id, $("#layer-" + id)]));

const fxIds = ["vignette","grain","chroma","bloom","dof"];
const fxCheckboxes = Object.fromEntries(fxIds.map(id => [id, $("#fx-" + id)]));

const camModeSel = $("#cam-mode");
const camShake = $("#cam-shake");
const camGyro = $("#cam-gyro");

const mapAnalysisChk = $("#map-analysis");
const keyframesChk = $("#enable-keyframes");

const out = (id) => drawer?.querySelector(`[data-out="${id}"]`);

// -------- Device detection --------
const ua = navigator.userAgent || "";
const isIPhone = /\biPhone\b/.test(ua) || (/\bCPU iPhone OS\b/.test(ua) && /\bMobile\b/.test(ua));
if (isIPhone) document.documentElement.classList.add("iphone");

// -------- Visualizer defaults --------
const defaultSettings = {
  theme: "album",
  customColor: "#1db954",
  lockPalette: false,

  complexity: isIPhone ? 0.9 : 1.1,
  rotationMul: 1.0,
  pulseMul: 1.0,
  glowOpacity: 0.28,
  trailAlpha: 0.06,
  bloomStrength: 0.28,
  dprCap: isIPhone ? 1.5 : Math.max(1, window.devicePixelRatio || 1),

  // layers
  layers: { rings: true, particles: true, orbit: false, tunnel: true, ripples: false, ribbons: false, kaleido: false, covers: true },

  // fx
  fx: { vignette: true, grain: true, chroma: false, bloom: true, dof: false },

  // camera
  camMode: "none",
  camShake: 0,
  camGyro: false,

  // analysis & keyframes
  mapAnalysis: true,
  keyframesDemo: false,
};
const LS_SETTINGS = "viz_settings_v4";

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch { return { ...defaultSettings }; }
}
function saveSettings(s) { try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch {} }
let settings = loadSettings();

// Visualizer
const viz = new Visualizer(document.getElementById("visualizer"), {
  rotationMul: settings.rotationMul,
  pulseMul: settings.pulseMul,
  glowOpacity: settings.glowOpacity,
  trailAlpha: settings.trailAlpha,
  bloomStrength: settings.bloomStrength,
  dprCap: settings.dprCap,
  complexity: settings.complexity,
});
viz.setTheme(settings.theme, null);
viz.setCustomMono(settings.customColor);
for (const [k, v] of Object.entries(settings.layers)) viz.setLayerEnabled(k, v);
for (const [k, v] of Object.entries(settings.fx)) viz.setFx(k, v);
viz.setCameraMode(settings.camMode);
viz.setCameraShake(settings.camShake);
viz.setCameraGyro(settings.camGyro);

// -------- Settings UI --------
function initSettingsUI() {
  // Theme
  themeSel.value = settings.theme;
  customColorField.hidden = settings.theme !== "mono";
  customColorInp.value = settings.customColor;
  lockPaletteChk.checked = settings.lockPalette;

  // Global
  complexityRange.value = String(settings.complexity);
  rotationRange.value = String(settings.rotationMul);
  pulseRange.value = String(settings.pulseMul);
  glowRange.value = String(settings.glowOpacity);
  trailRange.value = String(settings.trailAlpha);
  bloomRange.value = String(settings.bloomStrength);
  if (out("complexity-val")) out("complexity-val").textContent = settings.complexity.toFixed(1);
  if (out("rotation-val")) out("rotation-val").textContent = settings.rotationMul.toFixed(1);
  if (out("pulse-val")) out("pulse-val").textContent = settings.pulseMul.toFixed(2);
  if (out("glow-val")) out("glow-val").textContent = settings.glowOpacity.toFixed(2);
  if (out("trail-val")) out("trail-val").textContent = settings.trailAlpha.toFixed(2);
  if (out("bloom-val")) out("bloom-val").textContent = settings.bloomStrength.toFixed(2);

  // Layers
  for (const id of layerIds) layerCheckboxes[id].checked = !!settings.layers[id];

  // FX
  for (const id of fxIds) fxCheckboxes[id].checked = !!settings.fx[id];

  // Camera
  camModeSel.value = settings.camMode;
  camShake.value = String(settings.camShake);
  if (out("shake-val")) out("shake-val").textContent = settings.camShake;
  camGyro.checked = settings.camGyro;

  // Analysis & keyframes
  mapAnalysisChk.checked = settings.mapAnalysis;
  keyframesChk.checked = settings.keyframesDemo;

  // Bindings
  themeSel.addEventListener("change", () => {
    settings.theme = themeSel.value; saveSettings(settings);
    customColorField.hidden = settings.theme !== "mono";
    applyTheme();
  });
  customColorInp.addEventListener("input", () => {
    settings.customColor = customColorInp.value; saveSettings(settings);
    viz.setCustomMono(settings.customColor);
    if (settings.theme === "mono") applyTheme();
  });
  lockPaletteChk.addEventListener("change", () => { settings.lockPalette = lockPaletteChk.checked; saveSettings(settings); });

  complexityRange.addEventListener("input", () => { settings.complexity = Number(complexityRange.value); saveSettings(settings); if (out("complexity-val")) out("complexity-val").textContent = settings.complexity.toFixed(1); viz.configure({ complexity: settings.complexity }); });
  rotationRange.addEventListener("input", () => { settings.rotationMul = Number(rotationRange.value); saveSettings(settings); if (out("rotation-val")) out("rotation-val").textContent = settings.rotationMul.toFixed(1); viz.configure({ rotationMul: settings.rotationMul }); });
  pulseRange.addEventListener("input", () => { settings.pulseMul = Number(pulseRange.value); saveSettings(settings); if (out("pulse-val")) out("pulse-val").textContent = settings.pulseMul.toFixed(2); viz.configure({ pulseMul: settings.pulseMul }); });
  glowRange.addEventListener("input", () => { settings.glowOpacity = Number(glowRange.value); saveSettings(settings); if (out("glow-val")) out("glow-val").textContent = settings.glowOpacity.toFixed(2); viz.configure({ glowOpacity: settings.glowOpacity }); });
  trailRange.addEventListener("input", () => { settings.trailAlpha = Number(trailRange.value); saveSettings(settings); if (out("trail-val")) out("trail-val").textContent = settings.trailAlpha.toFixed(2); viz.configure({ trailAlpha: settings.trailAlpha }); });
  bloomRange.addEventListener("input", () => { settings.bloomStrength = Number(bloomRange.value); saveSettings(settings); if (out("bloom-val")) out("bloom-val").textContent = settings.bloomStrength.toFixed(2); viz.configure({ bloomStrength: settings.bloomStrength }); });

  for (const id of layerIds) {
    layerCheckboxes[id].addEventListener("change", () => {
      settings.layers[id] = layerCheckboxes[id].checked; saveSettings(settings);
      viz.setLayerEnabled(id, settings.layers[id]);
    });
  }
  for (const id of fxIds) {
    fxCheckboxes[id].addEventListener("change", () => {
      settings.fx[id] = fxCheckboxes[id].checked; saveSettings(settings);
      viz.setFx(id, settings.fx[id]);
    });
  }

  camModeSel.addEventListener("change", () => { settings.camMode = camModeSel.value; saveSettings(settings); viz.setCameraMode(settings.camMode); });
  camShake.addEventListener("input", () => { settings.camShake = Number(camShake.value); if (out("shake-val")) out("shake-val").textContent = settings.camShake; saveSettings(settings); viz.setCameraShake(settings.camShake); });
  camGyro.addEventListener("change", () => { settings.camGyro = camGyro.checked; saveSettings(settings); viz.setCameraGyro(settings.camGyro); });

  mapAnalysisChk.addEventListener("change", () => { settings.mapAnalysis = mapAnalysisChk.checked; saveSettings(settings); viz.setAnalysisEnabled(settings.mapAnalysis); });
  keyframesChk.addEventListener("change", () => { settings.keyframesDemo = keyframesChk.checked; saveSettings(settings); if (settings.keyframesDemo) viz.enableKeyframeDemo(currentTrack?.duration_ms ? currentTrack.duration_ms / 1000 : 180); });

  // Drawer
  settingsBtn.addEventListener("click", () => openDrawer());
  drawerClose.addEventListener("click", () => closeDrawer());
  overlay.addEventListener("click", () => closeDrawer());

  applyTheme();
}
function openDrawer() { overlay.classList.add("open"); drawer.classList.add("open"); overlay.setAttribute("aria-hidden", "false"); drawer.setAttribute("aria-hidden", "false"); }
function closeDrawer() { overlay.classList.remove("open"); drawer.classList.remove("open"); overlay.setAttribute("aria-hidden", "true"); drawer.setAttribute("aria-hidden", "true"); }

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

// -------- Status helper --------
function status(msg) { console.log("[status]", msg); if (statusEl) statusEl.textContent = msg; }

// -------- Redirect URI (Spotify 2025 rules) --------
function canonicalDirHref() {
  const path = location.pathname;
  const looksLikeFile = /\.[^/]+$/.test(path);
  const dir = path.endsWith("/") || looksLikeFile ? path : path + "/";
  return location.origin + dir;
}
function computeRedirectUri() {
  const url = canonicalDirHref();
  const host = location.hostname;
  if (location.protocol === "https:" || host === "127.0.0.1" || host === "::1") return url;
  if (host === "localhost" || host === "0.0.0.0") return url.replace(location.hostname, "127.0.0.1");
  return url;
}
const REDIRECT_URI = computeRedirectUri();
const SCOPES = ["streaming","user-read-email","user-read-private","user-read-playback-state","user-modify-playback-state"].join(" ");

// -------- Auth (PKCE) --------
const LS_KEY = "sp_auth";
const VERIFIER_KEY = "sp_verifier";
const REDIRECT_USED_KEY = "redirect_uri_used";
const SPOTIFY_CLIENT_ID = window.SPOTIFY_CLIENT_ID || "";

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
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  return data;
}
function getTokens() { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function clearTokens() { try { localStorage.removeItem(LS_KEY); } catch {}; try { sessionStorage.removeItem(VERIFIER_KEY); } catch {}; try { sessionStorage.removeItem(REDIRECT_USED_KEY); } catch {} }

async function ensureAccessToken() {
  let tok = getTokens();
  if (tok && tok.expires_at > Math.floor(Date.now() / 1000)) return tok.access_token;

  if (tok && tok.refresh_token) {
    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", tok.refresh_token);
    const res = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      clearTokens();
      throw new Error(`Failed to refresh token: ${text || res.status}`);
    }
    const data = await res.json();
    tok = saveTokens({ ...tok, ...data, refresh_token: data.refresh_token || tok.refresh_token });
    return tok.access_token;
  }

  // Authorization code present?
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem("pkce_state");
  if (code) {
    if (storedState && state !== storedState) {
      throw new Error("State mismatch; aborting auth.");
    }
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("Missing PKCE verifier (sessionStorage).");

    const usedRedirect = sessionStorage.getItem(REDIRECT_USED_KEY) || REDIRECT_URI;

    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", usedRedirect);
    params.set("code_verifier", verifier);

    const res = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
    const bodyText = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Token exchange failed: ${bodyText || res.status}`);
    }
    const data = JSON.parse(bodyText);
    saveTokens(data);

    // Clean URL back to canonical directory
    const clean = canonicalDirHref();
    window.history.replaceState({}, document.title, clean);
    return data.access_token;
  }

  return null;
}

async function login() {
  if (!SPOTIFY_CLIENT_ID) { status("Missing Spotify Client ID in config.js"); return; }
  try {
    const verifier = randomString(96);
    const challenge = await sha256(verifier);
    const state = randomString(16);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem("pkce_state", state);
    sessionStorage.setItem(REDIRECT_USED_KEY, REDIRECT_URI); // record exact redirect used

    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("response_type", "code");
    params.set("redirect_uri", REDIRECT_URI);
    params.set("code_challenge_method", "S256");
    params.set("code_challenge", challenge);
    params.set("state", state);
    params.set("scope", SCOPES);

    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  } catch (e) {
    console.error(e);
    status("Failed to start login. See console for details.");
  }
}
function logout() { clearTokens(); location.reload(); }
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

// -------- Spotify Web API helpers --------
async function api(path, init = {}) {
  const token = await ensureAccessToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (res.status === 204) return null;
  if (!res.ok) { const body = await res.text().catch(() => ""); throw new Error(`API ${res.status}: ${body || res.statusText}`); }
  return res.json();
}
async function getMe() { return api("/me"); }
async function transferPlayback(device_id, play = false) { return api(`/me/player`, { method: "PUT", body: JSON.stringify({ device_ids: [device_id], play }) }); }
async function startResumePlayback(body = undefined) { return api(`/me/player/play`, { method: "PUT", body: body ? JSON.stringify(body) : null }); }
async function pausePlayback() { return api(`/me/player/pause`, { method: "PUT" }); }
async function getAudioFeatures(trackId) { return api(`/audio-features/${trackId}`); }
async function getAudioAnalysis(trackId) { return api(`/audio-analysis/${trackId}`); }

// -------- Player SDK --------
let player;
let isPlaying = false;
let currentState = null;
let currentTrack = null;
let analysis = null; // { beats, bars, sections }
let sdkReadyResolve;
const spotifySDKReady = new Promise((res) => (sdkReadyResolve = res));
window.onSpotifyWebPlaybackSDKReady = () => sdkReadyResolve();

function msToTime(ms) { if (!ms || ms < 0) ms = 0; const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const ss = String(s % 60).padStart(2, "0"); return `${m}:${ss}`; }

// -------- App init --------
async function init() {
  try {
    const token = await ensureAccessToken();
    updateAuthUI(!!token);

    // Settings/UI independent; start visualizer and UI immediately
    viz.start();
    initSettingsUI();

    if (!token) { status("Please log in with Spotify."); return; }

    const me = await getMe().catch(() => null);
    if (me) {
      userSection.hidden = false;
      userName.textContent = me.display_name || me.id;
      userProduct.textContent = (me.product || "").toUpperCase();
      userAvatar.src = me.images?.[0]?.url || "https://avatars.githubusercontent.com/u/9919?s=32&v=4";
      userAvatar.alt = me.display_name || me.id;
      if (me.product !== "premium") status("Note: In-browser playback requires Spotify Premium.");
    }

    await spotifySDKReady;
    player = new Spotify.Player({ name: "Ultra Visualizer", getOAuthToken: async (cb) => cb(await ensureAccessToken()), volume: 0.5 });

    player.addListener("ready", async ({ device_id }) => {
      status(`Player ready. Device ${device_id}.`);
      playerSection.hidden = false;
      try { await transferPlayback(device_id, false); status(`Playback transferred. Press Play to start.`); }
      catch { status(`Playback transfer failed. Open Spotify on a device, then press Play here.`); }
    });
    player.addListener("not_ready", ({ device_id }) => status(`Device ${device_id} went offline.`));
    player.addListener("initialization_error", ({ message }) => console.error(message));
    player.addListener("authentication_error", ({ message }) => console.error(message));
    player.addListener("account_error", ({ message }) => status("Account error: " + message));
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
  playBtn.addEventListener("click", async () => { try { await player.togglePlay(); } catch { if (isPlaying) await pausePlayback(); else await startResumePlayback(); } });
  prevBtn.addEventListener("click", () => player.previousTrack());
  nextBtn.addEventListener("click", () => player.nextTrack());
  seek.addEventListener("input", () => { const pos = Number(seek.value) / 1000; if (currentState?.duration) elapsed.textContent = msToTime(currentState.duration * pos); });
  seek.addEventListener("change", async () => {
    if (!currentState?.duration) return;
    const posMs = Math.floor(currentState.duration * (Number(seek.value) / 1000));
    try { await player.seek(posMs); } catch (e) { console.warn(e); }
  });
  volumeSlider.addEventListener("input", async () => { const vol = Number(volumeSlider.value) / 100; try { await player.setVolume(vol); } catch (e) { console.warn(e); } });
}

function updateAuthUI(isAuthed) {
  loginBtn.hidden = !!isAuthed;
  logoutBtn.hidden = !isAuthed;
}

async function onPlayerState(state) {
  if (!state) return;
  const track = state.track_window?.current_track || null;
  const firstTrackChange = !currentTrack || track?.id !== currentTrack?.id;
  currentState = { position: state.position, duration: state.duration, paused: state.paused, track };
  isPlaying = !state.paused;
  playBtn.textContent = isPlaying ? "⏸" : "▶️";
  elapsed.textContent = msToTime(state.position);
  duration.textContent = msToTime(state.duration);
  seek.value = state.duration ? Math.floor((state.position / state.duration) * 1000) : 0;

  if (track) {
    currentTrack = track;
    trackName.textContent = track.name || "—";
    trackArtist.textContent = (track.artists || []).map((a) => a.name).join(", ") || "—";
    trackAlbum.textContent = track.album?.name || "—";
    const img = (track.album?.images || []).find((i) => i.width >= 300) || track.album?.images?.[0];
    const imgUrl = img?.url || "";
    if (imgUrl) {
      albumArt.src = imgUrl;
      updatePaletteFromImage(imgUrl).catch(console.warn);
    }

    try {
      const id = track.id || (track.uri || "").split(":").pop();
      if (id && firstTrackChange) {
        const [feat, ana] = await Promise.allSettled([getAudioFeatures(id), getAudioAnalysis(id)]);
        if (feat.status === "fulfilled") {
          const f = feat.value;
          if (f?.tempo) viz.setTempo(f.tempo);
          if (typeof f?.energy === "number") viz.setEnergy(f.energy);
        }
        if (ana.status === "fulfilled") {
          analysis = ana.value || null;
          _resetAnalysisIndices();
          if (settings.keyframesDemo) viz.enableKeyframeDemo(currentTrack?.duration_ms ? currentTrack.duration_ms / 1000 : 180);
        }
      }
    } catch (e) {
      console.warn("Features/Analysis failed", e);
    }
  }

  _updateAnalysisMapping();
}

function _resetAnalysisIndices() { lastBeatIdx = lastBarIdx = lastSectionIdx = -1; }
let lastBeatIdx = -1, lastBarIdx = -1, lastSectionIdx = -1;

function _findIndexByTime(arr, t) {
  if (!arr || !arr.length) return -1;
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (t < a.start + a.duration) return i;
  }
  return arr.length - 1;
}

function _updateAnalysisMapping() {
  if (!analysis || !settings.mapAnalysis || !currentState) return;
  const posSec = (currentState.position || 0) / 1000;
  viz.setPlayPosition(posSec);

  const beats = analysis.beats, bars = analysis.bars, sections = analysis.sections;
  const bi = _findIndexByTime(beats, posSec), bai = _findIndexByTime(bars, posSec), si = _findIndexByTime(sections, posSec);

  if (bi !== lastBeatIdx || bai !== lastBarIdx || si !== lastSectionIdx) {
    lastBeatIdx = bi; lastBarIdx = bai; lastSectionIdx = si;
    viz.updateAnalysis({ beatIndex: bi, barIndex: bai, sectionIndex: si, time: posSec });
  }
}

// Palette extraction and album texture
async function updatePaletteFromImage(url) {
  const img = await loadImage(url);
  viz.setAlbumImage(img);
  const colors = extractPalette(img, 6);
  if (!settings.lockPalette && settings.theme === "album") {
    viz.setTheme("album", colors);
    document.documentElement.style.setProperty("--primary", colors[1] || colors[0] || "#1db954");
  }
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
}
function extractPalette(image, maxColors = 6) {
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
    const r = (key >> 16) & 0xFF, g = (key >> 8) & 0xFF, b = key & 0xFF;
    return "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("");
  });
  const withLuma = colors.map(c => ({ c, l: hexLuma(c) })).sort((a, b) => a.l - b.l);
  const ordered = [withLuma[0]?.c, withLuma[Math.floor(withLuma.length * 0.66)]?.c || withLuma.at(-1)?.c, withLuma.at(-1)?.c, ...withLuma.slice(1, -1).map(x => x.c)].filter(Boolean);
  return [...new Set(ordered)].slice(0, maxColors);
}
function hexLuma(hex) { let c = hex.replace("#", ""); if (c.length === 3) c = c.split("").map(ch => ch + ch).join(""); const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

// Settings drawer
settingsBtn.addEventListener("click", openDrawer);
drawerClose.addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

// UI auth hint
if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === "YOUR_SPOTIFY_CLIENT_ID") status("Set your Spotify Client ID in config.js (window.SPOTIFY_CLIENT_ID).");
else {
  const u = new URL(REDIRECT_URI);
  if (u.protocol === "http:" && !(u.hostname === "127.0.0.1" || u.hostname === "::1")) status("Warning: Spotify requires HTTPS for non-loopback redirect URIs.");
}

// Kick off
init();