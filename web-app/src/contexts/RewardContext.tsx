import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface RewardContextType {
  effortPoints: number;
  awardPoints: (amount: number, reason: string) => void;
  floatingPoints: { id: string; amount: number }[];
}

const RewardContext = createContext<RewardContextType>({
  effortPoints: 0,
  awardPoints: () => {},
  floatingPoints: [],
});

export const useReward = () => useContext(RewardContext);

// Limites simples para não floodar pontos (regra oculta no frontend)
// Ex: só ganha pontos por perguntas a cada 30 segundos
const ACTION_COOLDOWNS: Record<string, number> = {
  'ask_question': 30000,
  'create_note': 10000,
  'complete_task': 0, // tasks não tem cooldown
  'move_note': 60000,
};

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [effortPoints, setEffortPoints] = useState<number>(0);
  const [floatingPoints, setFloatingPoints] = useState<{ id: string; amount: number }[]>([]);
  const [lastActionTimes, setLastActionTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) {
      setEffortPoints(0);
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEffortPoints(data.effortPoints || 0);
      } else {
        // Document doesn't exist, create it
        setDoc(docRef, { effortPoints: 0, unlockedItems: [] }, { merge: true });
        setEffortPoints(0);
      }
    });

    return unsubscribe;
  }, [user]);

  const awardPoints = useCallback((amount: number, reason: string) => {
    if (!user) return;

    const now = Date.now();
    const cooldown = ACTION_COOLDOWNS[reason] || 0;
    const lastTime = lastActionTimes[reason] || 0;

    if (now - lastTime < cooldown) {
      // Cooldown ativo, não ganha pontos agora
      return;
    }

    // Atualiza o tempo da última ação
    setLastActionTimes(prev => ({ ...prev, [reason]: now }));

    // Dispara animação
    const animId = Math.random().toString(36).substring(7);
    setFloatingPoints(prev => [...prev, { id: animId, amount }]);
    
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(p => p.id !== animId));
    }, 2500);

    // Salva no banco (usa merge pra não sobrescrever outras coisas)
    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    getDoc(docRef).then(snap => {
      const currentPoints = snap.exists() ? (snap.data().effortPoints || 0) : 0;
      setDoc(docRef, { 
        effortPoints: currentPoints + amount,
        lastEarnedAt: serverTimestamp() 
      }, { merge: true });
    }).catch(e => console.error("Erro ao dar pontos:", e));

  }, [user, lastActionTimes]);

  return (
    <RewardContext.Provider value={{ effortPoints, awardPoints, floatingPoints }}>
      {children}
    </RewardContext.Provider>
  );
};
