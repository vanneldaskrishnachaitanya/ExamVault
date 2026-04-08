// src/auth/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';

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

const toFriendlyAuthError = (err) => {
  const code = err?.code || '';

  if (code === 'auth/operation-not-allowed') {
    return new Error(
      'Demo login is disabled in Firebase. Enable Authentication > Sign-in method > Email/Password in your Firebase project.'
    );
  }

  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
    return new Error('Demo faculty account not found. Run backend: npm run create:demo-faculty');
  }

  if (code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials') {
    return new Error('Demo faculty password is incorrect. Update VITE_DEMO_FACULTY_PASSWORD in frontend .env.');
  }

  return new Error(err?.message || 'Firebase sign-in failed.');
};

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

export const signInWithEmailPassword = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = credential;

    if (!user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await signOut(auth);
      throw new Error(
        `Access denied. Only @${ALLOWED_DOMAIN} email addresses are permitted.`
      );
    }

    const idToken = await user.getIdToken();
    return { user, idToken };
  } catch (err) {
    throw toFriendlyAuthError(err);
  }
};

export const firebaseSignOut = () => signOut(auth);
