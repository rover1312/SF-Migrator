# AutoLoader v1.2 Generic Project Guide

## 1. Purpose and Scope

AutoLoader is a Python utility for moving related Salesforce data from a source org into a refreshed target sandbox. Its primary use case is a post-sandbox-refresh migration: extract a defined set of records from one Salesforce org, prepare the data locally, and insert the records into another org while translating Salesforce IDs used by lookup fields.

This guide intentionally uses a dummy data model. Names such as `Customer`, `ProductConfiguration__c`, and `OrderHistory__c` are examples only; they do not describe any particular Salesforce org. Replace the example object names, fields, and file names with the schema of the team adopting the utility.

The project is designed around these assumptions:

- The target sandbox has been refreshed and is treated as a new destination.
- Data is loaded in a configured dependency order.
- Source Salesforce IDs are used as temporary migration keys, not as target IDs.
- Source IDs are retained locally in `__source_id`.
- Source IDs are never sent in an insert payload as the Salesforce `Id` field.
- Successful target IDs are stored in per-object ID maps.
- Child lookup fields are changed from source IDs to the corresponding target IDs before insertion.
- The process is insert-oriented. It does not provide a transactional rollback across objects.

The repository contains the reusable implementation and configuration pattern needed to run the workflow after environment setup and input preparation. The sample values in this guide are illustrative and should be treated as a template, not as a description of a populated source or target org.

## 2. High-Level Architecture

The project has five cooperating layers:

1. **Configuration**: YAML and CSV files define object fields, mappings, load order, and extraction scope.
2. **Extraction**: `scripts/extract.py` connects to the source org, queries the root object and related parents, and writes local source files.
3. **Cleaning and preparation**: `scripts/cleaner.py` loads CSV/XLSX files, filters fields, normalizes values, and validates data.
4. **ID resolution**: `scripts/id_resolver.py` replaces source lookup IDs with target IDs from previous load results.
5. **Loading and orchestration**: `scripts/sf_api.py` inserts records into the target org; `scripts/migrate.py` coordinates object processing, state, logging, and the CLI.

Shared services in `scripts/utils.py` provide paths, configuration loading, logging, file discovery, CSV/JSON output, chunking, and execution-state management.

## 3. End-to-End Workflow

### 3.1 Automatic workflow

The normal command is:

```powershell
python scripts/migrate.py
```

Automatic mode performs this sequence:

1. Load the object order from `config/load_order.yaml`.
2. Check whether extraction output is present and valid.
3. Run source extraction when required.
4. Connect to the target Salesforce org.
5. Process each object in dependency order.
6. Discover the object's CSV or XLSX source file.
7. Load the file into a pandas DataFrame.
8. Preserve the source `Id` as `__source_id`.
9. Normalize null-like values and whitespace.
10. Remove excluded and unknown columns.
11. Add missing configured fields as null values.
12. Convert Boolean and Date fields according to object configuration.
13. Resolve configured lookup fields using previously generated ID maps.
14. Write a processed pre-insert CSV.
15. Insert rows that remain in `ready` status.
16. Store source-to-target IDs in an ID map.
17. Merge API results and row statuses into the processed CSV.
18. Write pre-insert errors, API errors, and an object summary.
19. Update `logs/execution_state.json`.

An object is marked `completed` only when it has no pre-insert or API errors. If some rows fail, it is marked `completed_with_errors`. Fatal object-level exceptions are recorded as `failed_fatal` and propagated to the main orchestration layer.

### 3.2 Extraction workflow

The extraction entry point is `scripts/extract.py:run_extraction()`.

1. Load `config/extraction/extraction_scope.yaml`.
2. Authenticate to the source Salesforce org using `SOURCE_SF_*` variables.
3. Use the configured example root object, `OrderHistory__c`.
4. Build a SOQL query from configured allowed fields and lookup fields.
5. Apply the root `where` clause when active.
6. Apply the current root limit, which is `10`.
7. Save root records to `output/extracted/source/OrderHistory__c.csv`.
8. Collect source lookup IDs from the root records.
9. Query related parent records by Salesforce ID in chunks of `200`.
10. Write parent source files and scope ID files.
11. Continue dependency expansion up to the configured maximum depth.
12. Write extraction summary and completion-marker JSON files.

