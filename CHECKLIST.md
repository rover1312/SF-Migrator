# Checklist — SF-Migrator (Complete)

Every item below is **implemented and verified** (see Verify). Items that need
a live Salesforce org or Python runtime are marked as such — the code is
complete; only the live run is environment-dependent.

**Architecture:** React + TypeScript (UI) | Node.js + Express (API) |
Python via child process (data processing) | Local file system (storage)

## Verify

```bash
npm run typecheck && npm run typecheck:client   # server + client tsc: clean
npm run lint                                    # ESLint: 0 errors
npm test                                        # Jest: 16 suites / 60+ tests pass
npm run build                                   # server tsc + vite build pass
npm run dev                                     # UI :3000 + API :3001
```

---

## 1. Project setup & configuration — done

- [x] Root `package.json` — single package for `src/client` + `src/server`.
  Scripts: `dev`, `dev:server`, `dev:client`, `build`, `start`, `test`,
  `lint`, `format`, `typecheck`, `typecheck:client`.
- [x] TypeScript — `tsconfig.base.json` + per-project configs + root
  `tsconfig.json`. Extensionless relative imports everywhere (keeps ts-node,
  tsc, and ts-jest working together).
- [x] ESLint + Prettier configs; sources formatted; lint clean.
- [x] `.env.example` — ports, OAuth placeholders, login URLs, `data/` overrides.
- [x] Nodemon hot-reload; production builds for server (`src/server/dist/`)
  and client (`src/client/dist/`).

## 2. Backend core — done

- [x] Express + localhost CORS, per-resource routers, `GET /health`
  (`src/server/index.ts`, `routes/`).
- [x] Envelope helpers `ok()`/`fail()` used by every route
  (`utils/api-response.ts`).
- [x] Error middleware — upload rejections → 400 `UPLOAD_ERROR`, all else →
  500 `INTERNAL_ERROR` (`middleware/error.middleware.ts`, verified live).
- [x] Request logger with status + duration (`middleware/request-logger.middleware.ts`).
- [x] Multer uploads — `.json/.yaml/.yml/.csv`, 10 MB, into `data/temp/`
  (`middleware/upload.middleware.ts`).
- [x] File utilities — data-dir bootstrap, JSON read/write
  (`utils/files.ts`).
- [x] Python bridge with timeout kill + spawn-error handling
  (`services/python-bridge.service.ts`).
- [x] Persisted job registry — in-memory + `data/logs/jobs/*.json`, with
  pause/resume/cancel semantics (`services/jobs.ts`).

## 3. Configuration management — done

- [x] JSON Schema for the migration config, including optional `lookups`
  (child → field → parent) (`config/migration.schema.json`).
- [x] Ajv validator + business rules: source ≠ targets (nicknames), unique
  objects, contiguous order, fields/filters reference selected objects,
  upsert requires external ID, lookup parents earlier in order
  (`services/config.service.ts`).
- [x] Export to JSON/YAML text and parse/validate uploads
  (`POST /api/config/export`, `POST /api/config/import`).

## 4. Salesforce services — done

- [x] `jsforce` connections: username/password (+ security token) and OAuth
  tokens; OAuth authorization-URL builder; refresh-token flow
  (`services/salesforce.service.ts`).
- [x] Local org registry — metadata + OAuth tokens in
  `data/configs/orgs.json`; passwords never stored (`services/org-store.ts`).
- [x] Metadata discovery — SObjects with optional record counts (concurrency
  limit 5), per-field create/update permissions
  (`GET /api/objects/list`, `GET /api/objects/:name/count`,
  `GET /api/fields/describe/:object`).
- [x] SOQL builder with escaping + injection rejection
  (`utils/soql.ts`, mirrored for preview in `src/client/utils/soql.ts`).
- [x] Bulk API 2.0 ingest (create → upload CSV → close → poll → failed
  results) over an injectable transport (`services/bulk.service.ts`).
- [x] Retry with exponential backoff for 429/5xx/transient network errors +
  concurrency limiter (`utils/retry.ts`).

## 5. Python bridge scripts — done (code complete; live run needs Python)

- [x] `src/scripts/extract.py` — source-org query to CSV (`SOURCE_SF_*` env,
  `simple-salesforce` from `requirements.txt`).
- [x] `src/scripts/cleaner.py` — trim/normalize/boolean/date validation,
  clean CSV + errors CSV + JSON summary (stdlib only).
