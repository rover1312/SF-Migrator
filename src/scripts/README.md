# Python helpers

Heavy data processing lives here (CHECKLIST §5):

- `id_resolver.py` — replace source lookup IDs with target IDs
- `cleaner.py` — normalize/clean extracted data
- `extract.py` / `migrate.py` — ported from `docs/legacy/PROJECT_GUIDE.md` as needed

Keep the Node ↔ Python protocol simple: JSON over stdio for control
messages, files in `data/` for record payloads (never whole datasets in
memory).
