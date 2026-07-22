/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  firebaseUser: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        const uid = fbUser.uid;
        const userRef = doc(db, 'users', uid);

        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setCurrentUser({ uid, ...snap.data() } as User);
          } else {
            const newUser: User = {
              uid,
              fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
              username: fbUser.email?.split('@')[0] || 'usuario',
              email: fbUser.email || '',
              role: fbUser.email?.includes('admin') ? 'admin' : 'user',
              active: true,
              createdAt: new Date().toISOString(),
              failedLoginAttempts: 0
            };
            await setDoc(userRef, newUser, { merge: true });
            setCurrentUser(newUser);
          }
        } catch (error) {
          console.warn('Erro ao carregar perfil no AuthProvider, utilizando fallback local:', error);
          const cached = localStorage.getItem(`financ_user_profile_${uid}`);
          if (cached) {
            try {
              setCurrentUser(JSON.parse(cached));
            } catch {
              // fallback
            }
          }
        }
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await fbSignOut(auth);
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.role === 'admin' || (currentUser as any)?.permissao === 'administrador';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
