# SF-Migrator Web Extension - Technical Architecture & Implementation Plan

## Executive Summary

This document outlines the technical architecture, implementation strategy, and test scope for transforming the existing Python-based SF-Migrator into a browser-based web extension. The extension will provide an intuitive UI for configuring, extracting, validating, and migrating Salesforce data between orgs without manual YAML configuration.

---

## 1. Project Overview

### 1.1 Current Challenges Addressed

1. **Manual YAML Configuration**: Users must manually configure object fields, field types, and object order in YAML files
2. **Manual Filter Logic**: WHERE queries must be manually written in YAML configuration
3. **No Visual Feedback**: No UI to view available objects, fields, or permissions before extraction
4. **Static Configuration**: No ability to export/import configurations dynamically
5. **Permission Validation**: No pre-validation of target org permissions before data loading

### 1.2 Solution Vision

A Chrome/Edge browser extension that:
- Provides step-by-step wizard interface for migration configuration
- Dynamically discovers objects and fields from Source Org
- Visualizes field-level CRUD permissions with color coding
- Allows dynamic filter configuration via UI
- Exports/Imports configuration as JSON/YAML
- Validates target org permissions before data loading
- Supports multiple target orgs
- Provides real-time error feedback and retry capabilities

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Extension Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Popup     │  │   Options   │  │    Background Script    │  │
│  │   (Quick    │  │   Page      │  │    (Service Worker)     │  │
│  │    Access)  │  │  (Full UI)  │  │                         │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
└─────────────────────────────────────────────────┼─────────────────┘
                                                  │
┌─────────────────────────────────────────────────┼─────────────────┐
│              Local Server Layer (Node.js)       │                 │
├─────────────────────────────────────────────────┼─────────────────┤
│  ┌──────────────────────────────────────────────▼──────┐         │
│  │              Express.js REST API                    │         │
│  ├─────────────────────────────────────────────────────┤         │
│  │  /api/auth/org           - Org authentication       │         │
│  │  /api/objects/list       - List available objects   │         │
│  │  /api/fields/describe    - Get field metadata       │         │
│  │  /api/extract            - Extract data             │         │
│  │  /api/validate           - Validate permissions     │         │
│  │  /api/load               - Load data to target      │         │
│  │  /api/config/export      - Export configuration     │         │
│  │  /api/config/import      - Import configuration     │         │
│  └─────────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
                                                  │
┌─────────────────────────────────────────────────┼─────────────────┐
│              Python Integration Layer           │                 │
├─────────────────────────────────────────────────┼─────────────────┤
│  ┌──────────────────────────────────────────────▼──────┐         │
│  │         Python Bridge (child_process / FFI)         │         │
│  ├─────────────────────────────────────────────────────┤         │
│  │  Reuse existing scripts:                            │         │
│  │  - scripts/extract.py                               │         │
│  │  - scripts/cleaner.py                               │         │
│  │  - scripts/id_resolver.py                           │         │
│  │  - scripts/sf_api.py                                │         │
│  │  - scripts/migrate.py                               │         │
│  └─────────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
                                                  │
┌─────────────────────────────────────────────────┼─────────────────┐
│              Salesforce Orgs                    │                 │
├─────────────────────────────────────────────────┼─────────────────┤
│  ┌──────────────┐        ┌──────────────┐      │                 │
│  │  Source Org  │◄──────►│  Target Orgs │      │                 │
│  │  (Extract)   │        │  (Load)      │      │                 │
│  └──────────────┘        └──────────────┘      │                 │
└─────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Extension Framework | Manifest V3 | Latest Chrome extension standard |
| UI Framework | React 18 + TypeScript | Component-based, type-safe UI development |
| Styling | Tailwind CSS + Headless UI | Rapid UI development with accessibility |
| State Management | Zustand | Lightweight, simple state management |
| Local Server | Node.js + Express.js | Fast API layer, easy integration with Python |
| Python Bridge | child_process + JSON RPC | Reuse existing Python scripts |
| Authentication | OAuth 2.0 (Salesforce) | Modern auth, supports passkeys |
| Data Storage | Chrome Storage API + IndexedDB | Extension storage for configs, credentials |
| File Handling | JSZip + FileSaver.js | Config export/import, CSV downloads |
| Testing | Jest + React Testing Library + Playwright | Unit, integration, E2E testing |

### 2.3 Directory Structure

