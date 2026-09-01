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

  // Only use includes() if the shorter string is at least 6 chars
  // (prevents short strings like "pt", "dir", "mat" from causing false positives)
  const minLen = 6;
  if (f.length >= minLen && s.includes(f)) return true;
  if (s.length >= minLen && f.includes(s)) return true;

  // Synonym groups: only full words/stems that are unambiguous
  const synonyms: string[][] = [
    ['portugues', 'linguaportuguesa'],
    ['matematica', 'raciociniologico', 'raciociniologicomatematico'],
    ['raciocinio', 'raciociniol'],
    ['direito', 'constitucional', 'administrativo', 'legislacao', 'constituicao'],
    ['tributario', 'tributaria', 'tributarista', 'sistematributario', 'impostos', 'fiscal'],
    ['informatica', 'computacao', 'tecnologia'],
    ['historia', 'geografica', 'geografia'],
    ['conhecimentosgerais', 'atualidades'],
    ['arquivologia', 'arquivistica', 'gestaoarquivos'],
    ['administracao', 'gestao', 'organizacao'],
    ['contabilidade', 'contabil', 'financas'],
    ['leorganica', 'leicararu', 'leiorganic'],
  ];

  for (const group of synonyms) {
    const inSubject = group.some(g => s.includes(g) && g.length >= minLen);
    const inFolder  = group.some(g => f.includes(g) && g.length >= minLen);
    if (inSubject && inFolder) return true;
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
