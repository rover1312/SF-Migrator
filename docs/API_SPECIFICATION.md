# API Specification

Base URL: `http://localhost:3001`

| Method | Path                      | Purpose                  |
| ------ | ------------------------- | ------------------------ |
| GET    | `/health`                 | Health check             |
| POST   | `/api/auth/org`           | Authenticate an org      |
| GET    | `/api/objects/list`       | List SObjects            |
| GET    | `/api/fields/describe/:object` | Field metadata      |
| POST   | `/api/extract/start`      | Start extraction job     |
| GET    | `/api/extract/status`     | Poll extraction progress |
| POST   | `/api/validate/permissions` | Validate target perms  |
| POST   | `/api/load/start`         | Start load job           |
| GET    | `/api/load/status`        | Poll load progress       |
| POST   | `/api/config/export`      | Export migration config  |
| POST   | `/api/config/import`      | Import migration config  |

All responses use `{ success, data?, error?, message? }`.
See `src/server/routes/` for the implementation.
