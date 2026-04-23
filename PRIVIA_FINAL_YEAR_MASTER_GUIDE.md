# Privia Final Year Master Guide (Full Project Report + Study Notes)

This file is your end-to-end learning and presentation guide for **Privia**.  
Use it for:
- report writing
- viva preparation
- code walkthrough explanation
- architecture and algorithm explanation

---

## 1. Project in One Paragraph

**Privia** is a privacy-preserving identity verification web app where users register once, submit identity proof, and later share only a short-lived verification proof (code/QR) instead of exposing full personal data. The system uses encrypted email storage, claim-level hashing, admin-controlled approval, and temporary proof validation to deliver trust decisions with minimal data disclosure.

---

## 2. Core Problem and Solution

### Problem
Traditional verification often reveals too much personal information to verifiers.

### Privia’s Solution
1. Store user identity data securely (email encrypted, claim hashed).
2. Let admin approve user and claim.
3. Generate temporary proof code/QR (30-second lifetime).
4. Verify proof live without exposing full underlying personal data.

**Clarity:** Claims represent long-term identity validation, while proofs are short-lived tokens derived from approved claims for real-time verification.

---

## 3. Tech Stack (Bottom to Top)

| Layer | Tech | Where Used | Why Used |
|---|---|---|---|
| Runtime | Node.js | Entire app | JavaScript server runtime |
| Web Framework | Express.js | `app.js`, `routes/*` | Routing + middleware architecture |
| View Engine | EJS + express-ejs-layouts | `views/*`, `layout.ejs` | Server-side rendering with reusable layout |
| Database | MongoDB + Mongoose | `models/*`, routes | Document storage for users/proofs |
| Auth | Passport.js (Local Strategy) | `config/passport.js`, `routes/users.js` | Session-based login |
| Session | express-session | `app.js` | User login persistence |
| Flash Messages | connect-flash | `app.js`, `views/partials/messages.ejs` | Success/error notifications |
| File Upload | Multer | `routes/users.js` | ID proof upload to `uploads/` |
| Encryption | CryptoJS AES | `routes/users.js` | Encrypt email before DB storage |
| Hashing | Node `crypto` SHA-256 | `routes/users.js`, `config/passport.js` | Email hash for duplicate lookup + claim hash |
| QR/Proof | qrcode + html5-qrcode | `views/dashboard.ejs`, `views/scanner.ejs` | Generate and scan verification proofs |
| UI | Bootstrap 5 + custom CSS | `views/layout.ejs` + page styles | Responsive dark-themed UI |

---

## 4. Folder Structure and Role

```text
node_passport_login/
├── app.js                    # Entry point, middleware, DB connect, route mounting
├── config/
│   ├── auth.js               # Auth guards (ensureAuthenticated, ensureAdmin, etc.)
│   ├── keys.js               # Reads MONGO_URI from env
│   └── passport.js           # Local strategy + serialize/deserialize
├── models/
│   ├── User.js               # User schema + verification status + claims
│   └── Proof.js              # Temporary proof schema + TTL index
├── routes/
│   ├── index.js              # Public pages + dashboard
│   ├── users.js              # Register/login/logout/resubmit-proof
│   ├── admin.js              # Admin review/approve/claim-verify/reject
│   ├── proof.js              # Main proof generation endpoint
│   ├── api.js                # API proof generation + scanner verification
│   └── verify.js             # Link-based proof verification page/API
├── utils/
│   ├── verifyClaim.js        # HMAC claim verification helper
│   ├── signClaim.js          # RSA signing helper (not in primary flow)
│   └── cryptoKeys.js         # Runtime-generated RSA keypair
├── views/
│   ├── layout.ejs            # Global shell/navbar/hero/theme
│   ├── welcome.ejs           # Home content
│   ├── about.ejs
│   ├── how-it-works.ejs
│   ├── security.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── admin.ejs
│   ├── scanner.ejs
│   └── partials/messages.ejs # Flash toasts
└── uploads/                  # Uploaded proof files (local storage)
```

---

## 5. Environment Variables You Must Know

Required for proper app behavior:

```env
MONGO_URI=...
SECRET_KEY=...
SESSION_SECRET=...
PROOF_SECRET=...
NODE_ENV=production
```

What each does:
- `MONGO_URI`: MongoDB connection string.
- `SECRET_KEY`: AES encryption/decryption key for email field.
- `SESSION_SECRET`: Session cookie signing secret.
- `PROOF_SECRET`: HMAC secret for claim verification helper.
- `NODE_ENV`: production/development mode.

