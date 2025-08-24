# Ultra Spotify Visualizer

A next-level, themeable Spotify visualizer with multiple scenes:
- Radiant Rings (evolved bars)
- Particle Burst (additive glow particles)
- Flow Field Drift (vector-field motion)
- Spectrum Waves (halo polylines)
- Floating Covers (album sprites with physics)
- Aurora Ribbons (screen-blended ribbons)

Features
- Theme presets (Neon, Cyberpunk, Vaporwave, Sunset, Aurora, Matrix, Candy, Ocean, Firestorm, Mono Dark)
- Visual presets (mode + theme + tuned params)
- Dynamic album color palettes (or lock/custome/ theme mode)
- Auto-cycle modes with interval
- iPhone-aware perf (DPR cap, defaults)
- Smooth crossfades between modes
- Snapshot button (save PNG)

Setup
- Redirect URIs per 2025 policy:
  - Dev: `http://127.0.0.1/` (open `http://127.0.0.1:<port>/`)
  - Prod (GitHub Pages): `https://belisario-afk.github.io/spoti/`
- Scopes used:
  - streaming, user-read-email, user-read-private, user-read-playback-state, user-modify-playback-state
  - user-read-recently-played (for floating covers images)

Notes
- Web Playback SDK requires Premium for in-browser playback.
- Visuals are driven by metadata (tempo, energy) and album art, not raw audio.