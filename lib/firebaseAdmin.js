import admin from 'firebase-admin';

function normalizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n').trim();
  if (key && !key.includes('-----BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8').trim();
      if (decoded.includes('-----BEGIN')) {
        key = decoded.replace(/\\n/g, '\n');
      }
    } catch {
      // Biarkan validasi di bawah menangani format yang tidak valid
    }
  }
  return key.includes('-----BEGIN') ? key : '';
}

const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();

if (!admin.apps.length && clientEmail && privateKey && projectId) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.warn('[firebaseAdmin] Gagal menginisialisasi Firebase Admin:', error?.message || error);
  }
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

