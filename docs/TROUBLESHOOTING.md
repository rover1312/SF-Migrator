# Troubleshooting

## Authentication

- **401 `AUTH_FAILED` / `INVALID_LOGIN`** — wrong username, password, or
  missing security token. Reset the token via Salesforce Setup → My Personal
  Information → Reset My Security Token, then retry with the new token
  appended in the UI's security-token field.
- **Locked to an IP range** — orgs with Login IP Ranges reject logins from
  unknown IPs. Add your IP or use OAuth instead.
- **`API_DISABLED_FOR_ORG`** — API access is not enabled for this org/edition
  (e.g. some Group/Professional orgs). Enable API access or use another org.
- **OAuth: `redirect_uri_mismatch`** — the connected app's callback URL must
  exactly match `SF_REDIRECT_URI` (default
  `http://localhost:3001/api/auth/callback`).
- **Expired sessions** — access tokens expire. If a stored org has a refresh
  token, reconnect via OAuth; otherwise log in again (Step 2/3). Passwords
  are never stored locally, only OAuth tokens in `data/configs/orgs.json`.

## Extraction & loading

- **429 / rate limits** — the server retries transient failures with
  exponential backoff (4 attempts). Persistent 429s mean the org's 24h API
  budget is spent; wait and use `resume`.
- **Job stuck in `paused`** — resume it from Step 7/10 or
  `POST /api/extract/resume` / `/api/load/resume`.
- **`extract job has no manifest`** — the extract job never completed. Check
  its status/error, fix the cause, and re-run extraction.
- **Unresolved lookups** — a child references a parent that wasn't loaded.
  Confirm the parent object is selected, ordered *before* the child, and the
  lookup mapping in Step 5 points at it.
- **`INVALID_CONFIG` with details** — the response lists every problem
  (unknown objects, duplicate nicknames, upsert without external ID, bad
  load order). Fix and re-import.

## Local setup

- **Port in use** — UI `:3000`, API `:3001`. Change via Vite `-p` flag or
  `PORT=` in `.env`.
- **`python` not found** — the Node pipeline works without Python. Python is
  only needed for the standalone scripts in `src/scripts/`
  (`pip install -r src/scripts/requirements.txt`).
- **Upload rejected (`UPLOAD_ERROR`)** — only `.json/.yaml/.yml/.csv` up to
  10 MB are accepted.
- **Dev server slow to start** — `ts-node` type-checks on boot (~30s first
  run). Use `--transpile-only` via `dev:server` as configured, or run the
  built server (`npm run build:server && npm start`).
