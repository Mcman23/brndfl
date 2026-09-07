# Technical Investigation Report: Prisma Schema Sync & trailLogos Defect

**Author**: Explorer Subagent (Milestone 1 Remediation Track)  
**Date**: 2026-09-07  
**Working Directory**: `.agents/teamwork_preview_explorer_m1_fix_1`  
**Status**: COMPLETE (Read-Only Investigation)

---

## Executive Summary

Challenger 2 discovered that saving `trailLogos` via `PUT /api/admin/settings` or `PUT /admin/settings` crashes the server with HTTP 500:
```
PrismaClientValidationError: Unknown argument trailLogos. Available options are marked with ?
```
Our live investigation confirms that while `trailLogos String @default("")` was correctly added to `backend/prisma/schema.prisma` (line 232) and added to the `allowedFields` array in `backend/src/routes/admin.js` (line 1539), neither `npx prisma db push` nor `npx prisma generate` was executed.
Consequently:
1. The remote PostgreSQL database (`aws-0-eu-central-1.pooler.supabase.com`) table `SiteSettings` lacks the `trailLogos` column (verified via `information_schema.columns` query: `Has trailLogos column? false`).
2. The generated `@prisma/client` artifact in `backend/node_modules/.prisma/client/` lacks the `trailLogos` field definition (0 matches across client typings and runtime definitions).
3. The Express route handler and Prisma schema are otherwise fully valid and properly aligned; executing `npx prisma db push` and `npx prisma generate` in `backend/` resolves the issue completely.

---

## 1. Codebase & Database Verification Details

### 1.1 Field Definition in `backend/prisma/schema.prisma`
- **Location**: Lines 193–233 (`model SiteSettings`), specifically line 232:
  ```prisma
  229:   splitText         String   @db.Text @default("Hər kəs nəsə yarada bilər. Lakin mədəniyyət və bizneslə rezonans doğuran təcrübələr yaratmaq çətin tərəfdir. Bu, dizayn, texnologiya və insan zəkası tələb edir.")
  230:   splitTextEn       String   @db.Text @default("")
  231:   splitTextRu       String   @db.Text @default("")
  232:   trailLogos        String   @default("")
  233: }
  ```
- **Validation**: Executing `npx prisma validate` in `backend/` outputs:
  ```
  Environment variables loaded from .env
  Prisma schema loaded from prisma\schema.prisma
  The schema at prisma\schema.prisma is valid 🚀
  ```
- **Analysis**: The field name `trailLogos` follows the project's camelCase naming convention. Type `String` maps to PostgreSQL `text`. The default `@default("")` ensures that existing database rows can receive the column non-destructively without null constraint violations.

### 1.2 Route Handler in `backend/src/routes/admin.js`
- **Location**: Lines 1522–1578 (`router.put('/settings', requireRole(['SUPER_ADMIN']), ...)`):
  ```javascript
  1527:   const allowedFields = [
  1528:       'heroTag', 'heroHeadline', 'heroSubtitle', 
  1529:       'heroTagEn', 'heroHeadlineEn', 'heroSubtitleEn',
  1530:       'heroTagRu', 'heroHeadlineRu', 'heroSubtitleRu',
  1531:       'showreelVideoUrl', 'showreelPosterUrl',
  1532:       'contactEmail', 'contactPhone', 'contactAddress', 'workingHours',
  1533:       'socialInstagram', 'socialFacebook', 'socialLinkedIn', 
  1534:       'socialYouTube', 'socialTikTok', 'socialVimeo',
  1535:       'copyrightText',
  1536:       'kineticText', 'kineticTextEn', 'kineticTextRu',
  1537:       'kineticWords', 'kineticWordsEn', 'kineticWordsRu',
  1538:       'splitText', 'splitTextEn', 'splitTextRu',
  1539:       'trailLogos'
  1540:     ];
  1541:   
  1542:   const updateData = {};
  1543:   for (const field of allowedFields) {
  1544:     if (data[field] !== undefined) {
  1545:       updateData[field] = String(data[field]).trim();
  1546:     }
  1547:   }
  ...
  1567:   const settings = await prisma.siteSettings.upsert({
  1568:     where: { id: 'singleton' },
  1569:     update: updateData,
  1570:     create: { id: 'singleton', ...updateData }
  1571:   });
  ```
