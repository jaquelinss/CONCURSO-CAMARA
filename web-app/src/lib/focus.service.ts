import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

export interface FocusSession {
  id?: string;
  userId: string;
  subject: string;
  topic?: string;
  durationSeconds: number;
  date: string; // YYYY-MM-DD (local timezone)
  createdAt: any;
}

export async function saveFocusSession(userId: string, data: { subject: string; topic?: string; durationSeconds: number; date: string }) {
  try {
    const sessionsRef = collection(db, `users/${userId}/focusSessions`);
    const newSession: Omit<FocusSession, 'id'> = {
      userId,
      subject: data.subject,
      topic: data.topic,
      durationSeconds: data.durationSeconds,
      date: data.date,
      createdAt: Timestamp.now()
    };
    
    await addDoc(sessionsRef, newSession);
    return true;
  } catch (error) {
    console.error("Erro ao salvar sessão de foco:", error);
    return false;
  }
}

export async function getFocusSessions(userId: string, startDate?: string, endDate?: string): Promise<FocusSession[]> {
  try {
    const sessionsRef = collection(db, `users/${userId}/focusSessions`);
    let q = query(sessionsRef, orderBy('createdAt', 'desc'));
    
    if (startDate) {
      q = query(q, where('date', '>=', startDate));
    }
    if (endDate) {
      q = query(q, where('date', '<=', endDate));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FocusSession[];
  } catch (error) {
    console.error("Erro ao buscar sessões de foco:", error);
    return [];
  }
}
