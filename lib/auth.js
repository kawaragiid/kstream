"use client";

import { getFirebaseAuth } from './firebase';
import { readUserDoc, updateUserProfileDoc } from './firestore';
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

function requireAuth() {
  try {
    return getFirebaseAuth();
  } catch (error) {
    throw new Error(error?.message || 'Layanan autentikasi belum siap.');
  }
}

export async function login(email, password) {
  const auth = requireAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  const auth = requireAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  const auth = requireAuth();
  return signOut(auth);
}

export function onAuthChange(cb, onError) {
  try {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, cb, (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
    });
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error);
    }
    return () => {};
  }
}

export async function resetPassword(email) {
  const auth = requireAuth();
  return sendPasswordResetEmail(auth, email);
}

export async function updateProfile(user, data) {
  if (!user) {
    throw new Error('User tidak terautentikasi.');
  }
  await firebaseUpdateProfile(user, data);
  if (user.uid && data && typeof data === 'object') {
    const patch = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.photoURL !== undefined) patch.photoURL = data.photoURL;
    if (Object.keys(patch).length > 0) {
      await updateUserProfileDoc(user.uid, patch).catch((err) => {
        console.warn('[auth] Gagal menyinkronkan profil ke server:', err?.message || err);
      });
    }
  }
}

export async function isPremium(user) {
  if (!user?.uid) return false;
  try {
    const { data } = await readUserDoc(user.uid);
    if (!data || data.isActive !== true) return false;
    const role = typeof data.role === 'string' ? data.role.toLowerCase() : '';
    if (['super-admin', 'admin', 'editor'].includes(role)) {
      return true;
    }
    if (data.plan !== 'premium') return false;
    if (data.expiresAt) {
      const expiresMs =
        typeof data.expiresAt === 'number' ? data.expiresAt : Date.parse(data.expiresAt);
      if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function loginWithGoogle() {
  const auth = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters?.({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}
