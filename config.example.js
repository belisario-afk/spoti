// 1) Copy this file to config.js
// 2) Replace the CLIENT_ID with your Spotify app's Client ID
// 3) Redirect URIs must comply with Spotify's 2025 validation:
//    - Use HTTPS for non-loopback hosts
//    - Use explicit loopback IPs for HTTP: http://127.0.0.1/ or http://[::1]/
//    - localhost is NOT allowed
//    - For loopback, you can register without a port; dynamic ports are allowed at runtime
export const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";