---

## 6. Database Design (Mongoose Schemas)

## 6.1 User Schema (`models/User.js`)
- `name`: String (displayed name)
- `email`: **AES encrypted** email string
- `emailHash`: SHA-256 hash of normalized email (unique index)
- `password`: bcrypt hashed password
- `idProof`: uploaded file name
- `role`: `user` or `admin`
- `verified`: boolean user approval gate
- `verificationStatus`: `pending | approved | rejected`
- `rejectionReason`: text reason from admin
- `rejectedAt`: date of rejection
- `claims[]`: claim array (`type`, `hash`, `verified`, `issuedAt`)
- `activeProof`: remains only for backward compatibility and is no longer used in the active proof generation or verification flow.

## 6.2 Proof Schema (`models/Proof.js`)
- `code`: unique proof code (`PRIVIA-XXXX...`)
- `userId`: ref to user
- `expiresAt`: proof expiry timestamp
- TTL index: `ProofSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`

This means MongoDB can auto-delete expired proof docs.

---

## 7. Authentication and Session Flow

## 7.1 Local Strategy (`config/passport.js`)
Login process:
1. Normalize email (trim + lowercase).
2. Compute SHA-256 hash.
3. Find user by `emailHash` (fast path).
4. Fallback for legacy users: decrypt each stored email and compare.
5. Compare password with bcrypt hash.

## 7.2 Session
- `serializeUser`: stores only user ID in session.
- `deserializeUser`: fetches full user from DB for each authenticated request.

## 7.3 Auth Guards (`config/auth.js`)
- `ensureAuthenticated`: blocks protected pages unless logged in.
- `forwardAuthenticated`: prevents logged-in users from opening login/register again.
- `ensureAdmin`: admin-only route gate.

---

## 8. Security and Algorithms (Explain in Viva)

## 8.1 AES Email Encryption
In registration route:
```js
CryptoJS.AES.encrypt(normalizedEmail, process.env.SECRET_KEY).toString()
```
Why: raw email is not stored directly in plaintext.

## 8.2 SHA-256 Email Hash
```js
crypto.createHash('sha256').update(normalizedEmail).digest('hex')
```
Uses:
- duplicate prevention
- fast lookup during login
- claim hash storage

## 8.3 Password Hashing
`bcryptjs` with salt rounds (`genSalt(10)` + `hash`).

## 8.4 Proof Code Generation
```js
"PRIVIA-" + crypto.randomBytes(4).toString("hex").toUpperCase()
```
Random, short, human-readable code.

## 8.5 Proof Expiry
- TTL = 30 seconds.
- Verified endpoints also manually delete proof after use.
- MongoDB TTL index automatically deletes expired proofs, while application-level checks ensure immediate rejection even before deletion occurs.
Proofs follow a single-use + time-bound model: they expire automatically and are also deleted immediately after successful verification.

## 8.6 HMAC Claim Verification Helper
`utils/verifyClaim.js` computes HMAC-SHA256 with `PROOF_SECRET`.
Used by `POST /verify`.

Note for viva: currently, HMAC-based verification is used in active flow, while RSA utilities exist as an experimental extension for future asymmetric verification.

---

## 9. Backend Route-by-Route Deep Dive

## 9.1 App Boot (`app.js`)
1. Load env + middleware.
2. Connect MongoDB.
3. Start expired-proof cleanup interval.
4. Mount routes:
   - `/` -> public + dashboard pages
   - `/users` -> auth + registration + resubmission
   - `/admin` -> admin operations
   - `/proof` -> proof generation
   - `/api` -> API proof + scanner verification
   - `/verify` -> external verification route
   - `/scanner` -> scanner page

## 9.2 Public + Dashboard (`routes/index.js`)
- `GET /`: home
- `GET /about`
- `GET /how-it-works`
- `GET /security`
- `GET /dashboard` (auth required): prepares user data for dashboard UI:
  - `verificationStatus`
  - `claimVerified`
  - `rejectionReason`

## 9.3 User/Auth (`routes/users.js`)
- `GET /users/login`
- `GET /users/register`
- `POST /users/register`
  - validates fields
  - assigns first user as admin
  - hashes + encrypts email
  - creates default `email_verified` claim (pending)
  - saves uploaded proof file
- `POST /users/login` via Passport
- `POST /users/resubmit-proof`
  - accepts new ID proof upload
  - resets status to pending
  - clears rejection reason
  - sets email claim back to unverified
