# SF-Migrator - Local-First Web Application

## Executive Summary

This document outlines the technical architecture, implementation strategy, and test scope for a **local-first web application** that provides an intuitive UI for configuring, extracting, validating, and migrating Salesforce data between orgs. The application runs entirely on your local machine with no cloud dependencies, storing all data locally. Users can clone the repository and run 1-2 commands to launch a local web UI with Salesforce authentication.

---

## 1. Project Overview

### 1.1 Current Challenges Addressed

1. **Manual YAML Configuration**: Users must manually configure object fields, field types, and object order in YAML files
2. **Manual Filter Logic**: WHERE queries must be manually written in YAML configuration
3. **No Visual Feedback**: No UI to view available objects, fields, or permissions before extraction
4. **Static Configuration**: No ability to export/import configurations dynamically
5. **Permission Validation**: No pre-validation of target org permissions before data loading
6. **Complex Setup**: Previous solutions required complex installation or cloud hosting

### 1.2 Solution Vision

A **local-first web application** that:
- Runs entirely on localhost with no cloud dependencies
- Provides step-by-step wizard interface for migration configuration
- Dynamically discovers objects and fields from Source Org
- Visualizes field-level CRUD permissions with color coding
- Allows dynamic filter configuration via UI
- Exports/Imports configuration as JSON/YAML
- Validates target org permissions before data loading
- Supports multiple target orgs
- Provides real-time error feedback and retry capabilities
- Stores all extracted data locally on the user's machine
- Processes millions of records with efficient batching and memory management
- Simple setup: `git clone` + `npm install` + `npm run dev`

### 1.3 Architecture Decision: Local-First Web App

**Why not a Chrome Extension?**
- Chrome extensions cannot execute Python code natively
- Limited memory and processing power for millions of records
- Cannot run background processes reliably
- Complex distribution and update mechanism

**Why not a Cloud-Hosted Service?**
- Requires AWS/GCP/Azure hosting costs
- Security concerns with sensitive Salesforce data in the cloud
- Network latency for large data transfers
- Ongoing maintenance and monitoring requirements

**Local-First Benefits:**
- All data stays on user's machine
- No hosting costs
- Full control over security
- Direct integration with existing Python scripts
- Simple deployment (just run locally)
- No internet dependency after initial setup

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Web UI (Localhost)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Local Web Server (Node.js + Express)          │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  API Endpoints:                                            │  │
│  │  /api/auth/org           - Org authentication             │  │
│  │  /api/objects/list       - List available objects         │  │
│  │  /api/fields/describe    - Get field metadata             │  │
│  │  /api/extract            - Extract data                   │  │
│  │  /api/validate           - Validate permissions           │  │
│  │  /api/load               - Load data to target            │  │
│  │  /api/config/export      - Export configuration           │  │
│  │  /api/config/import      - Import configuration           │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                                  │
┌─────────────────────────────────────────────────▼─────────────────┐
│              Python Integration Layer                             │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │         Python Bridge (child_process / JSON RPC)             │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  Reuse existing scripts:                                    │  │
│  │  - scripts/extract.py                                       │  │
│  │  - scripts/cleaner.py                                       │  │
│  │  - scripts/id_resolver.py                                   │  │
│  │  - scripts/sf_api.py                                        │  │
│  │  - scripts/migrate.py                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                                  │
┌─────────────────────────────────────────────────▼─────────────────┐
│              Local File Storage                                   │
├───────────────────────────────────────────────────────────────────┤
│  - Extracted CSV/JSON files stored locally                       │
│  - Configuration files (JSON/YAML)                               │
│  - Migration logs and reports                                    │
│  - Temporary processing files                                    │
└───────────────────────────────────────────────────────────────────┘
                                                  │
