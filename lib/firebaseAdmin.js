import admin from 'firebase-admin';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length && clientEmail && privateKey && projectId) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const hasAdmin = admin.apps.length > 0;

export function getAdminApp() {
  if (!hasAdmin) {
    throw new Error('Firebase admin belum dikonfigurasi. Set FIREBASE_PRIVATE_KEY dan FIREBASE_CLIENT_EMAIL.');
  }
  return admin.app();
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export { admin };

