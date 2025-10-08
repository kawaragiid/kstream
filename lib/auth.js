"use client";

import { doc, getDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

export function login(email, password) {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export function register(email, password) {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  const auth = getFirebaseAuth();
  return signOut(auth);
}

export function onAuthChange(cb) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, cb);
}

export function resetPassword(email) {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email);
}

export function updateProfile(user, data) {
  return firebaseUpdateProfile(user, data);
}

// Simple role check placeholder. Replace with Firestore claims/roles.
export async function isPremium(user) {
  if (!user) return false;
  const db = getDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const data = snap.data();
  const role = data?.role?.toLowerCase?.();
  if (role && ['super-admin', 'admin', 'editor'].includes(role)) {
    return true;
  }
  if (role === 'pelanggan') {
    const expiresAt = data?.expiresAt;
    let expiresDate = null;
    if (expiresAt?.toDate) {
      expiresDate = expiresAt.toDate();
    } else if (typeof expiresAt === 'string') {
      const parsed = new Date(expiresAt);
      if (!Number.isNaN(parsed.getTime())) {
        expiresDate = parsed;
      }
    }
    if (expiresDate && expiresDate.getTime() > Date.now()) {
      return true;
    }
  }
  return false;
}

export function loginWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters?.({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}
