# Ultra Spotify Visualizer

A single-page app that:
- Logs in with Spotify (PKCE).
- Plays via the Web Playback SDK (Premium required).
- Renders advanced, themeable visualizers: Rings, Particle Field, Orbit Lines, Tunnel, and Floating Album Covers.
- One‑click visualizer presets and theme presets.
- iPhone layout/performance tuning, adaptive quality, and persistent settings.

Live on GitHub Pages (example): https://belisario-afk.github.io/spoti/

## Features

Visualizer modes
- Rings: multi-ring bar sculpture with beat bloom.
- Particle Field: aurora-like particles with additive glow and center attractor.
- Orbit Lines: orbiting nodes with reactive link mesh.
- Tunnel: spiral tunnel beams with BPM-driven twist.
- Floating Covers: parallax cloud of album covers with soft glow.

Themes
- Album Adaptive (from current cover), Neon, Midnight, Sunset, Ocean, Vaporwave, Cyberpunk, Candy, Noir, and Mono (custom color).

Presets
- Classic Rings, Aurora Particles, Cyber Neon Lines, Sunset Tunnel, Vaporwave Float, Minimal Noir.

Polish
- Slide-out settings drawer (gear icon), smooth transitions.
- Local persistence via localStorage.
- iPhone-friendly: safe-area insets, 100dvh canvas, DPR cap.
- Adaptive performance: automatic DPR up/down based on FPS.

## Setup

1) Create a Spotify app: https://developer.spotify.com/dashboard
2) Add Redirect URIs (2025 rules):
   - Dev: `http://127.0.0.1/` (no port, supports dynamic ports)
   - Prod (GitHub Pages): `https://belisario-afk.github.io/spoti/`
3) Copy `config.example.js` to `config.js` and set your Client ID.

## Notes

- Premium is required for in-browser playback.
- Due to DRM, visuals use metadata (tempo/energy) + album colors, not raw audio.
- If images block cross-origin, palette may fall back; visuals still run.

## Troubleshooting

- Redirect mismatch: ensure exact match to your site URL (origin + path + trailing slash).
- Login button does nothing: hard refresh; clear `sp_auth` and `viz_settings_v3`.
- Playback blocked on iOS: tap Play (user gesture required).
- Performance: lower Complexity in Settings or let adaptive quality adjust.