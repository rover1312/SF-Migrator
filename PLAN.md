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

## 5. Implementation Status

See CHECKLIST.md for detailed implementation status.

---

## 6. Next Steps

1. Complete API route implementations
2. Wire up UI components to backend services
3. Implement OAuth authentication flow
4. Add comprehensive error handling
5. Create documentation and user guides
6. Add test coverage