Extraction uses `query_all()`, so Salesforce query pagination is handled by simple-salesforce.

The example extraction configuration uses a root limit of `10` and no active filter to keep demonstrations small. Teams should replace this sample scope with an intentional filter and limit before production use.

### 3.3 Loading workflow

The loading entry point is `scripts/migrate.py:main()`.

The loader keeps internal control columns alongside business data:

- `__source_id`: original Salesforce ID from the source org.
- `__row_status`: preparation or API result status.
- `__row_error`: accumulated validation, lookup, or API error messages.
- `__object`: Salesforce object API name.
- `__orig_<field>`: original source lookup value retained while resolving a lookup.

Every column beginning with `__` is excluded from Salesforce payloads. The literal `Id` is also excluded, preventing source IDs and local control fields from being sent to Salesforce.

## 4. Salesforce Connections

### 4.1 Environment variables

Copy `.env.example` to `.env` and provide credentials for both orgs. The project uses `python-dotenv` to load environment variables.

Source connection variables:

```text
SOURCE_SF_USERNAME
SOURCE_SF_PASSWORD
SOURCE_SF_SECURITY_TOKEN
SOURCE_SF_DOMAIN
SOURCE_SF_API_VERSION
```

Target connection variables:

```text
TARGET_SF_USERNAME
TARGET_SF_PASSWORD
TARGET_SF_SECURITY_TOKEN
TARGET_SF_DOMAIN
TARGET_SF_API_VERSION
```

Defaults used when domain or API version is not provided:

- Domain: `test`
- API version: `60.0`

Use `test` for a sandbox-style login endpoint and `login` for a production Salesforce endpoint, subject to the org's authentication setup.

### 4.2 Source client

`extract.py:get_source_salesforce_client()` constructs a `simple_salesforce.Salesforce` client from the `SOURCE_SF_*` variables. Authentication failures and missing credentials are surfaced before extraction begins.

The source client is used for SOQL queries only. It does not write data.

### 4.3 Target client

`sf_api.py:SalesforceClient.from_env()` constructs the target client from `TARGET_SF_*` variables. The target client supports:

- Standard REST `create()` calls for smaller datasets.
- Bulk API inserts for larger datasets.
- Automatic selection based on row count.
- Retry handling.
- Serial Bulk API processing.
- Row-level success and failure capture.

The default selection threshold is more than `2,000` rows for Bulk API use. Standard REST processing uses individual record creation calls grouped into batches of `200` for processing and logging. Bulk payload chunks are up to `10,000` records and use serial processing.

The implementation retries failed operations up to three times. Standard REST retries include a three-second delay between attempts. API failures are retained at row level.

### 4.4 Connection prerequisites

The Salesforce users need permission to authenticate to both orgs, query source objects and fields, create target objects and fields, read target IDs returned by inserts, and use the relevant REST and Bulk APIs. Source access must include the lookup relationships needed to build parent extracts.

Salesforce validation rules, required fields, duplicate rules, sharing, Record Type restrictions, and field-level security can still cause target inserts to fail.

## 5. Load Order and Dependency Model

The example order in `config/load_order.yaml` is:

1. `Customer`
2. `CatalogItem__c`
3. `ProductAttribute__c`
4. `MaterialGrade__c`
5. `ProductConfiguration__c`
6. `CustomerProductLink__c`
7. `OrderHistory__c`

This order is significant because later objects use ID maps created by earlier objects.

Important dependency relationships:

