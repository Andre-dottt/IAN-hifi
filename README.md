# IAN HI-FI 1.0.0 — starter

This is a first implementation scaffold based on the 8SPINE module contract visible in the TIDAL 1.6.0 source pasted in the chat.

## Files
- `IAN_HIFI.js`: module implementation.
- `IAN_HIFI.json`: 8SPINE source catalog template.

## Important limitations
1. TIDAL uses the third-party endpoint found in the supplied module source. Its continued availability and authorization are not guaranteed.
2. Apple Music search is disabled until a valid Apple Music developer token is configured in `IAN_HIFI.js`.
3. Apple Music playback is not implemented as a direct stream URL. It requires MusicKit authorization/playback support in the host; returning a fake FLAC URL would be incorrect.
4. The module has not been run inside 8SPINE 1.4.1. Treat this as a test build, not a verified working release.
5. Download support is not enabled for TIDAL in this starter; the stream endpoint returns time-limited playback URLs and does not prove download rights.

## Install/testing
The JSON catalog must point to a publicly hosted raw HTTPS URL for `IAN_HIFI.js`.
1. Upload `IAN_HIFI.js` to a repository you control.
2. Replace `REPLACE_WITH_RAW_HTTPS_URL` in `IAN_HIFI.json` with its raw file URL.
3. Host `IAN_HIFI.json` at a public HTTPS URL.
4. Add that JSON URL in 8SPINE > Add Source.

Do not publish developer tokens or other secrets in a public repository. A proper Apple Music integration needs a secure token-generation backend and a MusicKit-compatible playback flow.
