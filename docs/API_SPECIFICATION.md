# API Specification

Base URL: `http://localhost:3001`

All responses use `{ success, data?, error?: { code, message, details? }, message? }`.
See `src/server/routes/` for the implementation.

| Method | Path                                | Purpose                          |
| ------ | ----------------------------------- | -------------------------------- |
| GET    | `/health`                           | Health check                     |
| POST   | `/api/auth/org`                     | Connect org (credentials/tokens) |
| GET    | `/api/auth/oauth-url?loginUrl=`     | Start OAuth web-server flow      |
| GET    | `/api/auth/orgs`                    | List registered orgs             |
| POST   | `/api/auth/logout`                  | Disconnect + forget org          |
| GET    | `/api/objects/list?orgId=&includeCounts=` | List SObjects (opt. counts) |
| GET    | `/api/objects/:name/count?orgId=`   | Record count for an object       |
| GET    | `/api/fields/describe/:object?orgId=` | Fields + permissions           |
| POST   | `/api/extract/start`                | Start extraction `{orgId, config}` |
| GET    | `/api/extract/status?id=`           | Poll extraction progress         |
| POST   | `/api/extract/pause|resume|cancel`  | Control extraction `{id}`        |
| GET    | `/api/extract/files/:jobId`         | List extracted files             |
| GET    | `/api/extract/download/:jobId/:file` | Download an extracted file      |
| POST   | `/api/validate/permissions`         | Validate target `{targetOrgId, config, operation?}` |
| POST   | `/api/load/start`                   | Start load `{targetOrgId, extractJobId, config}` |
| GET    | `/api/load/status?id=`              | Poll load progress               |
| POST   | `/api/load/pause|resume|cancel`     | Control loading `{id}`           |
| POST   | `/api/load/retry`                   | Retry failed rows `{id}`         |
| GET    | `/api/load/report/:id`              | Migration report JSON            |
| GET    | `/api/load/errors/:id`              | Error rows CSV                   |
| POST   | `/api/config/export`                | Validate + serialize `{config, format}` |
| POST   | `/api/config/import`                | Parse + validate upload (`file`) |