- `CustomerProductLink__c` references `Customer`.
- `OrderHistory__c` references `Customer`.
- `OrderHistory__c` references `CustomerProductLink__c`.
- `OrderHistory__c` references `CatalogItem__c`.
- `OrderHistory__c` references `ProductConfiguration__c`.
- `OrderHistory__c` references `MaterialGrade__c`.
- `OrderHistory__c` references `ProductAttribute__c`.

The loader does not infer a dependency graph at runtime. A mapping that references an object not yet processed will encounter a missing or incomplete ID map.

## 6. Lookup and ID Resolution

### 6.1 Why ID maps are required

Salesforce IDs are org-specific. A source ID is generally not valid as the corresponding record ID in the target org. The loader uses the source ID as a local key and records the target ID after insertion:

```text
source Customer Id  -> target Customer Id
001SOURCE...       -> 001TARGET...
```

When a child contains the source Customer ID, the loader sends the mapped target ID.

### 6.2 ID map format

ID maps are written to:

```text
output/id_maps/<object>_idmap.csv
```

Required columns:

```text
source_id,target_id
```

Successful inserts and duplicate-adopted records are eligible for the map. Rows that fail before insertion do not produce a target ID and cannot satisfy downstream lookups.

### 6.3 Mapping behavior

The resolver is `scripts/id_resolver.py:resolve_lookups()`:

1. Load the source-to-target map for the referenced object.
2. Preserve the original lookup value as `__orig_<field>`.
3. Normalize the source lookup value to a string key.
4. Find the source ID in the referenced object's map.
5. Replace the lookup with the target ID.
6. Apply the configured behavior if no target ID is available.

Supported missing-lookup behaviors:

- `fail_row`: mark the row failed and append an error.
- `null_field`: set the lookup to null and continue.
- `keep_as_is`: retain the source value as-is.

For in-scope relationships, the normal/default behavior is `fail_row`. This prevents a source-org ID from being sent to the target.

### 6.4 Active mappings

`CustomerProductLink__c_mapping.yaml` resolves six Customer lookup fields. `OrderHistory__c_mapping.yaml` resolves Customer, customer-product link, catalog item, product configuration, material grade, and product attribute lookups.

These objects currently have no active in-scope lookup mappings:

- `Customer`
- `CatalogItem__c`
- `ProductAttribute__c`
- `MaterialGrade__c`

`ProductConfiguration__c` preserves these example out-of-scope fields as-is:

- `CategoryCode__c`
- `TechnicalDefinition__c`
- `ChannelCode__c`

`OrderHistory__c` preserves these example out-of-scope fields as-is:

- `SourceBusinessKey__c`
- `LegacyStatus__c`

Out-of-scope fields are not translated through an ID map. They are safe to preserve only when they are not Salesforce IDs requiring cross-org translation, or when the target org intentionally accepts the same values.

## 7. Data Preparation Rules

### 7.1 Supported input files

`scripts/cleaner.py:load_source_dataframe()` supports CSV and XLSX files. XLSX files are read with `openpyxl`. Every configured object currently expects `Id` as its source ID column.

### 7.2 File discovery

`utils.find_source_file()` searches in this order:

1. Configured glob patterns.
2. An exact filename stem matching the Salesforce object API name.
3. A case-insensitive filename containing the object API name.

Ambiguous matches are rejected.

### 7.3 Field allowlists and exclusions

The object YAML is a field contract:

- `allowed_fields` identifies fields that may be loaded.
- `exclude_fields` explicitly prevents fields from loading.
- Unknown input columns are ignored and logged.
- Missing allowed fields are added as null values.
- Internal columns are retained locally but never sent to Salesforce.

### 7.4 Null and whitespace handling

`utils.normalize_dataframe_values()` trims strings and converts configured null-like values to null. Recognized values include empty strings and case variants of `nan`, `none`, and `null`.

`blank_as_null_fields` controls which fields use this behavior. When absent, it defaults to the allowed fields.

### 7.5 Boolean conversion

Configured Boolean fields accept:

```text
true, t, 1, yes, y
false, f, 0, no, n
```