- [x] `src/scripts/id_resolver.py` — child lookup translation via parent ID
  maps with `fail|null|keep` modes + JSON summary (stdlib only).
- [x] `src/scripts/requirements.txt` + CLI contracts documented in each
  docstring and `src/scripts/README.md`.

## 6. Frontend core + wizard (Steps 1–10 + summary) — done

- [x] Vite + React + TS client, `:3000` with `/api` proxy to `:3001`.
- [x] Zustand wizard store with pruning + config hydration
  (`store/migrationStore.ts`); typed API client with server-error surfacing
  (`utils/api-client.ts`); SOQL preview (`utils/soql.ts`); config assembler
  (`utils/build-config.ts`); polling hook (`hooks/useJob.ts`,
  `useExtraction`, `useDataLoading`); inline UI primitives
  (`components/ui.tsx` — no CSS deps).
- [x] Step 1 — new vs import; upload → validate → preview counts → hydrate.
- [x] Step 2 — source connect (credentials), OAuth URL helper, disconnect.
- [x] Step 3 — target list (add/remove, max 10, nickname ≠ source).
- [x] Step 4 — object discovery with counts, search, multi-select in load order.
- [x] Step 5 — field tables with C/U badges, select all/none, read-only flags,
  per-reference-field parent mapping into `lookups`.
- [x] Step 6 — per-object filter rows (=, !=, >, <, >=, <=, IN, NOT IN, LIKE)
  with live SOQL preview.
- [x] Step 7 — extraction settings, start, live progress, pause/resume/cancel,
  manifest download link.
- [x] Step 8 — load-target selection + insert/update/upsert strategy.
- [x] Step 9 — per-target permission checks; failures block continuing.
- [x] Step 10 — per-target load jobs with progress, pause/resume/cancel,
  report + error-log links, failed-row retry.
- [x] Summary — review all sections, export JSON/YAML download, jump-to-edit,
  confirm into extraction.

## 7. Extraction & loading execution — done

- [x] Extraction worker — SOQL per object in order, paged streaming to
  `data/extracted/<job>/`, `Id`-first columns, manifest.json, pause/resume/
  cancel, per-object files + download endpoints.
- [x] Loading worker — dependency order, lookup translation through ID maps
  (`source_id,target_id` per object), `Id` never inserted, REST (≤2000 rows)
  or Bulk 2.0, per-object ID maps, errors CSV + report JSON + persisted
  failed rows with retry endpoint.
- [x] Validation worker — per-field writability per operation, `Id` warning,
  missing-object failures, `canProceed` gate, persisted reports.

## 8. Tests — done

- [x] Unit — config validator (+ lookups rules), SOQL, retry, CSV, Bulk
  (fake transport), org store (temp dir), jobs store, api-response, files,
  python-bridge.
- [x] Integration — full extract → validate → load against a fake
  Salesforce connection (lookup resolution asserted); HTTP routes
  (health, export → multipart re-import, invalid-config details, 404s).
- [x] Scale — 20k-row CSV round-trip correctness (streaming design keeps
  memory flat: paged queries, chunked batches, file-backed payloads).
- [x] UX benchmark — contrast 14/14 (WCAG 1.4.3), axe-core 0 violations on
  all 11 screens, focus-visible rings, 34px+ targets, reduced-motion
  support, ARIA roles/live regions. Report: `docs/UX_BENCHMARK.md`.

## 9. Docs — done

- [x] `README.md` (setup, tree, scripts, Python, wizard flow).
- [x] `docs/` — `SETUP.md`, full `API_SPECIFICATION.md`, `USER_GUIDE.md`,
  `TROUBLESHOOTING.md` (OAuth/API pitfalls), `UX_BENCHMARK.md` (audit +
  scorecards), `legacy/PROJECT_GUIDE.md`.

## 10. Conventions (unchanged)

- Extensionless relative imports; all API traffic via `ok()`/`fail()` and
  the client `api` helper; one file per step/router/service; stubs carry no
  silent gaps — every `TODO` names its section.

---

## Live verification (needs a sandbox + Python — not yet run here)

1. `npm run dev`, connect a sandbox as source, extract one small object.
2. Validate + load into a second sandbox; compare counts and spot-check lookups.
3. `pip install -r src/scripts/requirements.txt`; run each script `--help`
   and on the extracted CSVs; compare with the Node pipeline output.
