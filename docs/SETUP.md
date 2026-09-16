# Setup

1. Install Node.js 18+ and Python 3.8+.
2. `npm install`
3. Copy `.env.example` to `.env`.
4. `npm run dev`
5. Open http://localhost:3000

## Salesforce login options

**Option A — Salesforce login popup (recommended).** Click
**Connect with Salesforce**: a Salesforce login page opens, you sign in, and
the popup closes itself with the org connected in the app. One-time setup:

1. In Salesforce Setup, go to **App Manager → New Connected App**.
2. Name it (e.g. `SF-Migrator Local`), add a contact email.
3. Enable **OAuth Settings** and set the callback URL to
   `http://localhost:3001/api/auth/callback` (localhost HTTP is allowed).
4. Select scopes: **Access and manage your data (api)** and
   **Perform requests on your behalf at any time (refresh_token, offline_access)**.
5. Save, then open the app's **Manage Consumer Details** to copy the
   **Consumer Key** and **Consumer Secret**.
6. Put them in `.env` and restart the server:
   `SF_CLIENT_ID=<key>`, `SF_CLIENT_SECRET=<secret>`,
   `SF_REDIRECT_URI=http://localhost:3001/api/auth/callback`.
7. If login is blocked by policy, set the connected app's **Permitted Users**
   to "All users may self-authorize" (or ask an admin to pre-authorize it).

**Option B — username + password.** No Salesforce setup needed; enter
credentials (+ security token if required) directly in Step 2/3. Passwords
are used once and never stored — only OAuth tokens persist locally.
