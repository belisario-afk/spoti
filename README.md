# Spotify Visualizer Website

A single-page website that:
- Lets users log in with Spotify (PKCE auth).
- Plays music in the browser via Spotify Web Playback SDK.
- Draws a music visualizer whose colors adapt to the current album cover and whose motion follows the track's tempo and energy.
- New: Slide-out Settings with live controls (rings, bars, rotation, pulse, glow, trail, bloom, color modes), iPhone layout/perf tweaks, and presets.

## Settings panel

Open the Settings (gear) to tweak:
- Color
  - Mode: Album (dynamic), Spotify Brand, Mono (custom color)
  - Lock album colors (prevent palette changes per track)
  - Custom color picker (for Mono)
- Motion
  - Rings (1–5), Bars per ring (16–96)
  - Rotation speed multiplier
  - Pulse intensity
- Look
  - Background glow opacity
  - Trail fade (adds smooth motion trails)
  - Bloom strength
- Presets: Chill, Energetic, Minimal

Settings are stored in localStorage and persist across sessions.

## iPhone support

- Uses viewport-fit=cover and 100dvh so the canvas fills under the notch/home bar.
- Safe-area insets applied to layout.
- Auto-tunes defaults (fewer rings/bars, DPR cap) on iPhone for smoother performance.

## Setup and Redirect URIs (2025 policy)

- Dev: register `http://127.0.0.1/` (no port) and open `http://127.0.0.1:<port>/`
- Prod (GitHub Pages, this repo): add `https://belisario-afk.github.io/spoti/`
- `localhost` is not allowed; HTTPS is required for non-loopback.

## Notes

- Spotify Premium is required for playback via the Web Playback SDK.
- Visualizer uses metadata (tempo/energy) + album colors (no raw audio taps).