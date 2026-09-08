# Implementation Checklist - Local-First Salesforce Data Migrator

This checklist tracks the implementation of the local-first web application for Salesforce data migration. 
**Architecture:** React + TypeScript (Frontend) | Node.js + Express (Backend) | Python (Data Processing) | Local File System (Storage)

---

## 1. Project Setup & Configuration
- [ ] Initialize root `package.json` with workspaces (frontend, server)
- [ ] Configure TypeScript for both frontend and server
- [ ] Set up ESLint and Prettier for code consistency
- [ ] Create `.env.example` with required local environment variables
- [ ] Configure `tsconfig.json` for root, frontend, and server
- [ ] Set up nodemon for local development hot-reloading
- [ ] Create build scripts for production bundling

## 2. Backend Core (Node.js/Express)
- [ ] Initialize Express server with CORS configuration for localhost
- [ ] Implement robust error handling middleware
- [ ] Create request logging middleware
- [ ] Set up Multer for handling config file uploads
- [ ] Implement local file system utilities (read/write/stream large files)
- [ ] Create API response standardization wrapper
- [ ] Set up process management for spawning Python scripts

## 3. Configuration Management
- [ ] Define JSON Schema for migration configuration
- [ ] Implement Config Validator (JSON/YAML support) using Ajv
- [ ] Create Config Export utility (generate JSON/YAML from state)
- [ ] Create Config Import utility (parse and validate uploaded files)
- [ ] Implement business rule validation (e.g., source != target)

## 4. Salesforce Services (Backend)
- [ ] Install `jsforce` or `@salesforce/core` libraries
- [ ] Implement OAuth 2.0 User-Agent flow for local callback server
- [ ] Create Auth Service: Handle token storage in local secure storage
- [ ] Create Auth Service: Token refresh logic
- [ ] Create Metadata Service: Fetch available SObjects
- [ ] Create Metadata Service: Fetch fields, relationships, and permissions for an SObject
- [ ] Create Data Service: SOQL query builder and executor
- [ ] Create Data Service: Bulk API 2.0 integration for extraction
- [ ] Create Data Service: Bulk API 2.0 integration for loading
- [ ] Implement rate limiting and retry logic for API calls

## 5. Python Bridge Integration
- [ ] Set up `python-bridge` or child_process communication layer
- [ ] Create Python virtual environment setup script
- [ ] Implement data serialization protocol (JSONL/Parquet) between Node and Python
- [ ] Create Python script for ID Lookup Replacement logic
- [ ] Create Python script for complex data transformation rules
- [ ] Implement streaming interface for processing millions of records without OOM
- [ ] Add error handling for Python process crashes

## 6. Frontend Core (React + TypeScript)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up Tailwind CSS for styling
- [ ] Create global state management (Zustand/Redux) for wizard state
- [ ] Implement routing (React Router) for wizard steps
- [ ] Create reusable UI components (Button, Input, Select, Card, Modal)
- [ ] Create Layout component with sidebar/navigation
- [ ] Implement Toast/Notification system for user feedback
- [ ] Implement Loading/Progress bar components

## 7. Wizard Step 1: Configuration Mode
- [ ] Create `ConfigModeScreen` component
- [ ] Implement "New Configuration" option
- [ ] Implement "Import Configuration" option with file upload
- [ ] Display config preview upon file upload
- [ ] Handle parsing errors for invalid config files

## 8. Wizard Step 2: Source Org Authentication
- [ ] Create `SourceAuthScreen` component
- [ ] Implement "Login to Salesforce" button triggering backend OAuth
- [ ] Handle OAuth callback and store session
- [ ] Display connected org details (Instance URL, Org ID, User)
- [ ] Implement "Logout" functionality
- [ ] Validate required permissions (API Enabled, etc.)

## 9. Wizard Step 3: Target Org Configuration
- [ ] Create `TargetOrgsScreen` component
- [ ] Implement dynamic list of target orgs (Add/Remove)
- [ ] Reuse authentication flow for multiple target orgs
- [ ] Display list of connected target orgs with status
- [ ] Validate that target orgs are distinct from source

