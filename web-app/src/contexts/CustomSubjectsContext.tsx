import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getSubjectsByMode } from '../lib/constants';

interface CustomSubject {
  id: string; // The subject name
  mode: string;
}

interface CustomSubjectsContextType {
  customSubjects: CustomSubject[];
  getAllSubjectsByMode: (mode: 'Geral' | 'ENEM' | 'Concurso') => string[];
}

const CustomSubjectsContext = createContext<CustomSubjectsContextType>({
  customSubjects: [],
  getAllSubjectsByMode: () => [],
});

export const useCustomSubjects = () => useContext(CustomSubjectsContext);

export const CustomSubjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);

  useEffect(() => {
    if (!user) {
      setCustomSubjects([]);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'studyProgress'));
    
    // We use onSnapshot to get real-time updates when a user creates a new subject in the StudyProgressScreen
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjects: CustomSubject[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.subject && data.mode) {
          subjects.push({
            id: data.subject,
            mode: data.mode
          });
        }
      });
      setCustomSubjects(subjects);
    }, (error) => {
      console.error("Erro ao escutar matérias personalizadas:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const getAllSubjectsByMode = (mode: 'Geral' | 'ENEM' | 'Concurso'): string[] => {
    const staticSubjects = getSubjectsByMode(mode);
    const userCustomSubjectsForMode = customSubjects
      .filter(s => s.mode === mode)
      .map(s => s.id)
      .filter(id => !staticSubjects.includes(id)); // avoid duplicates if any

    return [...staticSubjects, ...userCustomSubjectsForMode].sort();
  };

  return (
    <CustomSubjectsContext.Provider value={{ customSubjects, getAllSubjectsByMode }}>
      {children}
    </CustomSubjectsContext.Provider>
  );
};