Invalid Boolean values mark a row as failed before an API call.

### 7.6 Date conversion

Configured Date fields are normalized to `YYYY-MM-DD`. Parsing uses `dayfirst=True`, so `01-01-2018` means 1 January 2018. Values that cannot be normalized mark the row failed before insertion.

## 8. Configuration Reference

### 8.1 Object configuration files

Object files are under `config/objects/`. Supported keys are:

```yaml
object_api_name: SalesforceObjectApiName
source_id_column: Id
source_file_patterns: []
required_fields: []
allowed_fields: []
exclude_fields: []
boolean_fields: []
date_fields: []
strip_whitespace_fields: []
blank_as_null_fields: []
```

The seven example object configurations are:

- `Customer.yaml`: customer fields, including Boolean and Date fields.
- `CatalogItem__c.yaml`: catalog item name, currency, description, and external key fields.
- `ProductAttribute__c.yaml`: product attribute and classification fields.
- `MaterialGrade__c.yaml`: material grade and dimensional fields.
- `ProductConfiguration__c.yaml`: product configuration, language, JSON, color, and tolerance data.
- `CustomerProductLink__c.yaml`: customer relationship and search-criteria data.
- `OrderHistory__c.yaml`: order, product, delivery, customer, packaging, tolerance, and integration data.

### 8.2 Mapping files

Mapping files are under `config/mappings/`. They define lookup translation independently from field allowlists:

- `Customer_mapping.yaml`: no active lookups; out-of-scope default is `null_field`.
- `CatalogItem__c_mapping.yaml`: no active lookups.
- `ProductAttribute__c_mapping.yaml`: no active lookups.
- `MaterialGrade__c_mapping.yaml`: no active lookups.
- `ProductConfiguration__c_mapping.yaml`: three out-of-scope fields preserved as-is.
- `CustomerProductLink__c_mapping.yaml`: six Customer lookups.
- `OrderHistory__c_mapping.yaml`: Customer, customer-product link, catalog item, product configuration, material grade, and product attribute lookups, plus two out-of-scope fields.

When adding a lookup, update both the object field configuration and mapping configuration. Verify that the referenced object appears earlier in `load_order.yaml` and that its ID map is created first.

### 8.3 Extraction scope

`config/extraction/extraction_scope.yaml` defines the root extraction object, output paths, chunk size, depth, root limit, and lookup scope. Active settings include:

```yaml
source_object: OrderHistory__c
root_limit: 10
query_chunk_size: 200
max_depth: 2
include_out_of_scope_lookups: false
```

The file also includes `enabled`, `direction`, `missing_lookup_behavior`, and `overwrite_existing_files`. The current Python implementation does not fully enforce these optional configuration keys:

- Per-object `enabled` is not used by `run_extraction()`.
- `direction` does not change traversal.
- `source_object` does not override traversal in the current implementation.
- `missing_lookup_behavior` is not applied by extraction.
- `overwrite_existing_files` is not consulted.
- The `force` argument is accepted but does not change file handling.

The Python implementation is the source of truth for actual behavior.

### 8.4 Load order

`config/load_order.yaml` is authoritative for object sequence. Update it whenever an object is added, removed, renamed, or moved due to a dependency.

### 8.5 Generic reference mapping

`config/reference_mappings/reference_mapping.csv` is an optional example for translating non-record ID reference values. It contains:

```text
reference_type
reference_name
source_value
target_value
active
```

The Python implementation does not currently read this optional file. Teams may use it as a design reference when adding support for a target-specific reference translation, but it must not be treated as an active feature until code reads it and tests verify the behavior.

Any target-specific reference value that is passed through without translation can be invalid in the destination. Treat reference mappings as a required design decision for each adopting team.

## 9. Command-Line Interface

### Automatic processing

```powershell
python scripts/migrate.py
```

Runs extraction when required and processes all objects in configured order.

### Resume processing

```powershell
python scripts/migrate.py --resume
```

