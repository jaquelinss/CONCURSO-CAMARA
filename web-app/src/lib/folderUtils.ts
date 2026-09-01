import { collection, getDocs } from 'firebase/firestore';

export function normalizeStr(str: string) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSubjectMatchingFolder(subject: string, folderName: string) {
  if (!subject || !folderName) return false;
  const s = normalizeStr(subject);
  const f = normalizeStr(folderName);
  
  if (s === f) return true;
  if (s.includes(f) || f.includes(s)) return true;
  
  const synonyms = [
    ['portugues', 'linguaportuguesa', 'pt'],
    ['matematica', 'raciociniologico', 'rlm', 'mat', 'raciocinio'],
    ['direito', 'dir', 'legislacao', 'lei', 'constituicao', 'constitucional', 'administrativo'],
    ['informatica', 'info', 'computacao'],
    ['conhecimentosgerais', 'atualidades', 'historia', 'geografia']
  ];
  
  for (const group of synonyms) {
    if (group.some(g => s.includes(g)) && group.some(g => f.includes(g))) {
      return true;
    }
  }
  return false;
}

export async function findMatchingFolder(db: any, uid: string, subject: string): Promise<string | null> {
  try {
    const foldersRef = collection(db, 'users', uid, 'folders');
    const snap = await getDocs(foldersRef);
    for (const d of snap.docs) {
      if (isSubjectMatchingFolder(subject, d.data().name)) {
        return d.id;
      }
    }
  } catch (e) {
    console.error('Error finding matching folder:', e);
  }
  return null;
}
