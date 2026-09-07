# Challenge Report — Milestone 1: Backend API & Live Site Dynamic Data Integration

## Challenge Summary

**Overall risk assessment**: CRITICAL
**Verdict**: **CHALLENGE_FAILED**

A critical backend runtime defect was discovered during live API stress testing. While the authentication middleware (`requireAuth`), route mounting `/admin` vs `/api/admin`, and live site greeting logic (`initDynamicGreeting`) are solidly implemented, saving dynamic settings from the Admin Panel or via `PUT /api/admin/settings` / `PUT /admin/settings` crashes the backend with HTTP 500 (`INTERNAL_SERVER_ERROR`) whenever `trailLogos` is present in the update payload.

The root cause is an un-migrated database schema and un-generated `@prisma/client`: `trailLogos` was defined in `backend/prisma/schema.prisma` (line 232), whitelisted in `backend/src/routes/admin.js` (line 1539), and added to the admin form payload in `js/admin.js` (line 2954). However, `npx prisma db push` was never executed against the PostgreSQL database, and `npx prisma generate` was never executed. As a result, `@prisma/client` throws `PrismaClientValidationError: Unknown argument trailLogos` and the database rejects the column.

Mock tests in `tests/verify-settings-sync.js` masked this bug because they only performed string checks on source files and updated an in-memory mock object rather than exercising real HTTP PUT requests against the running Express application and PostgreSQL database.

---

## Challenges

### [Critical] Challenge 1: Un-migrated Prisma Schema & Stale `@prisma/client` Triggers HTTP 500 on `PUT /api/admin/settings`

- **Assumption challenged**: Worker claimed in handoff: *"All 6 task areas (Client logos API/store integration, kinetic statement dynamic text, hero subtitle/headline binding, split statement/mouse trail binding, admin panel settings synchronization, and backend route aliasing with Bearer auth) have been implemented cleanly within the exclusive write scope."*
- **Attack scenario**: An administrator logs into `/admin`, modifies general settings (which includes `setTrailLogos`), and clicks "Yadda saxla" (Save Settings). `AdminApp.saveSettings()` issues `PUT /admin/settings` with `{ ..., trailLogos: "..." }`.
- **Empirical result**:
  ```
  PrismaClientValidationError: 
  Invalid `prisma.siteSettings.upsert()` invocation:
  {
    where: { id: "singleton" },
    update: { trailLogos: "logo1.svg,logo2.svg" },
    create: { id: "singleton", trailLogos: "logo1.svg,logo2.svg", ... }
  }
  Unknown argument `trailLogos`. Available options are marked with ?.
  ```
  Status code: `500 INTERNAL_SERVER_ERROR`.
  The query to `information_schema.columns` confirmed that the PostgreSQL table `SiteSettings` does not have a `trailLogos` column.
- **Blast radius**: Complete breakdown of Admin Panel settings persistence. Any admin attempting to save settings in production or development encounters an unhandled 500 crash.
- **Mitigation required**:
  1. Run `npx prisma db push` (or migration) inside `backend/` to add the `trailLogos` column to the PostgreSQL database table `SiteSettings`.
  2. Run `npx prisma generate` in `backend/` to update `@prisma/client`.
  3. Re-run `node tests/challenge-milestone1.js` to confirm HTTP 200 persistence.

---

### [High] Challenge 2: Stale/Malformed Cookie Precedence over Bearer Header in Dual-Auth

- **Assumption challenged**: An API consumer or script sending an `Authorization: Bearer <valid_token>` header should reliably authenticate regardless of browser cookie state.
- **Attack scenario**: In `backend/src/middleware/auth.js` lines 6-7:
  ```javascript
  let token = req.cookies?.brandfull_token;
  if (!token && req.headers?.authorization) { ... }
  ```
  If a browser retains an expired or invalid `brandfull_token` cookie, `!token` evaluates to `false`. The middleware completely ignores the valid `Authorization: Bearer <token>` header in `req.headers.authorization` and attempts to verify the invalid cookie, returning 401 UNAUTHORIZED.
- **Blast radius**: Hybrid environments, preview iframes, or API test scripts where stale cookies exist will fail authorization even when sending legitimate Bearer tokens.
- **Mitigation**: If `req.cookies?.brandfull_token` fails JWT verification, fallback to inspecting `req.headers?.authorization` before rejecting with 401, or prioritize the explicit Bearer header when present.

---

## Detailed Empirical Test Results

### 1. Existing Test Suites
- `node tests/verify-hero.js`: **68/68 PASSED** (100%)
- `node tests/verify-settings-sync.js`: **52/52 PASSED** (100%)

### 2. Challenge Stress Test Suite (`tests/challenge-milestone1.js`)
Total tests: 47 | Passed: 46 | Failed: 1