Skips objects whose state is exactly `completed`. Objects marked `completed_with_errors` or `failed_fatal` are retried.

### Process one object

```powershell
python scripts/migrate.py --object Customer
```

Processes one object and exits. This is useful for testing configuration or retrying a single object.

### Interactive mode

```powershell
python scripts/migrate.py --interactive
```

The interactive menu supports:

- `E`: run source extraction.
- `I`: switch input folder.
- `N`: run the next incomplete object.
- `S`: select a specific object.
- `U`: rerun an object while keeping local output.
- `R`: reset one object's local output and state.
- `V`: view statuses.
- `Q`: quit.

The target Salesforce connection is not opened until a load operation is selected.

### Extraction and directory options

```powershell
python scripts/migrate.py --force-extract
python scripts/migrate.py --skip-extract
python scripts/migrate.py --input-dir PATH
python scripts/migrate.py --extract-dir PATH
```

`--force-extract` requests extraction before automatic loading. `--skip-extract` bypasses extraction validation and loads from the input directory. `--input-dir` changes the source data directory and `--extract-dir` changes the extracted directory checked by automatic mode.

### Reset local state

```powershell
python scripts/migrate.py --reset-object Customer
```

This removes local processed files, ID maps, error files, and the object summary. It does not delete Salesforce records. A later run can create or adopt duplicates depending on target duplicate rules.

## 10. Output and Logging

### 10.1 Migration outputs

For each object, the loader may write:

```text
output/processed/<object>_processed.csv
output/id_maps/<object>_idmap.csv
output/errors/<object>_preinsert_errors.csv
output/errors/<object>_api_errors.csv
logs/<object>_summary.json
logs/migration_summary.json
logs/execution_state.json
```

The processed CSV is the main audit file. It contains normalized values, internal columns, statuses, and errors. Pre-insert errors contain local validation or lookup failures. API errors contain Salesforce responses.

### 10.2 Extraction outputs

Extraction writes:

```text
output/extracted/source/<object>.csv
output/extracted/scopes/<object>_ids.csv
output/extracted/extraction_summary.json
output/extracted/.extraction_done.json
```

The source directory contains records intended for loading. Scope files record IDs used to expand related dependencies.

### 10.3 Logging implementation

`utils.get_logger()` configures console logging and a rotating file logger at `logs/migration.log`:

- Level: `INFO`.
- Maximum file size: `5,000,000` bytes.
- Backup files: `5`.

### 10.4 Execution state

`logs/execution_state.json` stores per-object status:

- `not_started`
- `completed`
- `completed_with_errors`
- `failed_fatal`

Only exactly `completed` is skipped by resume mode. This permits retrying partial or failed work.

## 11. Salesforce Insert Behavior

### REST mode

For up to 2,000 rows, the standard path calls Salesforce `create()` for each record. Processing is organized into batches of 200, and individual failures are retained with their source row.

Successful inserts return target IDs. These IDs are joined back to source IDs and written to the object's ID map.

### Bulk mode

For more than 2,000 rows, records are divided into chunks of up to 10,000 and sent through the Bulk API with `use_serial=True`.

The current implementation associates Bulk results with source rows by positional order. It logs a warning when result count differs from input count. This is an implementation assumption and should be treated as a risk if response order is not guaranteed by the client or API behavior.

### Duplicate handling

The API client attempts to extract an existing Salesforce ID from structured duplicate responses or plain `DUPLICATE_VALUE` messages. When it can identify an ID, the row is treated as successful with a `duplicate` status and that ID is added to the map.

This is not a business-key upsert. It is an insert attempt followed by duplicate-ID adoption when Salesforce supplies an ID.

## 12. File-by-File Reference

### Root files

- `README.MD`: project introduction describing migration purpose, insert-only principles, source/target ID mapping, and supported order.
- `.env.example`: template for source and target credentials and connection options. Secret values are blank.
- `PROJECT_GUIDE.md`: this agent-oriented technical and operational reference.

### Python implementation

