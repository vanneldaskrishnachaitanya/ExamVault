# VNRVJIET Academic Repository — Setup

## 1. Install dependencies
```bash
npm install
```

## 2. Create your .env file
```bash
cp .env.example .env
```
Then open `.env` and fill in your Firebase values.
Get them from: **Firebase Console → Project Settings → Your Apps → Web App config**

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_BASE_URL=http://localhost:5000
VITE_ALLOWED_DOMAIN=vnrvjiet.in
```

## 3. Run the dev server
```bash
npm run dev
```
Opens at http://localhost:3000

## 4. Promote yourself to admin (first time only)
After logging in once via /admin-login, run in MongoDB:
```js
db.users.updateOne(
  { email: "vanneldaskrishnachaitanya@gmail.com" },
  { $set: { role: "admin" } }
)
```

## Common causes of blank white page
- `.env` file missing or empty → copy from `.env.example`
- Firebase API key is wrong → check Firebase Console
- Backend not running → start it on port 5000
- Check browser Console (F12) for the exact error
