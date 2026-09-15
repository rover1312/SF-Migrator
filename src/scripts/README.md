# Python helpers

Standalone data-processing scripts (stdlib only, except `extract.py`).
Install live-extraction deps with `pip install -r requirements.txt`.

- `extract.py` — query the source org (`SOURCE_SF_*` env) to CSV.
- `cleaner.py` — trim/normalize/validate extracted CSVs; writes clean CSV +
  errors CSV; prints a JSON summary.
- `id_resolver.py` — translate child lookup IDs via a parent ID map
  (`source_id,target_id`); `--on-missing fail|null|keep`; prints JSON summary.

Contract with the Node side: files in `data/` carry records (CSVs with
`Id`-first columns, ID maps as `source_id,target_id`); JSON over stdio
carries control messages and summaries. Each script documents its CLI in
its docstring — run with `--help`.
