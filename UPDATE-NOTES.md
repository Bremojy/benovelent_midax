# Update notes

This revision includes:
- Removal of redundant member model index flags that could trigger duplicate index warnings.
- A safer API base URL fallback that prefers the local backend on localhost and keeps the production Render URL otherwise.
- Existing chat, support, upload, and notification flows were preserved.
