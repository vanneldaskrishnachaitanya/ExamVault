// src/auth/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Crash early with a helpful message if .env is missing
if (!firebaseConfig.apiKey) {
  throw new Error(
    '[VNRVJIET] Firebase config is missing.\n' +
    'Copy .env.example to .env and fill in your Firebase project values.\n' +
    'Get them from: Firebase Console → Project Settings → Your Apps → Web App'
  );
}

const app = initializeApp(firebaseConfig);

export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();

provider.setCustomParameters({ prompt: 'select_account' });

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'vnrvjiet.in';

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  const { user } = result;

  if (!user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await signOut(auth);
    throw new Error(
      `Access denied. Only @${ALLOWED_DOMAIN} email addresses are permitted.`
    );
  }

  const idToken = await user.getIdToken();
  return { user, idToken };
};

export const firebaseSignOut = () => signOut(auth);
