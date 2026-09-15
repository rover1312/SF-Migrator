# SF-Migrator — Local-First Salesforce Data Migration

Local-first web app for configuring, extracting, validating, and migrating
Salesforce data between orgs. Everything runs on `localhost`; all data stays
on your machine.

See `PLAN.md` for architecture and `CHECKLIST.md` for implementation status.
Legacy Python-only notes live in `docs/legacy/PROJECT_GUIDE.md`.

## Quick start

```bash
git clone <repository-url>
cd sf-migrator

npm install

# Start backend + frontend together
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

## Project structure

```text
sf-migrator/
├── src/
│   ├── client/        # React + TypeScript UI (wizard steps 1-10)
│   │   ├── components/  # One file per wizard step
│   │   ├── hooks/       # Data-fetching hooks
│   │   ├── store/       # Zustand wizard state
│   │   └── utils/       # API client
│   ├── server/        # Node.js + Express API
│   │   ├── config/        # Migration JSON Schema
│   │   ├── routes/      # One router per resource
│   │   ├── services/    # Auth, metadata, Bulk, jobs, extract/load/validate
│   │   ├── middleware/  # Logging, uploads, error handling
│   │   ├── utils/       # Config, logger, files, SOQL, CSV, retry
│   │   └── types/       # Shared TypeScript types
│   └── scripts/       # Python helpers (extract, cleaner, id_resolver)
├── data/
│   ├── extracted/     # Extracted CSV/JSON (local only)
│   ├── configs/       # Saved migration configs
│   ├── logs/          # Migration logs
│   └── temp/          # Temporary processing files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── SETUP.md
│   ├── API_SPECIFICATION.md
│   ├── USER_GUIDE.md
│   └── legacy/        # Old Python-only guide
│   ├── TROUBLESHOOTING.md (in docs/ — OAuth/API pitfalls)
├── PLAN.md
├── CHECKLIST.md
├── .env.example
└── package.json
```

## Scripts

| Command            | Purpose                              |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Run backend + frontend with reload   |
| `npm run dev:server` | Run Express API only (`:3001`)     |
| `npm run dev:client` | Run Vite UI only (`:3000`)         |
| `npm run build`    | Build both server and client         |
| `npm start`        | Run built server                     |
| `npm test`         | Run Jest tests (unit + integration)  |
| `npm run lint`     | Run ESLint                           |
| `npm run format`   | Run Prettier                         |
| `npm run typecheck` | Type-check server                   |
| `npm run typecheck:client` | Type-check client           |

## Python scripts (optional)

The Node pipeline works without Python. For standalone heavy processing:

```bash
pip install -r src/scripts/requirements.txt
python src/scripts/extract.py --help
python src/scripts/cleaner.py --help
python src/scripts/id_resolver.py --help
```

## Configuration

1. Copy `.env.example` to `.env`.
2. Set `SF_CLIENT_ID` / `SF_CLIENT_SECRET` for OAuth, or use
   username/password in the UI (Step 2 / Step 3).
3. Data is stored under `./data/` by default.

## Wizard flow

1. Config mode (new / import)
2. Source org auth
3. Target org(s) auth
4. Object selection
5. Field selection + permission colors
6. Filter configuration (SOQL WHERE)
7. Extraction (local files)
8. Target selection for loading
9. Permission validation on targets
10. Data loading + report

Each step is one component in `src/client/components/` and one or two
API routes under `src/server/routes/`.