#### Suite 1: Authentication Middleware (`requireAuth` in `backend/src/middleware/auth.js`)
- `1.1`: Missing token returns 401 UNAUTHORIZED -> **PASS**
- `1.2`: Empty Authorization header returns 401 -> **PASS**
- `1.3`: Whitespace Authorization header returns 401 -> **PASS**
- `1.4`: Header with Bearer keyword only returns 401 -> **PASS**
- `1.5`: Malformed Bearer token returns 401 -> **PASS**
- `1.6`: Expired Bearer token returns 401 (TokenExpiredError) -> **PASS**
- `1.7`: Tampered/Wrong Secret token returns 401 (JsonWebTokenError) -> **PASS**
- `1.8`: Non-existent user ID in JWT payload returns 401 -> **PASS**
- `1.9`: Inactive user in DB returns 401 -> **PASS**
- `1.10`: Valid Bearer token authenticates successfully and sets `req.user` -> **PASS**
- `1.11`: Bearer casing variations (`bearer`, `BEARER`, multi-space) authenticate successfully -> **PASS**
- `1.12`: Raw token without Bearer prefix authenticates successfully (fallback) -> **PASS**
- `1.13`: Cookie authentication works independently and in combination with header -> **PASS**
- `1.14`: JWT token missing userId handled gracefully (401 without unhandled crash) -> **PASS**
- `1.15`: `requireRole` allows authorized role and forbids unauthorized role with 403 -> **PASS**

#### Suite 2: Route Aliasing & Endpoint Parity (`backend/src/app.js`)
- `2.1`: `GET /admin` serves `admin.html` with 200 OK -> **PASS**
- `2.2`: `GET /admin/` serves `admin.html` with 200 OK -> **PASS**
- `2.3`: `GET /api/admin/settings` without auth returns 401 -> **PASS**
- `2.4`: `GET /admin/settings` without auth returns 401 -> **PASS**
- `2.5`: Unauthenticated responses are identical in structure -> **PASS**
- `2.6`: `GET /api/admin/settings` with invalid token returns 401 -> **PASS**
- `2.7`: `GET /admin/settings` with invalid token returns 401 -> **PASS**
- `2.8`: `GET /api/admin/settings` with valid Bearer returns 200 OK -> **PASS**
- `2.9`: `GET /admin/settings` with valid Bearer returns 200 OK -> **PASS**
- `2.10`: Data schema parity between `/api/admin/settings` and `/admin/settings` -> **PASS**
- `2.11`: `PUT /api/admin/settings` persists settings successfully (standard dynamic fields) -> **PASS**
- `2.12`: `PUT /admin/settings` persists settings successfully (route alias parity) -> **PASS**
- `2.13`: **EMPIRICAL DEFECT CHECK**: `PUT /api/admin/settings` with `trailLogos` persists cleanly -> **FAIL** (HTTP 500 `PrismaClientValidationError: Unknown argument trailLogos`)
- `2.14`: Non-existent route `/admin/nonexistent-subpath` returns 404 JSON (NOT `index.html`) -> **PASS**
- `2.15`: Non-existent route `/api/nonexistent-endpoint` returns 404 JSON -> **PASS**
- `2.16`: Client SPA route `/projects/some-slug` falls back to `index.html` -> **PASS**
- `2.17`: `GET /api/settings` serves public settings without authentication -> **PASS**
- `2.18`: `GET /api/clients` serves active clients array without authentication -> **PASS**

#### Suite 3: Dynamic Greeting & Subtitle (`initDynamicGreeting()` in `js/app.js`)
- `3.1a`: `renderSiteSettings()` populates `#dynamic-greeting-text` with `heroSubtitle` -> **PASS**
- `3.1b`: `renderSiteSettings()` sets `data-hero-subtitle-rendered` attribute -> **PASS**
- `3.1c`: `initDynamicGreeting()` NEVER overwrites defined `heroSubtitle` -> **PASS**
- `3.1d`: Repeated consecutive calls (10x) to `initDynamicGreeting()` preserve `heroSubtitle` -> **PASS**
- `3.2a`: Early `initDynamicGreeting` sets initial weekday greeting when subtitle absent -> **PASS**
- `3.2b`: `renderSiteSettings` cleanly updates element to `heroSubtitle` -> **PASS**
- `3.2c`: Subsequent `initDynamicGreeting` does not overwrite newly rendered `heroSubtitle` -> **PASS**
- `3.3`: When `heroSubtitle` is empty string, dynamic weekday greeting is rendered -> **PASS**
- `3.4`: When `heroSubtitle` is null, dynamic weekday greeting is rendered -> **PASS**
- `3.5`: When `heroSubtitle` is undefined, dynamic weekday greeting is rendered -> **PASS**
- `3.6`: When `App.data` is null, `initDynamicGreeting` executes without throwing -> **PASS**
- `3.7`: Exhaustive 7-day weekday greeting oracle matches all days (Sunday-Saturday) in Azerbaijani -> **PASS**
- `3.8`: Missing `#dynamic-greeting-text` element in DOM returns cleanly without error -> **PASS**
- `3.9`: Azerbaijani special characters in `heroSubtitle` preserved without corruption or overwrite -> **PASS**

---

## Unchallenged Areas

- **Visual Editor WYSIWYG Engine & PostMessage bridge**: Belongs to Milestone 2 scope.
- **Desktop Standalone Module Packaging**: Belongs to Milestone 3 scope.
