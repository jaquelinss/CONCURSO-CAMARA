import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { type KnowledgeMaterial } from '../components/KnowledgeBaseManager';

interface KnowledgeBaseContextType {
  materials: KnowledgeMaterial[];
  activeMaterialIds: Set<string>;
  toggleMaterialActive: (id: string) => void;
  setMaterials: (mats: KnowledgeMaterial[]) => void;
  getContextText: () => Promise<string>;
  isDownloadingContext: boolean;
  showManager: boolean;
  setShowManager: (show: boolean) => void;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export function KnowledgeBaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<KnowledgeMaterial[]>([]);
  const [activeMaterialIds, setActiveMaterialIds] = useState<Set<string>>(new Set());
  const [isDownloadingContext, setIsDownloadingContext] = useState(false);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    if (user) {
      loadMaterials();
    } else {
      setMaterials([]);
      setActiveMaterialIds(new Set());
    }
  }, [user]);

  const loadMaterials = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'user_materials'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const loaded: KnowledgeMaterial[] = [];
      snapshot.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() } as KnowledgeMaterial);
      });
      loaded.sort((a, b) => b.createdAt - a.createdAt);
      setMaterials(loaded);
    } catch (error) {
      console.error("Error loading global materials:", error);
    }
  };

  const toggleMaterialActive = (id: string) => {
    setActiveMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getContextText = async (): Promise<string> => {
    if (activeMaterialIds.size === 0) return '';
    setIsDownloadingContext(true);
    let contextData = '';
    try {
      const activeMats = materials.filter(m => activeMaterialIds.has(m.id));
      for (const mat of activeMats) {
        const url = await getDownloadURL(ref(storage, mat.storagePath));
        const response = await fetch(url);
        const text = await response.text();
        contextData += `\n--- INÍCIO DO MATERIAL: ${mat.title} ---\n${text}\n--- FIM DO MATERIAL ---\n\n`;
      }
    } catch (err) {
      console.error("Failed to load context text", err);
    } finally {
      setIsDownloadingContext(false);
    }
    return contextData;
  };

  return (
    <KnowledgeBaseContext.Provider value={{
      materials,
      activeMaterialIds,
      toggleMaterialActive,
      setMaterials,
      getContextText,
      isDownloadingContext,
      showManager,
      setShowManager
    }}>
      {children}
    </KnowledgeBaseContext.Provider>
  );
}

export const useKnowledgeBase = () => {
  const context = useContext(KnowledgeBaseContext);
  if (context === undefined) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};
