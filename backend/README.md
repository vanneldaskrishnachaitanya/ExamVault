# VNRVJIET Academic Repository — Backend

> Node.js · Express · MongoDB · Mongoose · Firebase Admin SDK

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| MongoDB | Local 6+ **or** MongoDB Atlas free cluster |
| Firebase project | With Google Sign-In enabled |

---

## Setup Instructions

### 1. Clone and install

```bash
git clone <your-repo-url>
cd backend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in each value:

| Variable | Where to get it |
|----------|----------------|
| `MONGODB_URI` | Local: `mongodb://localhost:27017/vnrvjiet_repo`  Atlas: copy from cluster Connect dialog |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → **Service Accounts** → Generate new private key (JSON) |
| `FIREBASE_PRIVATE_KEY` | Same JSON — copy the `private_key` value, keep surrounding quotes, keep `\n` sequences |
| `CLIENT_URL` | Your React/Next.js dev server, e.g. `http://localhost:3000` |

> **Tip:** In the private key value, newlines in the JSON appear as `\n`.  
> Paste them as-is with the enclosing quotes: `FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...`

### 3. Run the server

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

The API listens on **http://localhost:5000** by default.

---

## API Reference

### Authentication

All protected routes require:
```
Authorization: Bearer <Firebase ID Token>
```
Any email **not ending in `@vnrvjiet.in`** receives `403 Forbidden`.

### Response shape

```json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "errors": ["..."] }
```

---

### Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Verify Firebase token → upsert user → return profile |
| `GET`  | `/auth/me`    | Return current user's profile |

---

### File Endpoints (student + admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/files/upload` | Upload a file (`multipart/form-data`, field: `file`) |
| `GET`  | `/files` | List approved files (filterable) |
| `GET`  | `/files/:id` | Get file metadata |
| `GET`  | `/files/download/:id` | Download file binary |

**Upload body fields:**

| Field | Required | Values |
|-------|----------|--------|
| `regulation` | Yes | `R22`, `R18`, `R16`, `R14` |
| `branch` | Yes | e.g. `CSE`, `ECE` |
| `subject` | Yes | free text |
| `category` | Yes | `paper` or `resource` |
| `examType` | If category=paper | `mid1`, `mid2`, `semester` |
| `year` | No | integer |

**GET /files query params:** `regulation`, `branch`, `subject`, `category`, `examType`, `year`, `page`, `limit`

---

### Report Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/reports` | student, admin | Report a file |

**Report body:**
```json
{ "fileId": "<ObjectId>", "reason": "duplicate", "description": "Optional detail" }
```

Valid reasons: `wrong_subject` · `wrong_exam_type` · `duplicate` · `poor_quality` · `inappropriate` · `other`

---

### Admin Endpoints (admin role only)

| Method | Path | Description |
|--------|------|-------------|
| `GET`   | `/admin/pending-files` | List files awaiting approval |
| `PATCH` | `/admin/files/:id/approve` | Approve a file |
| `PATCH` | `/admin/files/:id/reject` | Reject — body: `{ "note": "reason" }` |
| `DELETE`| `/admin/files/:id` | Permanently delete file + disk asset |
| `GET`   | `/admin/reports` | List all reports — query: `status=open|resolved` |
| `PATCH` | `/admin/reports/:id/resolve` | Mark report resolved |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js           MongoDB connection
│   │   └── firebase.js     Firebase Admin SDK init
│   ├── models/
│   │   ├── User.js
│   │   ├── File.js
│   │   └── Report.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── fileController.js
│   │   └── reportController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── fileRoutes.js   (also exports adminRouter)
│   │   └── reportRoutes.js (also exports adminReportRouter)
│   ├── middleware/
│   │   ├── authMiddleware.js   Firebase verify + @vnrvjiet.in gate
│   │   └── roleMiddleware.js   restrictTo('student'|'admin')
│   ├── services/
│   │   └── fileService.js  multer config + disk helpers
│   ├── utils/
│   │   ├── validators.js   express-validator chains
│   │   └── logger.js       Winston logger
│   └── server.js           Entry point
├── uploads/                Uploaded files stored here
├── logs/                   Winston log files (auto-created)
├── package.json
└── .env.example
```

---

## Upload → Approval Workflow

```
Student uploads file
      ↓
  status = "pending"
      ↓
Admin reviews in /admin/pending-files
      ↓
  APPROVE → status = "approved" → visible to all students
  REJECT  → status = "rejected" → hidden, note attached
```

---

## Making Yourself an Admin

After logging in at least once (so your user doc is created), run in MongoDB shell:

```js
db.users.updateOne(
  { email: "your.email@vnrvjiet.in" },
  { $set: { role: "admin" } }
)
```
