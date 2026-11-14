// Minimal Firebase client initialization usable on client & server
// Catatan: Firebase Storage sengaja TIDAK dipakai (berbayar). Hanya Auth + Firestore (free tier).
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const REQUIRED_CONFIG_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

function getValidatedFirebaseConfig() {
  const missing = REQUIRED_CONFIG_KEYS.filter((key) => !firebaseConfig[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config tidak lengkap. Env yang belum diset: ${missing.join(', ')}.`
    );
  }
  return firebaseConfig;
}

export function getFirebaseApp() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client SDK hanya dapat diinisialisasi di browser.');
  }
  if (!getApps().length) {
    try {
      return initializeApp(getValidatedFirebaseConfig());
    } catch (error) {
      throw new Error(`Gagal menginisialisasi Firebase client app: ${error?.message || error}`);
    }
  }
  return getApp();
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getDb() {
  return getFirestore(getFirebaseApp());
}