- `scripts/extract.py`: source authentication, SOQL construction, root extraction, dependency ID collection, parent extraction, scope-file writing, and extraction summaries.
- `scripts/extraction_utils.py`: validates that extracted files exist and contain data for configured load-order objects.
- `scripts/cleaner.py`: locates source files, loads CSV/XLSX data, preserves source IDs, filters fields, normalizes values, and validates Boolean/Date fields.
- `scripts/id_resolver.py`: replaces source lookup IDs with target IDs using generated ID maps.
- `scripts/sf_api.py`: target authentication, payload construction, REST/Bulk insertion, retries, duplicate handling, and API result capture.
- `scripts/migrate.py`: CLI, automatic mode, interactive mode, single-object processing, extraction coordination, output generation, and state updates.
- `scripts/utils.py`: shared paths, directory creation, logging, YAML loading, source-file matching, normalization, chunking, CSV/JSON writing, execution state, reset behavior, and interactive status display.

### Configuration files

- `config/load_order.yaml`: the seven-object load order.
- `config/extraction/extraction_scope.yaml`: root object, root limit, extraction paths, chunk size, and dependency expansion settings.
- `config/reference_mappings/reference_mapping.csv`: optional source-to-target reference values; currently unused by Python code.
- `config/objects/Customer.yaml`: Customer field allowlist, exclusions, Boolean fields, and Date fields.
- `config/objects/CatalogItem__c.yaml`: catalog item field allowlist and exclusions.
- `config/objects/ProductAttribute__c.yaml`: product attribute field allowlist and exclusions.
- `config/objects/MaterialGrade__c.yaml`: material grade field allowlist and exclusions.
- `config/objects/ProductConfiguration__c.yaml`: product configuration field allowlist and exclusions.
- `config/objects/CustomerProductLink__c.yaml`: customer-product link field allowlist and exclusions.
- `config/objects/OrderHistory__c.yaml`: order history field allowlist and exclusions.
- `config/mappings/Customer_mapping.yaml`: no active Customer lookup translations.
- `config/mappings/CatalogItem__c_mapping.yaml`: no active catalog item lookup translations.
- `config/mappings/ProductAttribute__c_mapping.yaml`: no active product attribute lookup translations.
- `config/mappings/MaterialGrade__c_mapping.yaml`: no active material grade lookup translations.
- `config/mappings/ProductConfiguration__c_mapping.yaml`: three example out-of-scope fields preserved as-is.
- `config/mappings/CustomerProductLink__c_mapping.yaml`: six Customer lookup translations.
- `config/mappings/OrderHistory__c_mapping.yaml`: the main order-history parent lookup translations and two example out-of-scope fields.

### Runtime directories

- `input/`: expected location for manually supplied source files.
- `output/`: generated processed files, ID maps, errors, and extraction output.
- `logs/`: generated logs, summaries, and execution state.
- `.sf/`: Salesforce CLI workspace/cache data, ancillary to the Python migration flow.
- `.venv/`: local Python virtual environment containing the inspected runtime packages.

## 13. Technical Specifications

The inspected environment uses:

- Python `3.13.2`.
- pandas `3.0.2`.
- PyYAML `6.0.3`.
- python-dotenv `1.2.2`.
- simple-salesforce `1.12.9`.
- openpyxl `3.1.5`.

The implementation also uses standard-library modules including `argparse`, `datetime`, `dataclasses`, `json`, `logging`, `os`, `pathlib`, `re`, `time`, and `typing`.

Data formats are YAML for configuration, CSV for source/processed/scope/map/error files, XLSX for supported input workbooks, JSON for summaries and state, and Salesforce REST/Bulk APIs through simple-salesforce.

There is no `requirements.txt`, `pyproject.toml`, `Pipfile`, or lock file. Reproducible setup depends on the bundled virtual environment or manually installing compatible versions of the packages above.

## 14. Recommended Operating Procedure