┌─────────────────────────────────────────────────▼─────────────────┐
│              Salesforce Orgs                                      │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐        ┌──────────────┐                        │
│  │  Source Org  │◄──────►│  Target Orgs │                        │
│  │  (Extract)   │        │  (Load)      │                        │
│  └──────────────┘        └──────────────┘                        │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| UI Framework | React 18 + TypeScript | Component-based, type-safe UI development |
| Styling | Tailwind CSS + Headless UI | Rapid UI development with accessibility |
| State Management | Zustand | Lightweight, simple state management |
| Local Server | Node.js + Express.js | Fast API layer, easy integration with Python |
| Python Bridge | child_process + JSON RPC | Reuse existing Python scripts |
| Authentication | OAuth 2.0 (Salesforce) | Modern auth, supports passkeys |
| Data Storage | Local File System + SQLite | Store configs, extracted data, logs locally |
| File Handling | JSZip + FileSaver.js | Config export/import, CSV downloads |
| Testing | Jest + React Testing Library + Playwright | Unit, integration, E2E testing |

### 2.3 Directory Structure

```
sf-migrator/
├── src/
│   ├── client/                    # React Web UI
│   │   ├── components/
│   │   │   ├── Step1ConfigMode.tsx
│   │   │   ├── Step2SourceOrg.tsx
│   │   │   ├── Step3TargetOrgs.tsx
│   │   │   ├── Step4ObjectSelection.tsx
│   │   │   ├── Step5FieldSelection.tsx
│   │   │   ├── Step6FilterConfig.tsx
│   │   │   ├── Step7Extraction.tsx
│   │   │   ├── Step8TargetSelection.tsx
│   │   │   ├── Step9PermissionValidation.tsx
│   │   │   ├── Step10DataLoading.tsx
│   │   │   └── ConfigSummaryScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useOrgAuth.ts
│   │   │   ├── useObjectDiscovery.ts
│   │   │   ├── useFieldMetadata.ts
│   │   │   ├── useExtraction.ts
│   │   │   └── useDataLoading.ts
│   │   ├── store/
│   │   │   └── migrationStore.ts
│   │   ├── utils/
│   │   │   └── api-client.ts
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html
│   ├── server/                    # Node.js + Express Backend
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── objects.routes.ts
│   │   │   ├── fields.routes.ts
│   │   │   ├── extract.routes.ts
│   │   │   ├── validate.routes.ts
│   │   │   ├── load.routes.ts
│   │   │   └── config.routes.ts
│   │   ├── services/
│   │   │   ├── salesforce.service.ts
│   │   │   ├── extraction.service.ts
│   │   │   ├── validation.service.ts
│   │   │   ├── loading.service.ts
│   │   │   └── python-bridge.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── config.ts
│   │   └── index.ts
│   └── scripts/                   # Python Scripts (reused from original)
│       ├── extract.py
│       ├── cleaner.py
│       ├── id_resolver.py
│       ├── sf_api.py
│       └── migrate.py
├── data/                          # Local Data Storage
│   ├── extracted/                 # Extracted CSV/JSON files
│   ├── configs/                   # Configuration files
│   ├── logs/                      # Migration logs
│   └── temp/                      # Temporary processing files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── API_SPECIFICATION.md
│   ├── USER_GUIDE.md
│   └── SETUP.md
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 3. Quick Start Guide

### 3.1 Prerequisites

- Node.js 18+ installed
- Python 3.8+ installed
- Git installed
- Salesforce org credentials (Source and Target)

### 3.2 Installation & Running

```bash
# Clone the repository
git clone <repository-url>
cd sf-migrator

# Install dependencies
npm install

# Start the development server (launches both frontend and backend)
npm run dev