- `GET /users/logout`

## 9.4 Admin (`routes/admin.js`)
- `GET /admin`
  - filters by status (`all|approved|pending|rejected`)
  - computes dashboard stats
  - decrypts display names if needed
- `POST /admin/approve-user/:userId`
  - sets user approved
  - clears rejection fields
- `POST /admin/verify/:userId/:claimType`
  - can verify claim only when user is approved
- `POST /admin/reject-user/:userId`
  - requires reason
  - sets user rejected
  - resets email claim to unverified

## 9.5 Proof Generation (`routes/proof.js`)
- `GET /proof` (auth required)
- Requires:
  - approved user
  - verified `email_verified` claim
- Returns existing unexpired proof unless regenerate flag present.

## 9.6 API (`routes/api.js`)
- `POST /api/proof` (auth required)
  - similar logic to `/proof`, JSON API style
- `POST /api/verify-proof`
  - scanner endpoint
  - validates code existence, expiry, user approval
  - deletes proof after success or expiry

## 9.7 Verify Route (`routes/verify.js`)
- `GET /verify/proof/:code`
  - browser-based verification page (used in QR URL)
  - returns HTML result directly
- `POST /verify`
  - verifies signed claim payload using helper

---

## 10. Frontend Architecture and Important Page Logic

## 10.1 Global Layout (`views/layout.ejs`)
- Shared navbar + hero + dark theme.
- Dynamic hero content based on route.
- Home page uses full-screen video background.
- Flash toasts displayed through partial include.

## 10.2 Register Page
- Form fields: name, email, password, confirm, proof file.
- Enctype multipart for Multer upload.

## 10.3 Login Page
- Simple form posts to `/users/login`.

## 10.4 Dashboard Page (critical logic)
- Shows account status:
  - approved / pending / rejected.
- If approved:
  - generate proof
  - regenerate proof
  - show/hide QR
  - copy proof code
  - countdown timer until expiry
- If rejected:
  - shows rejection reason
  - shows re-submit proof form.

## 10.5 Admin Page (critical logic)
- User table with:
  - proof preview
  - claim status (shown only after user approval)
  - user status
  - actions (approve, verify claim, reject with reason)
- Workflow respects your latest logic:
  - pending users: no claim action shown
  - approved users: claim pending -> can verify or reject claim

## 10.6 Scanner Page
- Camera does **not auto-start**.
- User clicks **Start Scan**.
- Parses QR data in multiple formats:
  - raw code
  - JSON payload with code
  - `/verify/proof/:code` URL
- Calls `/api/verify-proof` and shows result.

---

## 11. Full Business Workflow (Current)

1. User registers (claim pending, user pending).
2. Admin reviews uploaded proof.
3. Admin approves user (user approved, claim still pending).
4. Admin verifies claim (claim approved).
5. User generates proof code/QR (30s validity).
6. Verifier scans QR:
   - valid + unexpired + approved user => success.
   - else reasoned rejection.
7. If admin rejects:
   - rejection reason stored.
   - user sees reason in dashboard.
   - user re-submits new proof.

---

## 12. State Machine You Can Draw in Presentation

## 12.1 User Verification Status
- `pending` -> `approved`
- `pending` -> `rejected`
- `rejected` -> `pending` (after re-submit)
- `approved` -> `rejected` (claim-level reject path)

## 12.2 Claim Status (`email_verified`)
- initial `false`
- set `true` only by admin verify action
- reset to `false` on rejection/re-submission

## 12.3 Proof Status
- generated -> active (30s) -> expired/deleted
- also deleted after successful verification (single-use behavior)

---

## 13. What to Say About Privacy Preservation

You can explain Privia as:
Privia ensures that verifiers never access raw identity data; they only receive a binary trust decision derived from validated claims.
1. **Data minimization**: verifier sees validity, not full identity data.
2. **Encrypted storage**: email encrypted before DB.
3. **Hash-backed integrity**: claim hash used for tamper-resistant representation.
4. **Time-bound access**: proof valid only for 30 seconds.
5. **Human governance**: admin approval + rejection reasons.
6. **Revocation-like behavior**: rejection resets claim approval.

---

## 14. Deployment (Render) - Correct Production Setup

