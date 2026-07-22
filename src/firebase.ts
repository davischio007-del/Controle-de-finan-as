import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Habilitar persistência de autenticação do Firebase Auth
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Persistência Firebase Auth alerta:', err?.message || err);
});

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function testFirestoreConnection() {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('O cliente Firestore está offline no momento.');
    }
  }
}

// Inicializador automático para garantir a existência do usuário Admin no Firebase Auth + Firestore
export async function ensureAdminUserCreated() {
  const adminEmail = 'admin@financpro.com';
  const adminPassword = 'admin';

  try {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch {
          return;
        }
      } else {
        return;
      }
    }

    if (userCredential?.user) {
      const uid = userCredential.user.uid;
      const userRef = doc(db, 'users', uid);
      const snap = await getDocFromServer(userRef).catch(() => null);
      if (!snap || !snap.exists()) {
        await setDoc(userRef, {
          uid,
          fullName: 'Administrador',
          username: 'admin',
          email: adminEmail,
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          failedLoginAttempts: 0
        }, { merge: true });
      }
    }
  } catch (e) {
    console.warn('Auto-inicialização de admin finalizada ou tratada:', e);
  }
}

// Executa em segundo plano para provisionar automaticamente no carregamento da aplicação
ensureAdminUserCreated();
