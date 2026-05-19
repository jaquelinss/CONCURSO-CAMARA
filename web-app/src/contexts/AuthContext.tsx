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
  saveApiKey: (key: string) => Promise<void>;
  markWelcomeAsSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  apiKey: null,
  hasSeenWelcome: false,
  saveApiKey: async () => {},
  markWelcomeAsSeen: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(false);

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
          } else {
            // Document doesn't exist yet
            setApiKey(null);
            setHasSeenWelcome(false);
          }
        } catch (error) {
          console.error("Error fetching user settings:", error);
        }
      } else {
        setApiKey(null);
        setHasSeenWelcome(false);
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

  const markWelcomeAsSeen = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'config');
      await setDoc(docRef, { hasSeenWelcome: true }, { merge: true });
      setHasSeenWelcome(true);
    } catch (error) {
      console.error("Error updating welcome status:", error);
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, apiKey, hasSeenWelcome, saveApiKey, markWelcomeAsSeen }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