# Open browser to http://localhost:3000
```

### 3.3 First-Time Setup

1. Navigate to http://localhost:3000
2. Configure Source Org connection (OAuth or Username/Password)
3. Configure Target Org(s) connection
4. Select objects and fields to migrate
5. Configure filters (optional)
6. Extract data (stored locally in `data/extracted/`)
7. Validate permissions on target orgs
8. Load data to target orgs

---

## 4. Key Features

### 4.1 Configuration Management
- Upload/Export JSON/YAML configuration files
- Pre-populate wizard steps from uploaded config
- Config summary screen before extraction

### 4.2 Data Extraction
- Extract millions of records with efficient batching
- Store extracted data locally in CSV/JSON format
- Resume from checkpoints on failure

### 4.3 Data Processing
- ID replacement and lookup resolution
- Data cleaning and transformation
- Leverages existing Python scripts for heavy processing

### 4.4 Data Loading
- Load to multiple target orgs simultaneously
- Real-time progress tracking
- Error reporting and retry capabilities

---

## 5. Detailed UI Behavior & Step Logic

### Step 1: Configuration Mode Selection
**Purpose**: Allow user to choose between starting fresh or importing existing configuration

**UI Components**:
- Two large card buttons: "Start New Migration" and "Import Configuration"
- If "Import Configuration" selected:
  - File upload dropzone (accepts .json, .yaml, .yml)
  - File validation indicator (valid/invalid)
  - Preview button showing config summary
  - "Load Configuration" button

**Behavior**:
1. Default view shows both options
2. On file upload:
   - Validate file format (JSON/YAML)
   - Parse and validate against schema
   - Show success/error message
   - Enable "Load Configuration" button
3. On "Load Configuration":
   - Pre-populate all subsequent wizard steps with imported data
   - Navigate to Step 7 (Extraction) or allow review of all steps
4. On "Start New Migration":
   - Clear any existing configuration
   - Navigate to Step 2

**State Changes**:
- Sets `configMode` = 'new' | 'import'
- If import: populates `migrationConfig` state with parsed data

---

### Step 2: Source Org Authentication
**Purpose**: Authenticate and connect to the source Salesforce org

**UI Components**:
- Connection type selector: "OAuth 2.0" | "Username/Password" | "Custom Domain"
- OAuth flow:
  - "Connect with Salesforce" button
  - Opens Salesforce login popup
  - Callback handler
- Username/Password flow:
  - Instance URL input (e.g., https://login.salesforce.com)
  - Username input
  - Password input
  - Security token input (optional)
- Custom Domain flow:
  - My Domain URL input
  - OAuth client ID/secret inputs
- "Test Connection" button
- Connection status indicator (connected/disconnected)
- Org info display (once connected):
  - Org name
  - Org ID
  - Instance URL
  - User info

**Behavior**:
1. User selects connection type
2. Based on type, show appropriate form fields
3. On "Test Connection" or after OAuth callback:
   - Call `/api/auth/org` with credentials
   - Display loading spinner during authentication
   - On success:
     - Store auth token in state
     - Fetch and display org metadata
     - Enable "Next" button
     - Auto-advance to Step 3 (optional)
   - On failure:
     - Show error message with details
     - Highlight problematic fields
4. Persist connection in local storage for session

**State Changes**:
- Sets `sourceOrg.auth` = { type, token, instanceUrl, userId }
- Sets `sourceOrg.info` = { name, orgId, instanceUrl, userInfo }
- Sets `sourceOrg.connected` = boolean

**API Calls**:
- POST `/api/auth/org` - Authenticate org
- GET `/api/org/info` - Get org metadata

---

### Step 3: Target Org(s) Configuration
**Purpose**: Configure one or more target Salesforce orgs for data loading

**UI Components**:
- "Add Target Org" button
- List of configured target orgs (cards)
- Each target org card shows:
  - Org name
  - Instance URL
  - Connection status
  - "Edit" button
  - "Remove" button
  - "Test Connection" button
- Target org form (modal or inline):
  - Same connection options as Step 2
  - Org nickname/label input
- Maximum 10 target orgs allowed

**Behavior**:
1. Initially shows empty state with "Add Target Org" button
2. On "Add Target Org":
   - Open target org configuration form
   - Same authentication flows as Step 2
3. On successful connection:
   - Add org to target list
   - Show success notification
   - Enable "Next" button if at least 1 target configured
4. On "Test Connection":
   - Validate credentials without saving
   - Show temporary success/error message
5. On "Remove":
   - Show confirmation dialog
   - Remove from list
   - Update UI

**State Changes**:
- Sets `targetOrgs` = Array<{ id, nickname, auth, info, connected }>
- Sets `activeTargetOrg` for operations

**API Calls**:
- POST `/api/auth/org` - Authenticate each target org
- GET `/api/org/info` - Get org metadata

---

### Step 4: Object Selection
**Purpose**: Discover and select Salesforce objects to migrate

**UI Components**:
- Search/filter input for objects
- Object list with checkboxes (virtualized for performance)
- Each object row shows:
  - Object API name (e.g., Account, Contact)
  - Object label (e.g., Accounts, Contacts)
  - Record count (from source org)
  - Object type icon (Standard/Custom)
  - "Select All Fields" quick action
- Bulk actions:
  - "Select All" / "Deselect All" buttons
  - "Select Recommended" button (based on common patterns)
- Object dependency graph visualization (optional advanced view)
- Selected objects summary panel

**Behavior**:
1. On step load:
   - Call `/api/objects/list` to fetch available objects
   - Display loading skeleton
   - Populate object list
2. User searches/filters objects by name
3. User selects/deselects objects via checkboxes
4. On "Select All Fields" for an object:
   - Auto-expand object (if collapsed)
   - Check all field checkboxes for that object
   - Navigate to Step 5 with pre-selected fields
5. Validation:
   - At least 1 object must be selected to proceed
   - Warn if selecting objects with known dependencies not selected
6. Store selection order (important for migration sequence)

**State Changes**:
- Sets `selectedObjects` = Array<{ name, label, recordCount, selected, fields }>
- Sets `objectOrder` = Array<string> (ordered list of selected objects)

**API Calls**:
- GET `/api/objects/list` - Fetch available objects with metadata
- GET `/api/objects/:ObjectName/count` - Get record counts

---

### Step 5: Field Selection & Permission Visualization
**Purpose**: Select specific fields for each object and visualize CRUD permissions

**UI Components**:
- Tabbed interface or accordion for each selected object
- For each object:
  - Object header with name and selected field count
  - "Select All" / "Deselect All" toggles
  - Field list table with columns:
    - Checkbox (select/deselect)
    - Field API name
    - Field label
    - Data type icon (Text, Number, Date, Lookup, etc.)
    - CRUD permission indicators (color-coded badges):
      - Create: Green (allowed) / Red (not allowed) / Gray (N/A)
      - Read: Green / Red
      - Update: Green / Red
      - Delete: Green / Red
    - Required field indicator
    - Lookup target object (for reference fields)
- Permission legend explaining color coding
- Filter controls:
  - Filter by data type
  - Filter by permission status
  - Show only required fields
  - Show only lookup fields
- "Auto-select safe fields" button (selects only fields with full CRUD)

**Behavior**:
1. On step load:
   - For each selected object, call `/api/fields/describe`
   - Fetch field metadata including CRUD permissions
   - Render field tables with permission badges
2. User expands/collapses objects to view fields
3. User selects/deselects individual fields
4. Color coding:
   - Green badge: Permission granted
   - Red badge: Permission denied
   - Gray badge: Not applicable (e.g., Delete on audit fields)
5. Hover tooltips show detailed permission info
6. Validation warnings:
   - If required field not selected: Warning
   - If no fields selected for an object: Error
   - If lookup field selected but target object not in migration: Warning
7. "Auto-select safe fields" filters to only selectable fields

**State Changes**:
- Sets `fieldMetadata[objectName]` = Array<FieldInfo>
- Sets `selectedFields[objectName]` = Array<fieldName>
- Sets `permissionWarnings` = Array<Warning>

**API Calls**:
- GET `/api/fields/describe/:ObjectName` - Get field metadata with permissions
- GET `/api/permissions/check` - Batch permission validation

---

### Step 6: Filter Configuration
**Purpose**: Define WHERE clauses to filter records during extraction

**UI Components**:
- Per-object filter configuration sections
- For each selected object:
  - Object name header
  - "Add Filter" button
  - Filter builder interface:
    - Field dropdown (populated with selected fields from Step 5)
    - Operator dropdown (based on field type):
      - Text: equals, contains, starts with, ends with, in, not in
      - Number: equals, greater than, less than, between, in
      - Date: equals, before, after, between, last N days, next N days
      - Boolean: equals
      - Picklist: equals, in, not in
    - Value input(s) (single, range, or multi-select based on operator)
    - "Add Condition" button (for AND/OR logic)
  - Visual filter representation (query builder style)
  - SOQL preview panel showing generated WHERE clause
  - "Test Filter" button (runs count query to show matching records)
  - Estimated record count display
- Global filters section (applied to all objects)
- "Clear All Filters" button

**Behavior**:
1. On step load:
   - Show empty filter state for each object
   - Display SOQL preview as "WHERE 1=1" (no filters)
2. User clicks "Add Filter":
   - Add new filter row with field/operator/value inputs
   - Update SOQL preview in real-time
3. User builds complex filters:
   - Add multiple conditions
   - Group conditions with AND/OR
   - Nest groups (advanced mode)
4. On "Test Filter":
   - Call `/api/extract/count` with filter
   - Show matching record count
   - Display sample records (optional)
5. Validation:
   - Invalid filter syntax shows error
   - Warning if filter matches 0 records
   - Warning if filter matches > 1M records (performance)
6. Generated SOQL is human-readable and editable (advanced users)

**State Changes**:
- Sets `filters[objectName]` = FilterDefinition[]
- Sets `filterPreview[objectName]` = string (SOQL WHERE clause)
- Sets `estimatedCounts[objectName]` = number

**API Calls**:
- GET `/api/extract/count?object=X&where=Y` - Test filter and get count
- POST `/api/filters/validate` - Validate filter syntax

---

### Step 7: Extraction Configuration & Execution
**Purpose**: Configure extraction settings and execute data extraction from source org

**UI Components**:
- Extraction settings panel:
  - Output format selector: CSV | JSON | Both
  - Batch size slider (100 - 50,000 records per batch)
  - "Include deleted records" toggle
  - "Include audit fields" toggle (CreatedDate, LastModifiedDate, etc.)
  - "Compress output" toggle (gzip)
  - Output directory selector (default: `./data/extracted/`)
- Pre-extraction summary:
  - Total objects to extract
  - Total fields across all objects
  - Estimated total records (sum of counts)
  - Estimated file size
  - Estimated time (based on record count and batch size)
- "Start Extraction" button
- Progress dashboard (shown during extraction):
  - Overall progress bar with percentage
  - Current object being extracted
  - Records extracted / Total records
  - Current batch progress
  - Speed indicator (records/second)
  - Time elapsed / Estimated time remaining
  - Per-object status cards:
    - Object name
    - Status: Pending / In Progress / Completed / Failed
    - Record count
    - File size
    - Download button (when completed)
- Error panel (if failures occur):
  - List of failed objects/batches
  - Error messages
  - "Retry Failed" button
  - "Skip Failed" option
- Completion summary:
  - Success/failure counts
  - Total records extracted
  - Total file size
  - Links to download all files
  - "Proceed to Validation" button

**Behavior**:
1. User configures extraction settings
2. On "Start Extraction":
   - Validate settings
   - Call `/api/extract/start` with configuration
   - Show progress dashboard
   - WebSocket or polling for real-time updates
3. During extraction:
   - Update progress bars in real-time
   - Stream logs to UI (optional advanced view)
   - Handle errors gracefully with retry options
   - Allow pause/resume (if supported)
4. On completion:
   - Show success summary
   - Generate manifest file listing all extracted files
   - Enable download buttons
   - Auto-save extraction metadata
5. On failure:
   - Show detailed error information
   - Offer retry options (all failed / individual objects)
   - Allow partial continuation to validation step

**State Changes**:
- Sets `extractionStatus` = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
- Sets `extractionProgress` = { overall, perObject }
- Sets `extractionResults` = { files, recordCounts, errors }

**API Calls**:
- POST `/api/extract/start` - Begin extraction job
- GET `/api/extract/status` - Poll extraction progress
- POST `/api/extract/pause` - Pause extraction
- POST `/api/extract/resume` - Resume extraction
- POST `/api/extract/retry` - Retry failed batches
- GET `/api/extract/download/:fileId` - Download extracted file

---

### Step 8: Target Org Selection for Loading
**Purpose**: Select which target org(s) to load data into and configure loading strategy

**UI Components**:
- List of configured target orgs (from Step 3) with checkboxes
- For each target org:
  - Org name and instance URL
  - Connection status indicator
  - "Configure Loading Strategy" button
- Loading strategy modal (per org or global):
  - Operation mode: Insert | Update | Upsert
  - For Upsert: External ID field selector
  - "Skip records that already exist" toggle
  - "Overwrite existing records" toggle
  - Batch size configuration
  - "Stop on error" vs "Continue on error" option
  - Parallel loading toggle (for multiple objects)
- Dependency order visualization:
  - Shows object loading sequence
  - Drag-and-drop to reorder (respecting dependencies)
  - Warning if invalid order detected
- "Validate All Targets" button (pre-check before loading)
- Summary panel:
  - Selected target orgs count
  - Objects to load
  - Total records to load
  - Estimated time

**Behavior**:
1. User selects target org(s) for loading
2. User configures loading strategy per org or globally
3. System validates dependency order:
   - Parent objects must load before child objects
   - Lookup relationships must be resolved
4. On "Validate All Targets":
   - Pre-flight check of all target orgs
   - Verify connections are active
   - Check object existence in targets
   - Estimate loading time
5. Validation prevents proceeding if:
   - No target orgs selected
   - Invalid loading configuration
   - Critical dependency issues

**State Changes**:
- Sets `selectedTargets` = Array<orgId>
- Sets `loadingStrategy[orgId]` = LoadingConfig
- Sets `loadOrder` = Array<objectName>

**API Calls**:
- GET `/api/targets/validate` - Pre-flight validation
- POST `/api/loading/configure` - Set loading strategy

---

### Step 9: Permission Validation on Target Orgs
**Purpose**: Validate that target orgs have necessary permissions before attempting data load

**UI Components**:
- Target org tabs/sections
- For each target org:
  - Org info header
  - "Run Permission Check" button
  - Validation progress indicator
  - Results table with columns:
    - Object name
    - Field name
    - Required permission (Create/Read/Update/Delete)
    - Status: Pass (green) / Fail (red) / Warning (yellow)
    - Details/error message
  - Summary statistics:
    - Total checks
    - Passed
    - Failed
    - Warnings
  - "Export Validation Report" button
  - "Fix Issues" suggestions (if available)
- Global summary across all targets:
  - Overall pass/fail status
  - Blocking issues count
  - Non-blocking warnings count
- "Proceed Anyway" toggle (override warnings, not errors)

**Behavior**:
1. User clicks "Run Permission Check"
2. System calls `/api/validate/permissions` for each target
3. For each object/field combination:
   - Check field-level security in target org
   - Verify object permissions
   - Validate relationship permissions
4. Results categorized:
   - **Errors** (blocking): Missing required permissions, will cause load failure
   - **Warnings** (non-blocking): Potential issues, may cause partial failures
   - **Info**: Successful validations
5. User can:
   - Expand rows for detailed error messages
   - Filter by status (Pass/Fail/Warning)
   - Export report as PDF/CSV
   - Click "Fix Issues" for guided remediation steps
6. Validation rules:
   - Cannot proceed if blocking errors exist (unless override enabled)
   - Warnings shown but don't block progression
7. Re-validation option after fixing issues in target org

**State Changes**:
- Sets `validationResults[targetOrgId]` = ValidationResult[]
- Sets `validationSummary` = { passed, failed, warnings }
- Sets `canProceed` = boolean

**API Calls**:
- POST `/api/validate/permissions` - Run permission validation
- GET `/api/validate/report/:orgId` - Get detailed validation report

---

### Step 10: Data Loading Execution
**Purpose**: Execute data loading to target org(s) with monitoring and error handling

**UI Components**:
- Loading configuration review panel
- "Start Loading" button
- Progress dashboard (during loading):
  - Overall progress bar
  - Current target org being loaded
  - Current object being loaded
  - Records loaded / Total records
  - Success / Failure / Skipped counters
  - Speed indicator (records/second)
  - Time elapsed / Estimated remaining
  - Per-target-org status panels:
    - Org name
    - Overall status
    - Object-level progress cards:
      - Object name
      - Status: Pending / Loading / Completed / Failed
      - Record counts: Success / Failed / Skipped
      - Progress bar
      - Error count (clickable)
- Error details panel:
  - Filterable error list
  - Error type grouping (duplicate, validation rule, permission, etc.)
  - Sample error records
  - "Download Error Log" button
  - "Retry Failed Records" option
- Completion summary:
  - Total records processed
  - Success rate percentage
  - Breakdown by target org
  - Breakdown by object
  - Duration
  - Links to detailed logs
  - "Start New Migration" button
  - "Export Migration Report" button

**Behavior**:
1. User reviews configuration and clicks "Start Loading"
2. System executes loading in dependency order:
   - Load parent objects first
   - Resolve lookup IDs using mapping from extraction
   - Load child objects after parents
3. Real-time updates via WebSocket or polling:
   - Update progress bars
   - Stream success/failure notifications
   - Update counters
4. Error handling modes:
   - **Stop on Error**: Halt entire operation on first critical error
   - **Continue on Error**: Log errors and continue with remaining records
   - User can switch modes during execution
5. Retry logic:
   - Automatic retry for transient errors (API limits, network)
   - Manual retry for failed records
   - Skip permanently failed records
6. On completion:
   - Generate comprehensive migration report
   - Save logs to `./data/logs/`
   - Show success/failure summary
   - Offer to export report
7. Post-loading actions:
   - Option to run data quality checks
   - Option to compare source vs target record counts
   - Option to clean up temporary files

**State Changes**:
- Sets `loadingStatus` = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
- Sets `loadingProgress` = { overall, perOrg, perObject }
- Sets `loadingResults` = { successCount, failureCount, skippedCount, errors }

**API Calls**:
- POST `/api/load/start` - Begin loading job
- GET `/api/load/status` - Poll loading progress
- POST `/api/load/pause` - Pause loading
- POST `/api/load/resume` - Resume loading
- POST `/api/load/retry` - Retry failed records
- GET `/api/load/report` - Get migration report
- GET `/api/load/download-errors` - Download error log

---

### Config Summary Screen (Pre-Extraction)
**Purpose**: Provide final review of all configuration before starting extraction

**UI Components**:
- Collapsible sections for each configuration area:
  1. **Source Org**: Name, instance, connection status
  2. **Target Orgs**: List of orgs with nicknames
  3. **Objects & Fields**: 
     - Count of objects
     - Expandable list showing object → field count
  4. **Filters**: 
     - List of objects with active filters
     - SOQL preview snippets
  5. **Extraction Settings**: Format, batch size, options
  6. **Loading Strategy**: Operation mode, external ID, options
- "Total Estimated Records" summary
- "Total Estimated Time" calculation
- "Export Configuration" button (save current config)
- "Edit" buttons next to each section (navigate back to that step)
- "Confirm & Start Extraction" button
- Warning alerts if:
  - No filters applied to large objects (>100k records)
  - Missing required fields
  - Permission warnings detected
  - Large data volume warning (>1M records)

**Behavior**:
1. Aggregates all configuration from previous steps
2. Displays human-readable summary
3. User can expand/collapse sections for detail
4. User can click "Edit" to jump back to any step
5. User can export configuration as JSON/YAML
6. Validation runs before enabling "Confirm" button
7. Warnings shown but don't block (except critical errors)

**State Changes**:
- Reads from all existing state slices
- Sets `summaryValidated` = boolean

---

## 6. Implementation Status

See CHECKLIST.md for detailed implementation status.

---

## 7. Next Steps

1. Complete API route implementations
2. Wire up UI components to backend services
3. Implement OAuth authentication flow
4. Add comprehensive error handling
5. Create documentation and user guides
6. Add test coverage