1. Confirm the target sandbox refresh is complete and the intended target is correct.
2. Create `.env` from `.env.example` and provide source and target credentials.
3. Review `config/load_order.yaml` and confirm dependencies are ordered correctly.
4. Review the extraction root and limit in `config/extraction/extraction_scope.yaml`.
5. Review object allowlists and mapping files for the migration scope.
6. Identify any destination-specific reference values that need translation; optional reference mappings are not active automatically.
7. Run a small extraction first using the current root limit or a deliberately scoped filter.
8. Inspect extracted CSVs and scope files.
9. Load parent objects individually when testing a new mapping.
10. Run the full workflow with `python scripts/migrate.py`.
11. Monitor `logs/migration.log` and per-object summaries.
12. Inspect processed files, pre-insert errors, API errors, and ID maps.
13. Use `--resume` only after reviewing state and deciding which partial results should be retried.
14. Validate target record counts and lookup relationships in Salesforce.

Do not delete local ID maps casually: downstream objects depend on them. Resetting local state does not delete target records.

## 15. Error Handling and Diagnostics

The project handles and reports missing credentials, invalid YAML, missing directories or source files, ambiguous file matches, unsupported extensions, missing source IDs, missing required fields, invalid Boolean/Date values, missing or malformed ID maps, unresolved lookups, REST errors, Bulk API errors, and fatal object exceptions.

For a failed object, inspect artifacts in this order:

1. `logs/<object>_summary.json` for counts and high-level status.
2. `output/errors/<object>_preinsert_errors.csv` for local validation and lookup failures.
3. `output/errors/<object>_api_errors.csv` for Salesforce responses.
4. `output/processed/<object>_processed.csv` for row-level status and context.
5. `logs/migration.log` for retries, stack traces, and orchestration context.
6. `output/id_maps/<parent>_idmap.csv` when a child lookup cannot be resolved.

## 16. Current Limitations and Risks

1. The object names and field names in this guide are illustrative and must be replaced with the adopting team's configuration.
2. A migration should be tested with representative source data before production use.
3. No dependency manifest or lock file is committed.
4. Optional reference mappings are not consumed by the current Python implementation.
5. Destination-specific reference values may be sent unchanged unless a translation feature is implemented.
6. Several extraction configuration flags are present but not enforced.
7. The extraction `force` parameter does not currently change file handling.
8. Extraction validation expects a non-empty file for every object in load order, even when the root query returns no records.
9. The example extraction limit is ten root records and should be replaced with an intentional scope.
10. Failed parent rows do not produce target IDs, so dependent child lookups can fail.
11. Bulk result matching relies on positional order.
12. There is no dry-run mode.
13. There is no Salesforce delete or rollback operation.
14. Retries are not transactional across an object.
15. Rerunning an object can create or adopt duplicates depending on target duplicate rules.
16. The implementation assumes object API names are accessible through simple-salesforce attribute lookup.

## 17. Extension Guidance for Future Agents

When adding an object:

1. Add its object YAML under `config/objects/`.
2. Add its mapping YAML under `config/mappings/`.
3. Add it to `config/load_order.yaml` after all parent objects.
4. Add extraction traversal support if it is not reachable through the existing mapping structure.
5. Verify source ID field and source file pattern.
6. Define Boolean and Date fields explicitly.
7. Test missing lookup behavior with valid and unresolved IDs.
8. Run the object alone, inspect its processed CSV and ID map, then test its dependents.

When adding a lookup:

1. Confirm the field is present in `allowed_fields`.
2. Add the lookup relationship to the mapping file.
3. Confirm the referenced object is earlier in load order.
4. Confirm the referenced object's ID map uses `source_id` and `target_id`.
5. Decide whether unresolved values should fail, become null, or remain unchanged.
6. Test a valid source ID, a blank value, and an unknown source ID.

When changing Salesforce API behavior, preserve the audit contract: every source row should remain traceable through `__source_id`, row status, error details, and the generated ID map where a target ID exists.
