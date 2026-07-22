import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
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

// Habilitar persistência de autenticação do Firebase Auth (browserLocalPersistence)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Persistência Firebase Auth alerta:', err?.message || err);
});

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export { onAuthStateChanged, signOut };

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
  // Lista de administradores padrão para provisionamento automático no Firebase Auth
  const defaultAdmins = [
    {
      nome: 'davischio',
      username: 'davischio',
      email: 'davischio@admin.com',
      password: 'Snoop123@',
      role: 'admin',
      permissao: 'administrador'
    },
    {
      nome: 'Administrador',
      username: 'admin',
      email: 'admin@financpro.com',
      password: 'admin',
      role: 'admin',
      permissao: 'administrador'
    }
  ];

  for (const adminData of defaultAdmins) {
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, adminData.email, adminData.password);
      } catch (err: any) {
        const code = err?.code;
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password);
          } catch {
            continue;
          }
        } else {
          continue;
        }
      }

      if (userCredential?.user) {
        const uid = userCredential.user.uid;
        const userRef = doc(db, 'users', uid);
        const snap = await getDocFromServer(userRef).catch(() => null);
        if (!snap || !snap.exists()) {
          await setDoc(userRef, {
            uid,
            nome: adminData.nome,
            fullName: adminData.nome,
            username: adminData.username,
            email: adminData.email,
            role: adminData.role,
            permissao: adminData.permissao,
            active: true,
            ativo: true,
            createdAt: new Date().toISOString(),
            failedLoginAttempts: 0
          }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Auto-inicialização do admin finalizada:', e);
    }
  }
}

// Executa auto-provisionamento em segundo plano ao iniciar
ensureAdminUserCreated();

