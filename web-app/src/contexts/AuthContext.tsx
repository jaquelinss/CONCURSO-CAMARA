import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  apiKey: string | null;
  hasSeenWelcome: boolean;
  selectedBanca: string | null;
  saveApiKey: (key: string) => Promise<void>;
  saveBanca: (banca: string) => Promise<void>;
  markWelcomeAsSeen: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  apiKey: null,
  hasSeenWelcome: false,
  selectedBanca: null,
  saveApiKey: async () => {},
  saveBanca: async () => {},
  markWelcomeAsSeen: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(false);
  const [selectedBanca, setSelectedBanca] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'settings', 'config');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setApiKey(data.apiKey || null);
            setHasSeenWelcome(data.hasSeenWelcome || false);
            setSelectedBanca(data.selectedBanca || 'IBAM');
          } else {
            // Document doesn't exist yet
            setApiKey(null);
            setHasSeenWelcome(false);
            setSelectedBanca('IBAM');
          }
        } catch (error) {
          console.error("Error fetching user settings:", error);
        }
      } else {
        setApiKey(null);
        setHasSeenWelcome(false);
        setSelectedBanca(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const saveApiKey = async (key: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'config');
      await setDoc(docRef, { apiKey: key }, { merge: true });
      setApiKey(key);
    } catch (error) {
      console.error("Error saving API Key:", error);
      throw error;
    }
  };



  const saveBanca = async (banca: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'config');
      await setDoc(docRef, { selectedBanca: banca }, { merge: true });
      setSelectedBanca(banca);
    } catch (error) {
      console.error("Error saving Banca:", error);
      throw error;
    }
  };

  const markWelcomeAsSeen = async () => {
    if (!user) return;
    
    // Atualiza o estado local IMEDIATAMENTE para fechar o modal
    setHasSeenWelcome(true);

    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'config');
      // Fire and forget, don't wait for it if it hangs
      setDoc(docRef, { hasSeenWelcome: true }, { merge: true }).catch(err => {
        console.error("Error background saving welcome status:", err);
        alert("Erro no Firebase (fundo): " + err.message);
      });
    } catch (error: any) {
      console.error("Error updating welcome status:", error);
      alert("Erro ao pular boas vindas: " + error?.message);
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, apiKey, hasSeenWelcome, selectedBanca, saveApiKey, saveBanca, markWelcomeAsSeen, isAdmin: user?.email === 'quelinalins@gmail.com' }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