```
sf-migrator-extension/
├── extension/
│   ├── manifest.json
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.tsx
│   │   └── styles.css
│   ├── options/
│   │   ├── index.html
│   │   ├── App.tsx
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
│   │   │   └── Step10DataLoading.tsx
│   │   ├── hooks/
│   │   │   ├── useOrgAuth.ts
│   │   │   ├── useObjectDiscovery.ts
│   │   │   ├── useFieldMetadata.ts
│   │   │   ├── useExtraction.ts
│   │   │   └── useDataLoading.ts
│   │   └── store/
│   │       └── migrationStore.ts
│   ├── background/
│   │   └── service-worker.ts
│   ├── icons/
│   │   └── icon-*.png
│   └── utils/
│       ├── storage.ts
│       └── api-client.ts
├── server/
│   ├── src/
│   │   ├── index.ts
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
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── config.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── package.json
├── python-bridge/
│   ├── bridge_server.py
│   └── requirements.txt
├── docs/
│   ├── API_SPECIFICATION.md
│   └── USER_GUIDE.md
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Detailed Feature Specifications

### 3.1 Step 1: Configuration Mode Selection

**UI Components:**
- `Step1ConfigMode.tsx`

**Functionality:**
- Two radio button options:
  1. **Simple Mode**: Step-by-step wizard (default)
  2. **Upload Config**: Upload JSON/YAML configuration file

**Simple Mode Flow:**
- Proceeds to Step 2 (Source Org Configuration)
- All subsequent steps shown sequentially

**Upload Config Flow:**
- File picker accepts `.json` or `.yaml` files
- Validates configuration structure
- Pre-populates all steps with uploaded data
- Shows summary screen before proceeding to extraction

**Configuration Schema (JSON):**
```json
{
  "version": "1.0",
  "sourceOrg": {
    "orgName": "Production",
    "authType": "oauth|username_password|passkey",
    "credentials": { /* encrypted */ }
  },
  "targetOrgs": [
    {
      "orgId": "target_1",
      "orgName": "Sandbox Full",
      "authType": "oauth|username_password|passkey",
      "credentials": { /* encrypted */ }
    }
  ],
  "objects": [
    {
      "objectApiName": "Account",
      "order": 1,
      "fields": [
        {
          "fieldApiName": "Name",
          "fieldType": "string",
          "selected": true
        }
      ],
      "filter": "Industry = 'Technology'",
      "crudPermissions": {
        "Create": true,
        "Read": true,
        "Update": true,
        "Delete": false
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Acceptance Criteria:**
- [ ] User can select Simple or Upload Config mode
- [ ] Upload Config validates file format and schema
- [ ] Invalid config files show descriptive error messages
- [ ] Valid config pre-populates all wizard steps
- [ ] Config summary shows before extraction

---

### 3.2 Step 2: Source Org Configuration

**UI Components:**
- `Step2SourceOrg.tsx`
- `OrgAuthForm.tsx` (reusable)

**Functionality:**
- Configure connection to Source Org (data extraction source)
- Support multiple authentication methods:
  1. **OAuth 2.0** (Recommended)
  2. **Username + Password + Security Token** (Legacy)
  3. **Passkey/FIDO2** (Modern - if supported by org)

**OAuth 2.0 Flow:**
1. User clicks "Connect with OAuth"
2. Opens Salesforce login popup
3. User authenticates and grants permissions
4. Callback receives access token and refresh token
5. Tokens stored securely in Chrome Storage (encrypted)
6. Test connection button validates connectivity

**Security Token Auth:**
- Username input
- Password input
- Security Token input
- Domain selector (test/login/custom)
- API Version dropdown (default: latest)

**Passkey Support:**
- Detect org support via DescribeGlobal
- Initiate WebAuthn flow if supported
- Store credential ID securely

**Connection Validation:**
- Test Connection button
- Displays org name, user, and permissions
- Saves org configuration on success

**Acceptance Criteria:**
- [ ] All three auth methods functional
- [ ] OAuth flow completes successfully
- [ ] Credentials stored encrypted in Chrome Storage
- [ ] Test connection validates API access
- [ ] Org metadata (name, user, edition) displayed
- [ ] Invalid credentials show clear error messages

---

### 3.3 Step 3: Target Org Configuration

**UI Components:**
- `Step3TargetOrgs.tsx`
- `OrgAuthForm.tsx` (reused)
- `TargetOrgList.tsx`

**Functionality:**
- Configure one or multiple Target Orgs
- Same authentication options as Source Org
- Add/Remove/Edit target orgs
- Set default target org
- Validate each org connection

**UI Layout:**
- Card-based list of configured target orgs
- "Add Target Org" button
- Each card shows:
  - Org Name
  - Username
  - Connection Status (green/red indicator)
  - Remove button
  - Set as Default toggle

**Acceptance Criteria:**
- [ ] Can add multiple target orgs
- [ ] Each org independently validated
- [ ] Can remove configured orgs
- [ ] Can set default target org
- [ ] At least one target org required to proceed
- [ ] Duplicate org detection (by username or org ID)

---

### 3.4 Step 4: Object Selection

**UI Components:**
- `Step4ObjectSelection.tsx`
- `ObjectSearch.tsx`
- `ObjectList.tsx`

**Functionality:**
- Fetch all available objects from Source Org
- Filter objects user has Read permission on
- Multi-select objects with drag-and-drop ordering
- Search/filter object list
- Display object metadata (label, API name, record count estimate)

**API Call:**
```
GET /api/objects/list?sourceOrgId={orgId}
```

**Response:**
```json
{
  "objects": [
    {
      "name": "Account",
      "label": "Account",
      "custom": false,
      "queryable": true,
      "retrieveable": true,
      "recordCount": 15000
    },
    {
      "name": "Custom_Object__c",
      "label": "Custom Object",
      "custom": true,
      "queryable": true,
      "retrieveable": true,
      "recordCount": 500
    }
  ]
}
```

**UI Features:**
- Search box (filters by label or API name)
- Checkbox for selection
- Drag handles for reordering
- Selected objects panel (shows order)
- "Select All" / "Deselect All" buttons
- Object type filter (All/Standard/Custom)

**Acceptance Criteria:**
- [ ] Objects fetched from Source Org
- [ ] Only queryable/retrieveable objects shown
- [ ] Multi-select functionality works
- [ ] Drag-and-drop reordering persists
- [ ] Search filters in real-time
- [ ] Object count displayed
- [ ] At least one object required to proceed

---

### 3.5 Step 5: Field Selection with Permission Visualization

**UI Components:**
- `Step5FieldSelection.tsx`
- `FieldTable.tsx`
- `FieldRow.tsx`
- `CrudIndicator.tsx`

**Functionality:**
- For each selected object, display scrollable table of fields
- Checkbox at start of each row for field selection
- CRUD permission column with color-coded indicators
- Field type column
- Select All checkbox per table

**API Call:**
```
POST /api/fields/describe
{
  "sourceOrgId": "org_id",
  "objects": ["Account", "Contact"]
}
```

**Response:**
```json
{
  "Account": {
    "fields": [
      {
        "name": "Name",
        "label": "Account Name",
        "type": "string",
        "length": 255,
        "nillable": false,
        "permissions": {
          "Create": true,
          "Read": true,
          "Update": true,
          "Delete": false
        }
      },
      {
        "name": "Industry",
        "label": "Industry",
        "type": "picklist",
        "length": 255,
        "nillable": true,
        "permissions": {
          "Create": true,
          "Read": true,
          "Update": true,
          "Delete": false
        }
      }
    ]
  }
}
```

**CRUD Permission Color Coding:**
```
C (Create):  Green (#22c55e) if allowed, Red (#ef4444) if not
R (Read):    Green (#22c55e) if allowed, Red (#ef4444) if not
U (Update):  Green (#22c55e) if allowed, Red (#ef4444) if not
D (Delete):  Green (#22c55e) if allowed, Red (#ef4444) if not
```

**Example CRUD Column Display:**
```
[ C ][ R ][ U ][ D ]
  ✗    ✓    ✓    ✗
 RED  GRN  GRN  RED
```

**UI Layout per Object:**
```
┌─────────────────────────────────────────────────────────────┐
│ Account (Selected: 15/45 fields)                           │
├─────────────────────────────────────────────────────────────┤
│ ☐ Select All                                                │
├──────┬──────────────────┬──────────┬──────────┬─────────────┤
│ ☐    │ Field Name       │ Type     │ CRUD     │ Length      │
├──────┼──────────────────┼──────────┼──────────┼─────────────┤
│ ☑    │ Account Name     │ string   │ CRU-     │ 255         │
│ ☑    │ Industry         │ picklist │ CRU-     │ 255         │
│ ☐    │ AnnualRevenue    │ currency │ CRU-     │ 18,2        │
│ ☑    │ Phone            │ phone    │ CRU-     │ 40          │
└──────┴──────────────────┴──────────┴──────────┴─────────────┘
│ Scrollable area (max-height: 300px)                        │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Separate table per selected object
- [ ] Tables are scrollable (max-height enforced)
- [ ] Checkbox at start of each row
- [ ] Select All checkbox per table
- [ ] CRUD column shows 4 characters
- [ ] Each character color-coded (green=allowed, red=denied)
- [ ] Field type displayed correctly
- [ ] Field metadata (length, nillable) shown
- [ ] Selected field count displayed per object

---

### 3.6 Step 6: Filter Configuration

**UI Components:**
- `Step6FilterConfig.tsx`
- `FilterBuilder.tsx`
- `FilterEditor.tsx`

**Functionality:**
- Select object to add filter
- Text box for WHERE clause logic
- Optional: Visual filter builder (future enhancement)
- Show/hide filters per object
- Validate SOQL syntax (basic validation)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Object Filters                                              │
├─────────────────────────────────────────────────────────────┤
│ Add Filter For: [Dropdown: Account ▼]  [+ Add]             │
├─────────────────────────────────────────────────────────────┤
│ Account                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WHERE: Industry = 'Technology' AND AnnualRevenue > 1M   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [Edit] [Remove]                                             │
├─────────────────────────────────────────────────────────────┤
│ Contact                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WHERE: Email LIKE '%@example.com'                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [Edit] [Remove]                                             │
└─────────────────────────────────────────────────────────────┘
```

**Export Configuration Button:**
- "Download Configuration" button
- Exports current config as JSON or YAML
- Includes: source org, target orgs, objects, fields, filters
- File naming: `sf-migrator-config-{timestamp}.json`

**Extract Data Buttons:**
- "Extract Unprocessed Data" - Downloads raw extracted CSVs per object
- "Extract Processed Data" - Downloads cleaned/processed CSVs per object
- Both trigger extraction process and download upon completion

**Acceptance Criteria:**
- [ ] Can add filter per object
- [ ] WHERE clause text input functional
- [ ] Basic SOQL syntax validation
- [ ] Can edit/remove existing filters
- [ ] "Download Configuration" exports valid JSON/YAML
- [ ] "Extract Unprocessed Data" triggers extraction
- [ ] "Extract Processed Data" triggers cleaning + extraction
- [ ] CSV downloads work for each object

---

### 3.7 Step 7: Data Extraction

**UI Components:**
- `Step7Extraction.tsx`
- `ExtractionProgress.tsx`
- `ExtractionResults.tsx`

**Functionality:**
- Execute extraction from Source Org
- Show real-time progress per object
- Display extraction statistics
- Handle errors gracefully
- Generate error report CSV on failure

**Process Flow:**
1. User clicks "Start Extraction"
2. Backend calls Python `extract.py` with configuration
3. Progress updates pushed via WebSocket or polling
4. Per-object status: Pending → Extracting → Complete/Failed
5. On completion: show summary statistics
6. On failure: generate error CSV

**API Call:**
```
POST /api/extract
{
  "sourceOrgId": "org_id",
  "objects": [
    {
      "name": "Account",
      "fields": ["Id", "Name", "Industry"],
      "filter": "Industry = 'Technology'"
    }
  ]
}
```

**Progress Response (WebSocket/Polling):**
```json
{
  "status": "in_progress",
  "currentObject": "Account",
  "progress": {
    "Account": { "status": "complete", "records": 150, "errors": 0 },
    "Contact": { "status": "extracting", "records": 75, "errors": 2 },
    "Opportunity": { "status": "pending", "records": 0, "errors": 0 }
  },
  "overallPercent": 45
}
```

**Success Response:**
```json
{
  "status": "success",
  "summary": {
    "totalObjects": 3,
    "totalRecords": 500,
    "totalErrors": 5,
    "duration": "45s"
  },
  "perObject": {
    "Account": { "records": 150, "errors": 0 },
    "Contact": { "records": 200, "errors": 3 },
    "Opportunity": { "records": 150, "errors": 2 }
  }
}
```

**Failure Response:**
```json
{
  "status": "failed",
  "errorFile": "/downloads/extraction_errors_20240115.csv",
  "summary": {
    "totalObjects": 3,
    "completedObjects": 1,
    "failedObjects": 2
  }
}
```

**Error CSV Format:**
```csv
Object,RecordId,FieldName,ErrorMessage,ErrorCode
Account,001xxx,Industry,Invalid picklist value,INVALID_FIELD
Contact,003xxx,Email,Invalid email format,INVALID_EMAIL_ADDRESS
```

**Acceptance Criteria:**
- [ ] Extraction initiates on button click
- [ ] Real-time progress displayed
- [ ] Per-object status visible
- [ ] Overall progress bar shown
- [ ] Success shows summary statistics
- [ ] Failure generates downloadable error CSV
- [ ] Error CSV is row-wise with detailed error info
- [ ] Can proceed to next step on success
- [ ] Retry option available for failed objects

---

### 3.8 Step 8: Target Org Selection

**UI Components:**
- `Step8TargetSelection.tsx`
- `TargetOrgSelector.tsx`

**Functionality:**
- Display list of configured target orgs
- Multi-select for loading to multiple orgs
- Show org connection status
- Confirm selection before proceeding

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Select Target Org(s) for Data Loading                       │
├─────────────────────────────────────────────────────────────┤
│ ☑ Sandbox Full Copy                                         │
│   Status: ✓ Connected                                       │
│   User: admin@sandboxfull.test                              │
├─────────────────────────────────────────────────────────────┤
│ ☐ Sandbox Partial                                           │
│   Status: ✓ Connected                                       │
│   User: admin@sandboxpartial.test                           │
├─────────────────────────────────────────────────────────────┤
│ ☐ Developer Edition                                         │
│   Status: ✗ Disconnected                                    │
│   User: admin@dev.test                                      │
│   [Reconnect]                                               │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Lists all configured target orgs
- [ ] Shows connection status per org
- [ ] Multi-select enabled
- [ ] At least one org required
- [ ] Disconnected orgs show reconnect option
- [ ] Cannot proceed without valid selection

---

### 3.9 Step 9: Permission Validation

**UI Components:**
- `Step9PermissionValidation.tsx`
- `PermissionMatrix.tsx`
- `ValidationErrorList.tsx`
- `RefreshPermissionsButton.tsx`

**Functionality:**
- Validate CRUD permissions for all selected fields in target org(s)
- Display permission matrix (source vs target)
- Highlight mismatches
- Allow permission refresh after org-side fixes
- Block progression if critical permissions missing

**API Call:**
```
POST /api/validate
{
  "targetOrgIds": ["org1", "org2"],
  "objects": [
    {
      "name": "Account",
      "fields": ["Name", "Industry", "Phone"]
    }
  ]
}
```

**Response:**
```json
{
  "validationStatus": "failed",
  "orgResults": {
    "org1": {
      "status": "passed",
      "issues": []
    },
    "org2": {
      "status": "failed",
      "issues": [
        {
          "object": "Account",
          "field": "Industry",
          "permission": "Create",
          "required": true,
          "actual": false,
          "severity": "blocking"
        },
        {
          "object": "Contact",
          "field": "Email",
          "permission": "Update",
          "required": false,
          "actual": false,
          "severity": "warning"
        }
      ]
    }
  }
}
```

**Permission Matrix Display:**
```
┌─────────────────────────────────────────────────────────────┐
│ Permission Validation Results                               │
├─────────────────────────────────────────────────────────────┤
│ Target Org: Sandbox Full Copy                               │
│ Status: ✓ PASSED                                            │
├─────────────────────────────────────────────────────────────┤
│ Target Org: Developer Edition                               │
│ Status: ✗ FAILED (2 issues)                                 │
├──────────┬──────────┬───────────┬───────────┬───────────────┤
│ Object   │ Field    │ Required  │ Has Perm  │ Severity      │
├──────────┼──────────┼───────────┼───────────┼───────────────┤
│ Account  │ Industry │ Create    │ ✗ NO      │ 🔴 Blocking   │
│ Contact  │ Email    │ Update    │ ✗ NO      │ 🟡 Warning    │
└──────────┴──────────┴───────────┴───────────┴───────────────┘
├─────────────────────────────────────────────────────────────┤
│ [🔄 Refresh Permissions]  [Skip Warnings & Continue]        │
└─────────────────────────────────────────────────────────────┘
```

**Refresh Mechanism:**
- User fixes permissions in Target Org (via Setup UI)
- Clicks "Refresh Permissions" button
- Re-runs validation API call
- Updates UI with new results
- Unblocks progression if issues resolved

**Severity Levels:**
- **Blocking** (Red): Missing Create/Read permission on required fields → Cannot proceed
- **Warning** (Yellow): Missing Update/Delete on optional fields → Can skip with confirmation

**Acceptance Criteria:**
- [ ] Validates all fields against all selected target orgs
- [ ] Displays clear pass/fail status per org
- [ ] Shows detailed issue list with severity
- [ ] "Refresh Permissions" button re-validates
- [ ] Blocking issues prevent progression
- [ ] Warning issues allow skip with confirmation
- [ ] Permission matrix compares source vs target
- [ ] Real-time status updates on refresh

---

### 3.10 Step 10: Data Loading

**UI Components:**
- `Step10DataLoading.tsx`
- `LoadProgress.tsx`
- `LoadResults.tsx`
- `RetryFailedButton.tsx`

**Functionality:**
- Load extracted data to selected target org(s)
- Show real-time progress per object per org
- Handle errors with retry capability
- Generate final migration report

**Process Flow:**
1. User clicks "Start Data Loading"
2. Backend calls Python `migrate.py` with configuration
3. Progress updates per object per org
4. Per-record error handling
5. Final summary with success/failure counts

**API Call:**
```
POST /api/load
{
  "targetOrgIds": ["org1", "org2"],
  "objects": [
    {
      "name": "Account",
      "sourceFile": "/extracted/Account.csv",
      "idMap": "/id_maps/Account_idmap.csv"
    }
  ],
  "options": {
    "useBulkApi": true,
    "serialProcessing": true,
    "retryFailed": true
  }
}
```

**Progress Response:**
```json
{
  "status": "in_progress",
  "orgProgress": {
    "org1": {
      "Account": { "total": 150, "loaded": 145, "failed": 5, "percent": 96 },
      "Contact": { "total": 200, "loaded": 100, "failed": 0, "percent": 50 }
    },
    "org2": {
      "Account": { "total": 150, "loaded": 150, "failed": 0, "percent": 100 }
    }
  },
  "overallPercent": 72
}
```

**Final Report:**
```json
{
  "status": "completed_with_errors",
  "summary": {
    "totalObjects": 3,
    "totalRecords": 500,
    "successfulRecords": 485,
    "failedRecords": 15,
    "duration": "2m 30s"
  },
  "perOrg": {
    "org1": {
      "status": "completed_with_errors",
      "records": { "success": 240, "failed": 10 }
    },
    "org2": {
      "status": "completed",
      "records": { "success": 245, "failed": 5 }
    }
  },
  "errorReport": "/downloads/load_errors_20240115.csv",
  "migrationReport": "/downloads/migration_report_20240115.pdf"
}
```

**Retry Mechanism:**
- "Retry Failed Records" button appears if failures exist
- Retries only failed records (not successes)
- Uses same permission validation before retry
- Updates report after retry completes

**Acceptance Criteria:**
- [ ] Loads data to all selected target orgs
- [ ] Real-time progress per object per org
- [ ] Handles errors gracefully
- [ ] Generates error report CSV
- [ ] Generates migration summary report
- [ ] Retry option for failed records
- [ ] Re-validates permissions before retry
- [ ] Final report downloadable

---

## 4. API Specification

### 4.1 Authentication Endpoints

#### POST /api/auth/org
Authenticate with a Salesforce org

**Request:**
```json
{
  "orgType": "source|target",
  "orgId": "unique_org_identifier",
  "authMethod": "oauth|username_password|passkey",
  "credentials": {
    "username": "user@example.com",
    "password": "password123",
    "securityToken": "token123",
    "domain": "test|login",
    "apiVersion": "60.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "orgId": "unique_org_identifier",
  "orgMetadata": {
    "name": "Production Org",
    "edition": "Enterprise",
    "userId": "005xxx",
    "username": "user@example.com"
  },
  "accessToken": "encrypted_token",
  "expiresAt": "2024-01-15T12:00:00Z"
}
```

#### POST /api/auth/oauth/callback
OAuth callback handler

**Query Parameters:**
- `code`: Authorization code
- `state`: State parameter for CSRF protection

**Response:**
- Redirects to extension options page with tokens

---

### 4.2 Object Discovery Endpoints

#### GET /api/objects/list
List available objects from an org

**Query Parameters:**
- `orgId`: Organization ID
- `filter`: `all|standard|custom` (optional)

**Response:**
```json
{
  "objects": [
    {
      "name": "Account",
      "label": "Account",
      "custom": false,
      "queryable": true,
      "retrieveable": true,
      "feedEnabled": false,
      "recordCount": 15000
    }
  ]
}
```

---

### 4.3 Field Metadata Endpoints

#### POST /api/fields/describe
Get field metadata for objects

**Request:**
```json
{
  "orgId": "org_id",
  "objects": ["Account", "Contact"]
}
```

**Response:**
```json
{
  "Account": {
    "fields": [
      {
        "name": "Name",
        "label": "Account Name",
        "type": "string",
        "length": 255,
        "nillable": false,
        "defaultValue": null,
        "updateable": true,
        "createable": true,
        "permissions": {
          "Create": true,
          "Read": true,
          "Update": true,
          "Delete": false
        }
      }
    ]
  }
}
```

---

### 4.4 Extraction Endpoints

#### POST /api/extract
Initiate data extraction

**Request:**
```json
{
  "sourceOrgId": "org_id",
  "objects": [
    {
      "name": "Account",
      "fields": ["Id", "Name", "Industry"],
      "filter": "Industry = 'Technology'"
    }
  ],
  "options": {
    "chunkSize": 200,
    "maxDepth": 2
  }
}
```

**Response (Immediate):**
```json
{
  "extractionId": "ext_12345",
  "status": "started",
  "wsUrl": "ws://localhost:3001/ws/extraction/ext_12345"
}
```

**WebSocket Messages:**
```json
{
  "type": "progress",
  "extractionId": "ext_12345",
  "data": {
    "currentObject": "Account",
    "progress": { ... },
    "overallPercent": 45
  }
}
```

#### GET /api/extract/:extractionId/status
Poll extraction status

**Response:**
```json
{
  "extractionId": "ext_12345",
  "status": "in_progress|completed|failed",
  "progress": { ... },
  "error": null
}
```

#### GET /api/extract/:extractionId/download/unprocessed
Download unprocessed CSV files

**Response:**
- ZIP file containing per-object CSV files

#### GET /api/extract/:extractionId/download/processed
Download processed CSV files

**Response:**
- ZIP file containing per-object processed CSV files

---

### 4.5 Validation Endpoints

#### POST /api/validate
Validate permissions in target org(s)

**Request:**
```json
{
  "targetOrgIds": ["org1", "org2"],
  "objects": [
    {
      "name": "Account",
      "fields": ["Name", "Industry"]
    }
  ]
}
```

**Response:**
```json
{
  "validationId": "val_12345",
  "status": "completed",
  "orgResults": {
    "org1": {
      "status": "passed",
      "issues": []
    },
    "org2": {
      "status": "failed",
      "issues": [ ... ]
    }
  }
}
```

---

### 4.6 Loading Endpoints

#### POST /api/load
Initiate data loading

**Request:**
```json
{
  "targetOrgIds": ["org1", "org2"],
  "extractionId": "ext_12345",
  "objects": [ ... ],
  "options": {
    "useBulkApi": true,
    "serialProcessing": true
  }
}
```

**Response:**
```json
{
  "loadId": "load_12345",
  "status": "started",
  "wsUrl": "ws://localhost:3001/ws/load/load_12345"
}
```

#### GET /api/load/:loadId/status
Poll loading status

#### POST /api/load/:loadId/retry
Retry failed records

---

### 4.7 Configuration Endpoints

#### POST /api/config/export
Export current configuration

**Request:**
```json
{
  "format": "json|yaml",
  "includeCredentials": false
}
```

**Response:**
- Downloadable file

#### POST /api/config/import
Import configuration file

**Request:**
- Multipart form with config file

**Response:**
```json
{
  "success": true,
  "config": { ... }
}
```

---

## 5. Security Considerations

### 5.1 Credential Storage

**Chrome Storage:**
- All credentials encrypted using AES-256
- Encryption key derived from user's Chrome profile
- Never store plain text passwords
- Use Chrome Storage Sync for cross-device (optional)

**Encryption Implementation:**
```typescript
import { encrypt, decrypt } from 'crypto-js';

async function storeCredentials(orgId: string, credentials: any) {
  const masterKey = await getMasterKey(); // Derived from Chrome profile
  const encrypted = encrypt(JSON.stringify(credentials), masterKey);
  await chrome.storage.local.set({ [`creds_${orgId}`]: encrypted });
}
```

### 5.2 OAuth Token Handling

- Access tokens stored encrypted
- Refresh tokens rotated automatically
- Token expiry checked before each API call
- Automatic token refresh on 401 responses

### 5.3 CORS & CSP

**Content Security Policy:**
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:* ws://localhost:*",
    "sandbox": "allow-scripts allow-same-origin"
  }
}
```

**CORS Configuration (Server):**
```typescript
app.use(cors({
  origin: ['chrome-extension://*'],
  credentials: true
}));
```

### 5.4 Input Validation

- All user inputs sanitized
- SOQL injection prevention (parameterized queries)
- File upload validation (type, size, content)
- Rate limiting on API endpoints

---

## 6. Performance Optimization

### 6.1 Large Dataset Handling

**Pagination:**
- Query results paginated (max 2000 records per batch)
- Streaming CSV generation for large extracts
- Background processing for extractions > 10k records

**Bulk API:**
- Automatically switch to Bulk API for > 2000 records
- Serial processing to maintain order
- Chunk size: 10,000 records max

### 6.2 Caching Strategy

**Field Metadata:**
- Cache field describes for 1 hour
- Invalidate cache on permission refresh
- Store in IndexedDB for persistence

**Object List:**
- Cache object list for 24 hours
- Force refresh option available

### 6.3 WebSocket vs Polling

**Preferred:** WebSocket for real-time updates
**Fallback:** Long-polling every 2 seconds

---

## 7. Error Handling & Logging

### 7.1 Error Categories

| Category | Handling | User Message |
|----------|----------|--------------|
| Authentication Error | Retry with refresh token | "Session expired. Please re-authenticate." |
| API Limit Error | Backoff and retry | "Salesforce API limit reached. Retrying in 30s..." |
| Permission Error | Block and notify | "Missing permissions on [Object].[Field]" |
| Network Error | Retry 3 times | "Connection issue. Retrying..." |
| Validation Error | Show details | "Invalid SOQL syntax in filter" |
| Server Error | Log and notify | "Internal error. Check logs." |

### 7.2 Logging Strategy

**Client-Side:**
- Use `console.log` with levels (debug, info, warn, error)
- Send critical errors to analytics (opt-in)

**Server-Side:**
- Winston logger with file rotation
- Log levels: error, warn, info, debug
- Structured logging (JSON format)

**Log File Location:**
```
logs/
  server.log
  server-error.log
  extraction.log
  loading.log
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Coverage Target:** 80% minimum

**Test Frameworks:**
- Jest (JavaScript/TypeScript)
- pytest (Python bridge)

**Unit Test Scope:**

| Component | Test Cases |
|-----------|------------|
| `salesforce.service.ts` | Auth flows, token refresh, API calls, error handling |
| `extraction.service.ts` | SOQL generation, chunking, file writing |
| `validation.service.ts` | Permission checks, field describe parsing |
| `loading.service.ts` | Bulk API calls, retry logic, ID mapping |
| `python-bridge.service.ts` | Process spawning, IPC communication, error propagation |
| React Components | Render logic, event handlers, state updates |
| Utility Functions | Encryption, file handling, data transformation |

**Example Unit Test:**
```typescript
describe('SalesforceService', () => {
  describe('authenticate', () => {
    it('should authenticate with OAuth and return tokens', async () => {
      const mockTokens = { access_token: 'abc', refresh_token: 'xyz' };
      mockOAuthFlow.mockResolvedValue(mockTokens);
      
      const result = await service.authenticateWithOAuth('org1');
      
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('abc');
    });
    
    it('should handle authentication failures', async () => {
      mockOAuthFlow.mockRejectedValue(new Error('Invalid credentials'));
      
      await expect(service.authenticateWithOAuth('org1'))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
```

---

### 8.2 Integration Tests

**Test Framework:** Jest + Supertest + nock

**Integration Test Scope:**

| Test Scenario | Description |
|---------------|-------------|
| Auth → Object List → Field Describe | Full discovery flow |
| Extract → Process → Validate → Load | End-to-end migration |
| Config Export → Import → Verify | Configuration round-trip |
| Permission Refresh After Fix | Validate permission update |
| Bulk API Fallback | Large dataset handling |
| Error Recovery | Retry mechanisms |

**Mock Strategy:**
- Use `nock` to mock Salesforce API calls
- Mock Python bridge responses
- Use test fixtures for file operations

**Example Integration Test:**
```typescript
describe('Migration Flow Integration', () => {
  beforeEach(() => {
    nockSalesforceAuth();
    nockDescribeObjects();
    nockQueryRecords();
  });
  
  it('should complete full migration flow', async () => {
    // Step 1: Authenticate
    const authResponse = await request(app)
      .post('/api/auth/org')
      .send(sourceOrgCredentials);
    
    expect(authResponse.status).toBe(200);
    
    // Step 2: Get objects
    const objectsResponse = await request(app)
      .get('/api/objects/list')
      .query({ orgId: 'source_org' });
    
    expect(objectsResponse.body.objects.length).toBeGreaterThan(0);
    
    // Step 3: Extract
    const extractResponse = await request(app)
      .post('/api/extract')
      .send(extractionConfig);
    
    expect(extractResponse.body.extractionId).toBeDefined();
    
    // Wait for extraction to complete (polling)
    await waitForExtractionComplete(extractResponse.body.extractionId);
    
    // Step 4: Validate
    const validateResponse = await request(app)
      .post('/api/validate')
      .send(validationConfig);
    
    expect(validateResponse.body.validationStatus).toBe('passed');
    
    // Step 5: Load
    const loadResponse = await request(app)
      .post('/api/load')
      .send(loadConfig);
    
    expect(loadResponse.body.loadId).toBeDefined();
  });
});
```

---

### 8.3 End-to-End (E2E) Tests

**Test Framework:** Playwright

**E2E Test Scope:**

| Test Scenario | Browser | Description |
|---------------|---------|-------------|
| Full Migration Flow | Chrome | Complete wizard from auth to load |
| Config Upload/Download | Chrome | Export and import configuration |
| Permission Refresh | Chrome | Fix perms in SF, refresh in extension |
| Multi-Org Loading | Chrome | Load to multiple target orgs |
| Error Recovery | Chrome | Handle and recover from failures |
| Large Dataset | Chrome | Extract and load 10k+ records |

**Test Environment:**
- Dockerized Salesforce DX orgs for testing
- Seeded test data
- Isolated network environment

**Example E2E Test:**
```typescript
import { test, expect } from '@playwright/test';

test('complete migration flow', async ({ page }) => {
  // Load extension options page
  await page.goto('chrome-extension://<extension-id>/options/index.html');
  
  // Step 1: Select Simple mode
  await page.click('[data-testid="mode-simple"]');
  await page.click('Next');
  
  // Step 2: Configure Source Org
  await page.fill('[name="username"]', 'test@source.com');
  await page.fill('[name="password"]', 'password123');
  await page.fill('[name="securityToken"]', 'token123');
  await page.click('[data-testid="test-connection"]');
  await expect(page.locator('[data-testid="connection-status"]'))
    .toHaveText('Connected');
  await page.click('Next');
  
  // Step 3: Configure Target Org
  await page.click('[data-testid="add-target-org"]');
  // ... fill target org credentials
  await page.click('Next');
  
  // Step 4: Select Objects
  await page.check('[data-testid="object-Account"]');
  await page.check('[data-testid="object-Contact"]');
  await page.click('Next');
  
  // Step 5: Select Fields
  await page.check('[data-testid="field-Account-Name"]');
  await page.check('[data-testid="field-Account-Industry"]');
  await page.click('Next');
  
  // Step 6: Add Filters
  await page.fill('[data-testid="filter-Account"]', "Industry = 'Technology'");
  await page.click('Next');
  
  // Step 7: Extract
  await page.click('[data-testid="start-extraction"]');
  await expect(page.locator('[data-testid="extraction-progress"]'))
    .toHaveText(/100%/);
  await page.click('Next');
  
  // Step 8: Select Target
  await page.check('[data-testid="target-org-1"]');
  await page.click('Next');
  
  // Step 9: Validate Permissions
  await expect(page.locator('[data-testid="validation-status"]'))
    .toHaveText('PASSED');
  await page.click('Next');
  
  // Step 10: Load Data
  await page.click('[data-testid="start-loading"]');
  await expect(page.locator('[data-testid="load-progress"]'))
    .toHaveText(/100%/);
  
  // Verify completion
  await expect(page.locator('[data-testid="migration-complete"]'))
    .toBeVisible();
});
```

---

### 8.4 Test Data Management

**Test Fixtures:**
```
tests/fixtures/
  orgs/
    source-org-metadata.json
    target-org-metadata.json
  objects/
    Account-describe.json
    Contact-describe.json
  extractions/
    Account-sample.csv
    Contact-sample.csv
  configs/
    valid-config.json
    invalid-config.json
    sample-config.yaml
```

**Test Org Setup:**
- Use Salesforce DX for scratch org creation
- Seed with standard and custom objects
- Create users with varying permission sets
- Automated setup script for CI/CD

---

### 8.5 Performance Tests

**Tools:** k6, Artillery

**Performance Test Scenarios:**

| Scenario | Load | Expected Response |
|----------|------|-------------------|
| Object List API | 100 req/s | < 500ms |
| Field Describe API | 50 req/s | < 1s |
| Extraction (1k records) | 10 concurrent | < 30s |
| Extraction (10k records) | 5 concurrent | < 3min |
| Validation (100 fields) | 20 req/s | < 2s |
| Loading (1k records) | 5 concurrent | < 2min |

---

### 8.6 Security Tests

**Tools:** OWASP ZAP, npm audit

**Security Test Scope:**
- SQL/SOQL injection testing
- XSS vulnerability scanning
- CSRF token validation
- Credential leakage detection
- Dependency vulnerability audit
- Penetration testing on API endpoints

---

## 9. Deployment Strategy

### 9.1 Development Environment

**Local Setup:**
```bash
# Install dependencies
npm install

# Start local server
npm run server:dev

# Load extension in Chrome
# chrome://extensions → Load unpacked → extension/
```

**Hot Reload:**
- Webpack dev server for React
- Nodemon for Express server
- Manual reload for extension updates

### 9.2 Production Build

**Build Steps:**
```bash
# Build React app
npm run build:extension

# Build server
npm run build:server

# Package extension
npm run package

# Output: sf-migrator-extension.zip
```

**Chrome Web Store Submission:**
- Developer account required ($5 one-time fee)
- Privacy policy URL required
- Screenshots and description
- Review process: 3-7 business days

### 9.3 Server Deployment Options

**Option A: Bundled Server**
- Server runs locally when extension is active
- No external hosting required
- User starts server from system tray

**Option B: Cloud Server**
- Host on AWS/GCP/Azure
- Extension connects to cloud endpoint
- Requires user authentication

**Recommended:** Option A for security (credentials never leave user's machine)

---

## 10. Maintenance & Support

### 10.1 Version Compatibility

**Salesforce API Versions:**
- Support last 5 API versions
- Auto-detect org's API version
- Fallback to org default if unspecified

**Browser Compatibility:**
- Chrome 88+
- Edge 88+ (Chromium-based)
- Firefox (future consideration)

### 10.2 Monitoring & Analytics

**Metrics to Track:**
- Extraction success rate
- Average extraction time per object
- Common error types
- Permission validation failure rate
- User retention (opt-in)

**Error Tracking:**
- Sentry integration (opt-in)
- Anonymous error reporting
- Version-specific issue tracking

### 10.3 Update Strategy

**Extension Updates:**
- Chrome auto-updates extensions
- Version checking on startup
- Forced update for critical security fixes

**Server Updates:**
- Auto-update check on startup
- Download and replace binaries
- Backup old version for rollback

---

## 11. Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Salesforce API Changes | High | Medium | Abstract API calls, version pinning |
| Credential Leakage | Critical | Low | Encryption, secure storage, audit logs |
| Large Data Performance | Medium | High | Pagination, Bulk API, streaming |
| Browser Compatibility | Medium | Low | Polyfills, feature detection |
| Python Bridge Failures | High | Medium | Error handling, fallback modes |
| Permission Model Changes | Medium | Low | Dynamic permission discovery |
| OAuth Flow Breakage | High | Low | Multiple auth methods, manual fallback |

---

## 12. Timeline & Milestones

### Phase 1: Foundation (Weeks 1-3)
- [ ] Project scaffolding
- [ ] Extension manifest setup
- [ ] Basic React UI framework
- [ ] Express server setup
- [ ] Python bridge implementation
- [ ] Unit test framework

### Phase 2: Authentication (Weeks 4-5)
- [ ] OAuth 2.0 flow
- [ ] Username/password auth
- [ ] Credential storage encryption
- [ ] Org metadata retrieval
- [ ] Integration tests for auth

### Phase 3: Discovery (Weeks 6-7)
- [ ] Object list API
- [ ] Field describe API
- [ ] Permission visualization
- [ ] Object selection UI
- [ ] Field selection UI

### Phase 4: Extraction (Weeks 8-10)
- [ ] SOQL generation
- [ ] Python extract.py integration
- [ ] Progress tracking
- [ ] CSV generation
- [ ] Config export/import

### Phase 5: Validation (Weeks 11-12)
- [ ] Permission validation API
- [ ] Permission matrix UI
- [ ] Refresh mechanism
- [ ] Error reporting

### Phase 6: Loading (Weeks 13-15)
- [ ] Python migrate.py integration
- [ ] Bulk API handling
- [ ] ID resolution
- [ ] Retry logic
- [ ] Migration reports

### Phase 7: Polish & Testing (Weeks 16-18)
- [ ] E2E testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Beta testing

### Phase 8: Release (Weeks 19-20)
- [ ] Chrome Web Store submission
- [ ] Marketing materials
- [ ] User documentation
- [ ] Support infrastructure

**Total Estimated Duration:** 20 weeks (5 months)

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Extraction Success Rate | > 95% | Logs analysis |
| Loading Success Rate | > 90% | Migration reports |
| Average Migration Time | < 5 min for 1k records | Performance monitoring |
| User Satisfaction | > 4.5/5 | Post-migration survey |
| Support Tickets | < 5 per week | Help desk tracking |
| Crash Rate | < 1% | Analytics |
| Config Reuse Rate | > 60% | Config import stats |

---

## 14. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| CRUD | Create, Read, Update, Delete permissions |
| SOQL | Salesforce Object Query Language |
| Bulk API | Salesforce API for large data volumes |
| OAuth | Open Authorization protocol |
| Passkey | FIDO2-based authentication |
| ID Map | Mapping of source IDs to target IDs |
| Scratch Org | Temporary Salesforce org for development |

### B. Reference Documents

- [Salesforce REST API Documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm)
- [Salesforce Bulk API Documentation](https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/asynch_intro.htm)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Simple-Salesforce Documentation](https://simple-salesforce.readthedocs.io/)

### C. Contact Information

- Project Owner: [To be filled]
- Technical Lead: [To be filled]
- Support Email: [To be filled]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | AI Assistant | Initial draft |
| | | | |

---

*This document is a living specification and should be updated as the project evolves.*
