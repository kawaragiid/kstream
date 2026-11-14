"use client";

import { getFirebaseAuth } from './firebase';
import { readUserDoc } from './firestore';
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

export function resetPassword(email) {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email);
}

export function updateProfile(user, data) {
  return firebaseUpdateProfile(user, data);
}

export async function isPremium(user) {
  if (!user?.uid) return false;
  const { data } = await readUserDoc(user.uid);
  return Boolean(
    data &&
      data.isActive === true &&
      (data.plan === 'premium' || ['super-admin', 'admin', 'editor'].includes(data.role?.toLowerCase?.()))
  );
}

export function loginWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters?.({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}