1. Service type: **Web Service** (not Static Site).
2. Build command: `npm install`
3. Start command: `npm start`
4. Set env vars (`MONGO_URI`, `SECRET_KEY`, `SESSION_SECRET`, `PROOF_SECRET`, `NODE_ENV`).
5. Ensure Atlas network access allows Render.
6. Deploy latest commit.
7. Test routes:
   - `/`
   - `/users/login`
   - `/dashboard` after login
   - `/admin` for admin user.

---

## 15. Known Practical Limitations (Mention Honestly in Viva)

1. `uploads/` is local filesystem; cloud restart/redeploy may lose files.
2. `activeProof` remains only for backward compatibility and is no longer used in the active proof generation or verification flow.
3. Auxiliary signature utilities (`signClaim.js` RSA vs `verifyClaim.js` HMAC) are not unified into one production cryptographic flow.
4. Name decryption fallback exists for compatibility though names are generally plain.

These are acceptable for MVP and strong future work points.

---

## 16. Suggested Future Improvements

1. Store uploaded proofs in Cloudinary/S3.
2. Unify claim signing/verification approach (single cryptographic standard).
3. Add formal audit logging for admin actions.
4. Add rate limiting and stronger input validation.
5. Add automated tests for route-level and workflow-level behavior.
6. Add optional email notification for rejection reason and re-submission request.

---

## 17. Viva Questions (High Probability) + Short Answer Direction

1. Why use Passport local strategy?  
   - Session-based auth, straightforward with server-rendered EJS architecture.

2. Why both encryption and hashing for email?  
   - Encryption for recoverable protected storage; hashing for deterministic lookup and duplicate prevention.

3. Why short proof TTL?  
   - Reduces replay window and enforces contextual verification.

4. How do you prevent duplicate email registration?  
   - SHA-256 hash uniqueness + legacy encrypted-email fallback check.

5. What happens if proof is scanned after expiry?  
   - Rejected with `expired` reason and deleted.

6. Can unverified users generate proof?  
   - No. Both user approval and claim verification are checked.

7. How does admin rejection work?  
   - Stores reason, marks user rejected, resets claim verification.

8. How does user know what to fix after rejection?  
   - Dashboard displays rejection reason + re-submit proof form.

9. Why EJS instead of React?  
   - MVP speed, simpler server-side rendering, current project constraints.

10. How is role-based access implemented?  
   - `ensureAdmin` middleware plus `user.role` check.

11. How are sessions managed?  
   - `express-session`, Passport serialize/deserialize, flash-based UX messages.

12. Why keep both `/proof` and `/api/proof`?  
   - Supports dashboard flow and API-based integrations.

13. What is the scanner doing technically?  
   - Captures QR, extracts code, calls `/api/verify-proof`, displays outcome.

14. How are expired proofs cleaned up?  
   - MongoDB TTL index removes expired records, and route-level checks reject expired proofs immediately.

15. How can this scale?  
   - Move files to object storage, add caching/queueing, split modules/services.

---

## 18. 7-Day Study Plan (So You Can Present Confidently)

## Day 1: Architecture
- Read `app.js`, `config/*`, folder structure.
- Draw full request pipeline.

## Day 2: Auth + User lifecycle
- Read `users.js`, `passport.js`, `auth.js`.
- Practice explaining login/register/logout in your own words.

## Day 3: Data + Security
- Read `models/*`, crypto parts in `users.js`, `verifyClaim.js`.
- Prepare AES/SHA/bcrypt explanations.

## Day 4: Admin and Governance
- Read `admin.js`, `admin.ejs`.
- Practice approval/rejection/reason/resubmit flow explanation.

## Day 5: Proof + Scanner
- Read `proof.js`, `api.js`, `verify.js`, `dashboard.ejs`, `scanner.ejs`.
- Practice demo sequence live.

## Day 6: Deployment + Failure cases
- Deploy on Render, test all paths.
- Prepare answers for “what if DB down / proof expired / user rejected?”

## Day 7: Mock Viva
- Use section 17 questions.
- Present architecture + workflow without reading notes.

---

## 19. Quick Demo Script for Professor

1. Register new user with proof upload.  
2. Login as admin, open admin dashboard.  
3. Approve user, then approve claim.  
4. Login as user, generate proof code + QR.  
5. Open scanner, click Start Scan, scan QR.  
6. Show success result and explain expiry + single-use behavior.  
7. Optionally show reject flow with reason + user re-submission.

---

## 20. Final One-Line Summary

**Privia is an Express-Mongo, claim-driven identity verification MVP that minimizes personal data exposure by combining encrypted storage, admin-governed trust decisions, and short-lived QR proof verification.**