- **Analysis**:
  - `trailLogos` is explicitly permitted in `allowedFields` (line 1539).
  - Incoming `data.trailLogos` is sanitized via `String(data[field]).trim()` into `updateData.trailLogos`.
  - The upsert call passes `updateData` to both `update` and `create`.
  - The route handler logic is 100% correct and ready. The error occurs strictly at Prisma's runtime validator because the client runtime has not been regenerated.

### 1.3 Database State in PostgreSQL
- An empirical query against `information_schema.columns` for `table_name = 'SiteSettings'` yielded 35 existing columns:
  `id`, `heroTag`, `heroHeadline`, `heroSubtitle`, `showreelVideoUrl`, `showreelPosterUrl`, `contactEmail`, `contactPhone`, `contactAddress`, `workingHours`, `socialInstagram`, `socialFacebook`, `socialLinkedIn`, `socialYouTube`, `socialTikTok`, `socialVimeo`, `copyrightText`, `footerLinks`, `createdAt`, `updatedAt`, `heroHeadlineEn`, `heroHeadlineRu`, `heroSubtitleEn`, `heroSubtitleRu`, `heroTagEn`, `heroTagRu`, `kineticText`, `kineticTextEn`, `kineticTextRu`, `kineticWords`, `kineticWordsEn`, `kineticWordsRu`, `splitText`, `splitTextEn`, `splitTextRu`.
- `trailLogos` is absent (`Has trailLogos column? false`).

### 1.4 Generated Prisma Client State
- Inspection of `backend/node_modules/.prisma/client`:
  - `splitText` exists across `index.d.ts`, `index.js`, and `edge.js`.
  - `trailLogos` has 0 occurrences.
- Running `node tests/challenge-milestone1.js` directly reproduced the exact error on Test 2.13:
  ```
  prisma:error Invalid prisma.siteSettings.upsert() invocation:
  Unknown argument trailLogos. Available options are marked with ?.
  ```

---

## 2. Command Sequence for Worker

To resolve the defect and regenerate all client artifacts, the Worker must execute the following sequence:

### Step 1: Navigate to backend directory
```powershell
cd backend
```

### Step 2: Push schema changes to PostgreSQL database
```powershell
npx prisma db push
```
- **What this does**:
  - Reads `DATABASE_URL` from `backend/.env`.
  - Synchronizes the remote Supabase PostgreSQL schema with `backend/prisma/schema.prisma`.
  - Alters table `SiteSettings` to add column `trailLogos text NOT NULL DEFAULT ''`.
  - Automatically triggers Prisma Client generation.

### Step 3: Explicitly regenerate Prisma Client
```powershell
npx prisma generate
```
- **What this does**:
  - Regenerates TypeScript typings and JavaScript runtime models in `backend/node_modules/.prisma/client` and `backend/node_modules/@prisma/client`.
  - Compiles binary engines for both `native` (Windows) and `rhel-openssl-3.0.x` (AWS Lambda / Vercel container).

### Step 4: Return to root directory and verify
```powershell
cd ..
node tests/challenge-milestone1.js
```
- **Expected result**:
  ```
  ===============================================================
  EMPIRICAL CHALLENGE RESULTS: Total: 47, Passed: 47, Failed: 0
  ===============================================================
  CHALLENGE VERDICT: APPROVE
  ```

---

## 3. Worker Action Plan (Step-by-Step)

| Step | Action | Command / Target | Purpose |
|------|--------|------------------|---------|
| 1 | DB Schema Push | `cd backend && npx prisma db push` | Add `trailLogos` column to `SiteSettings` in PostgreSQL |
| 2 | Regenerate Client | `npx prisma generate && cd ..` | Rebuild `@prisma/client` runtime with `trailLogos` support |
| 3 | DB Inspection | `node .agents/teamwork_preview_explorer_m1_fix_1/inspect_db.js` | Confirm `Has trailLogos column? true` |
| 4 | Challenge Suite | `node tests/challenge-milestone1.js` | Confirm 47/47 tests pass (Test 2.13 green) |
| 5 | Regression Suite | `node tests/verify-hero.js && node tests/verify-settings-sync.js` | Confirm existing suites remain 100% green |
| 6 (Recommended) | Reviewer 2 Hardening | `js/app.js` HTML escaping & null-safety | Fix XSS and `null` client record crashes flagged by Reviewer 2 |
