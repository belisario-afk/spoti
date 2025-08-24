# Spotify Visualizer Website

A single-page website that:
- Lets users log in with Spotify (PKCE auth).
- Plays music in the browser via Spotify Web Playback SDK.
- Draws a music visualizer whose colors adapt to the current album cover and whose motion follows the track's tempo and energy.

Note: The Web Playback SDK requires Spotify Premium to play audio in the browser. Without Premium, you can still log in and see UI updates, but in-browser playback control won't work.

## Important: Redirect URI policy (2025)

Spotify is enforcing stricter redirect URI validation:
- Use HTTPS for non-loopback hosts.
- HTTP is only allowed for loopback IP literals:
  - IPv4: `http://127.0.0.1/`
  - IPv6: `http://[::1]/`
- `localhost` is not allowed.
- For loopback, you may register a redirect without a port, and supply the dynamic port at runtime (recommended for dev).

Examples:
- `https://example.com/callback` (production)
- `http://127.0.0.1/` (dev; dynamic port allowed)
- `http://[::1]/` (dev; dynamic port allowed)

This project computes a compliant redirect URI at runtime:
- If you're on HTTPS (e.g., prod): uses your current origin and directory path.
- If you're on HTTP:
  - If the host is loopback, it's allowed.
  - If the host is `localhost`/`0.0.0.0`, we rewrite to `127.0.0.1` and keep your current port and path.
  - Otherwise, you'll see a warning.

## Setup

1) Create a Spotify app:
   - https://developer.spotify.com/dashboard
   - Create an app and copy the Client ID.

2) Configure the client ID:
   - Copy `config.example.js` to `config.js` and set your Client ID.
   - In this repo, `config.js` already contains your Client ID.

3) Register redirect URIs in the Spotify Dashboard (App settings):
   - Development:
     - Add `http://127.0.0.1/` (no port) — this supports dynamic ports.
     - Optionally add `http://[::1]/` for IPv6.
   - Production (GitHub Pages for this repo):
     - Add `https://belisario-afk.github.io/spoti/`
       - Ensure the trailing slash is present.
   - Remove any `localhost` entries (not allowed).

4) Run locally:
   - Serve the folder and open using 127.0.0.1 (not localhost):
     - `npx serve .` then open `http://127.0.0.1:3000/` (or the printed port)
     - Or use Vite: `npm create vite@latest -- --template vanilla`, copy files, `npm run dev`, open `http://127.0.0.1:5173/`.

5) Deploy to GitHub Pages:
   - Push these files to `belisario-afk/spoti`.
   - Enable Pages in repo Settings → Pages → Deploy from branch → `main` → `/ (root)`.
   - Open `https://belisario-afk.github.io/spoti/`.
   - Make sure that exact URL is registered as a redirect URI in the Spotify Dashboard.

## How it works

- Authorization:
  - Authorization Code with PKCE (no client secret in frontend).
  - Tokens are stored in `localStorage`, automatic refresh.
  - Redirect URI is computed to comply with policy (see above).
- Playback:
  - Spotify Web Playback SDK creates a browser device; playback is transferred to it.
  - Controls: play/pause, next/previous, seek, volume.
- Visualizer:
  - Album art is sampled for a palette.
  - Motion is driven by tempo and energy from Spotify Audio Features.

## Security notes

- Do not commit your Client Secret to this repo or use it in frontend code. It's not needed for PKCE.
- If you later build a server for backend OAuth, keep the secret only on the server.

## Troubleshooting

- Redirect URI mismatch:
  - Ensure your registered URI exactly matches the app's URL (origin + path + trailing slash).
  - For dev, register `http://127.0.0.1/` (no port) and open `http://127.0.0.1:<port>/`.
  - Do not use `localhost`.
- Stuck at "Please log in":
  - Check your redirect URIs in the Spotify Dashboard.
  - Make sure your browser URL host matches the registered host (e.g., `127.0.0.1`).
- "Account error" or can't play:
  - Ensure the account is Premium.
- Blank album art or no colors:
  - Some images may block cross-origin reads. The code uses `crossOrigin="anonymous"`; if CORS is blocked for a particular image, palette extraction may be limited.