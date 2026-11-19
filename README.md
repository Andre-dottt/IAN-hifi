[README.md](https://github.com/user-attachments/files/35068855/README.md)
# IAN HI-FI 1.1.0 — test build

- `IAN_HIFI.js`: module code.
- `IAN_HIFI.json`: 8SPINE music source catalog entry.

## Limitations
- Not yet tested inside 8SPINE 1.4.1.
- TIDAL uses a third-party server; availability, authorization, response format and compatibility are not guaranteed.
- Quality options are requested values, not proof of delivered quality.
- Apple Music search requires an authorized developer token. Apple Music playback is not implemented and requires supported MusicKit integration.
- Downloads are disabled. A playback stream is not treated as a downloadable file.
- Never publish private tokens or credentials in a public repository.