## 10. Wizard Step 4: Object Selection
- [ ] Create `ObjectSelectionScreen` component
- [ ] Fetch and display list of available SObjects from Source Org
- [ ] Implement search/filter for objects
- [ ] Allow multi-selection of objects
- [ ] Display object metadata (Label, API Name, Record Count estimate)
- [ ] Validate at least one object is selected

## 11. Wizard Step 5: Field Selection & Permissions
- [ ] Create `FieldSelectionScreen` component
- [ ] Fetch fields for selected objects
- [ ] Display fields in a table with checkboxes
- [ ] Visualize field permissions (Readable/Updateable) using color coding
- [ ] Implement "Select All" / "Deselect All" per object
- [ ] Warn about unmappable fields (e.g., Readonly system fields)

## 12. Wizard Step 6: Filter Configuration
- [ ] Create `FilterConfigScreen` component
- [ ] Provide UI for building WHERE clauses
- [ ] Support basic operators (=, !=, >, <, IN, LIKE)
- [ ] Allow adding multiple filter conditions
- [ ] Preview generated SOQL query
- [ ] Validate SOQL syntax before proceeding

## 13. Wizard Step 7: Extraction Configuration & Execution
- [ ] Create `ExtractionScreen` component
- [ ] Configure batch size and concurrency limits
- [ ] Select local directory for saving extracted data
- [ ] Start extraction job via backend API
- [ ] Display real-time progress (Records extracted, % complete, ETA)
- [ ] Show logs/stream output from backend
- [ ] Handle pause/resume/cancel functionality
- [ ] Save extraction manifest/metadata locally

## 14. Config Summary Screen (Pre-Extraction)
- [ ] Create `ConfigSummaryScreen` component
- [ ] Display summary of Source and Target Orgs
- [ ] List selected Objects and Field counts
- [ ] Show active Filters
- [ ] Display Extraction settings
- [ ] Require explicit user confirmation ("Start Extraction")
- [ ] Allow editing previous steps from summary

## 15. Wizard Step 8: Target Org Selection for Loading
- [ ] Create `TargetSelectionForLoadScreen` component
- [ ] Display list of previously authenticated target orgs
- [ ] Allow selecting subset of target orgs for this load job
- [ ] Confirm target readiness

## 16. Wizard Step 9: Permission Validation on Target
- [ ] Create `TargetValidationScreen` component
- [ ] Run pre-flight checks on selected target orgs
- [ ] Verify existence of target SObjects
- [ ] Verify field write permissions on targets
- [ ] Report missing fields or permission errors
- [ ] Block loading if critical validation fails

## 17. Wizard Step 10: Data Loading Execution
- [ ] Create `DataLoadingScreen` component
- [ ] Trigger Python processing service for ID replacement
- [ ] Stream processed data to Target Orgs via Bulk API
- [ ] Display real-time load progress per target org
- [ ] Show success/failure counts per batch
- [ ] Generate and display final load report
- [ ] Save load results/logs locally

## 18. Local Storage & File Management
- [ ] Define standard directory structure for local data (`./data/orgs`, `./data/jobs`)
- [ ] Implement cleanup utility for temporary files
- [ ] Create job history tracking (JSON logs of past runs)
- [ ] Ensure large file handling (streaming reads/writes)

## 19. Testing & Quality Assurance
- [ ] Write unit tests for Config Validator
- [ ] Write unit tests for SOQL builder
- [ ] Mock Salesforce API for integration tests
- [ ] Test end-to-end flow with small datasets
- [ ] Performance test with 1M+ record simulation
- [ ] Verify memory usage during large file processing

## 20. Documentation & Deployment
- [ ] Write `README.md` with setup instructions (Clone -> Install -> Run)
- [ ] Document environment variables setup
- [ ] Create troubleshooting guide for common OAuth/API issues
- [ ] Add comments to Python scripts for maintenance
- [ ] Prepare production build script
