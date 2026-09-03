import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface StickerInstance {
  instanceId: string;
  stickerId: string;
  isUsed?: boolean;
  route?: string;
  customUrl?: string;
}

interface RewardContextType {
  effortPoints: number;
  unlockedStickers: StickerInstance[];
  awardPoints: (amount: number, reason: string) => void;
  awardFocusPoints: (seconds: number) => void;
  spendPoints: (amount: number, reason: string) => Promise<boolean>;
  addStickerToInventory: (stickerId: string, customUrl?: string) => Promise<void>;
  addMultipleStickersToInventory: (stickers: { id: string, url: string }[]) => Promise<void>;
  markStickerAsUsed: (instanceId: string, route: string) => Promise<void>;
  markStickerAsUnused: (instanceId: string) => Promise<void>;
  activeStamper: { instanceId: string; stickerId: string; customUrl?: string } | null;
  setActiveStamper: (stamper: { instanceId: string; stickerId: string; customUrl?: string } | null) => void;
  floatingPoints: { id: string; amount: number }[];
  unlockedColors: string[];
  activeColor: string;
  buyColor: (colorId: string) => Promise<boolean>;
  setActiveColor: (colorId: string) => Promise<void>;
}

const RewardContext = createContext<RewardContextType>({
  effortPoints: 0,
  unlockedStickers: [],
  awardPoints: () => {},
  awardFocusPoints: () => {},
  spendPoints: async () => false,
  addStickerToInventory: async () => {},
  addMultipleStickersToInventory: async () => {},
  markStickerAsUsed: async () => {},
  markStickerAsUnused: async () => {},
  activeStamper: null,
  setActiveStamper: () => {},
  floatingPoints: [],
  unlockedColors: ['indigo'],
  activeColor: 'indigo',
  buyColor: async () => false,
  setActiveColor: async () => {},
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
  const [activeStamper, setActiveStamper] = useState<{ instanceId: string; stickerId: string; customUrl?: string } | null>(null);
  const [floatingPoints, setFloatingPoints] = useState<{ id: string; amount: number }[]>([]);
  const [lastActionTimes, setLastActionTimes] = useState<Record<string, number>>({});

  const [unlockedStickers, setUnlockedStickers] = useState<StickerInstance[]>([]);
  const [unlockedColors, setUnlockedColors] = useState<string[]>(['indigo']);
  const [activeColor, setActiveColorState] = useState<string>('indigo');

  useEffect(() => {
    if (!user) {
      setEffortPoints(0);
      setUnlockedStickers([]);
      setUnlockedColors(['indigo']);
      setActiveColorState('indigo');
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEffortPoints(data.effortPoints || 0);
        setUnlockedStickers(data.unlockedStickers || []);
        
        const colors = data.unlockedColors || ['indigo'];
        const currentActive = data.activeColor || 'indigo';
        setUnlockedColors(colors);
        setActiveColorState(currentActive);
        
        document.documentElement.setAttribute('data-theme-color', currentActive);
      } else {
        setEffortPoints(0);
        setUnlockedStickers([]);
        setUnlockedColors(['indigo']);
        setActiveColorState('indigo');
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

  const awardFocusPoints = useCallback((seconds: number) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    getDoc(docRef).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      const currentPoints = data.effortPoints || 0;
      const unrewarded = (data.unrewardedFocusSeconds || 0) + seconds;
      
      const chunksOf10Min = Math.floor(unrewarded / 600);
      const newUnrewarded = unrewarded % 600;
      
      if (chunksOf10Min > 0) {
        const pointsToAward = chunksOf10Min * 15;
        
        // Dispara animação
        const animId = Math.random().toString(36).substring(7);
        setFloatingPoints(prev => [...prev, { id: animId, amount: pointsToAward }]);
        setTimeout(() => {
          setFloatingPoints(prev => prev.filter(p => p.id !== animId));
        }, 2500);

        setDoc(docRef, { 
          effortPoints: currentPoints + pointsToAward,
          unrewardedFocusSeconds: newUnrewarded,
          lastEarnedAt: serverTimestamp() 
        }, { merge: true });
      } else {
        setDoc(docRef, {
          unrewardedFocusSeconds: newUnrewarded
        }, { merge: true });
      }
    }).catch(e => console.error("Erro ao dar pontos de foco:", e));
  }, [user]);

  const spendPoints = useCallback(async (amount: number, reason: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
      const snap = await getDoc(docRef);
      const currentPoints = snap.exists() ? (snap.data().effortPoints || 0) : 0;
      
      if (currentPoints < amount) {
        return false;
      }
      
      await setDoc(docRef, { 
        effortPoints: currentPoints - amount,
        lastSpentAt: serverTimestamp(),
        lastSpentReason: reason
      }, { merge: true });
      
      return true;
    } catch (e) {
      console.error("Erro ao gastar pontos:", e);
      return false;
    }
  }, [user]);

  const addStickerToInventory = useCallback(async (stickerId: string, customUrl?: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
      const snap = await getDoc(docRef);
      const currentStickers = snap.exists() ? (snap.data().unlockedStickers || []) : [];
      
      const newInstance: StickerInstance = {
        instanceId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        stickerId,
        customUrl,
        isUsed: false
      };
      
      await setDoc(docRef, { 
        unlockedStickers: [...currentStickers, newInstance]
      }, { merge: true });
    } catch (e) {
      console.error("Erro ao adicionar sticker ao inventário:", e);
    }
  }, [user]);

  const addMultipleStickersToInventory = useCallback(async (stickers: { id: string, url: string }[]) => {
    if (!user || stickers.length === 0) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
      const snap = await getDoc(docRef);
      const currentStickers = snap.exists() ? (snap.data().unlockedStickers || []) : [];
      
      const newInstances: StickerInstance[] = stickers.map((s, i) => ({
        instanceId: Date.now().toString() + Math.random().toString(36).substr(2, 5) + i,
        stickerId: s.id,
        customUrl: s.url,
        isUsed: false
      }));
      
      await setDoc(docRef, { 
        unlockedStickers: [...currentStickers, ...newInstances]
      }, { merge: true });
    } catch (e) {
      console.error("Erro ao adicionar stickers do pacote ao inventário:", e);
    }
  }, [user]);


  const markStickerAsUsed = useCallback(async (instanceId: string, route: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      
      const currentStickers: StickerInstance[] = snap.data().unlockedStickers || [];
      const updatedStickers = currentStickers.map(s => 
        s.instanceId === instanceId ? { ...s, isUsed: true, route } : s
      );
      
      await setDoc(docRef, { unlockedStickers: updatedStickers }, { merge: true });
    } catch (e) {
      console.error("Erro ao marcar sticker como usado:", e);
    }
  }, [user]);

  const markStickerAsUnused = useCallback(async (instanceId: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    
    const currentStickers: StickerInstance[] = snap.data().unlockedStickers || [];
    
    // Emit event so the responsible component (Whiteboard, Postit, Decorator) removes it from its UI and DB
    window.dispatchEvent(new CustomEvent('remove-sticker', { detail: { instanceId } }));

    const updatedStickers = currentStickers.map(s => {
      if (s.instanceId === instanceId) {
        const { route, ...rest } = s;
        return { ...rest, isUsed: false };
      }
      return s;
    });
    
    await setDoc(docRef, { unlockedStickers: updatedStickers }, { merge: true });
  }, [user]);

  const buyColor = useCallback(async (colorId: string) => {
    if (!user) return false;
    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    
    const data = snap.data();
    const colors = data.unlockedColors || ['indigo'];
    if (colors.includes(colorId)) return true;

    // Check points and deduct
    const currentPoints = data.effortPoints || 0;
    const PRICE = 3000; // Fixed price for all colors
    if (currentPoints < PRICE) return false;

    colors.push(colorId);
    await setDoc(docRef, { 
      effortPoints: currentPoints - PRICE,
      unlockedColors: colors 
    }, { merge: true });
    
    return true;
  }, [user]);

  const setActiveColor = useCallback(async (colorId: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    await setDoc(docRef, { activeColor: colorId }, { merge: true });
  }, [user]);

  return (
    <RewardContext.Provider value={{ 
      effortPoints, 
      unlockedStickers, 
      awardPoints, 
      awardFocusPoints, 
      spendPoints, 
      addStickerToInventory, 
      addMultipleStickersToInventory, 
      markStickerAsUsed, 
      markStickerAsUnused, 
      activeStamper, 
      setActiveStamper, 
      floatingPoints,
      unlockedColors,
      activeColor,
      buyColor,
      setActiveColor
    }}>
      {children}
    </RewardContext.Provider>
  );
};
