import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { generateContentFromGemini } from '../lib/gemini';
import { findMatchingFolder } from '../lib/folderUtils';
import { Sparkles, Loader2, X } from 'lucide-react';

interface InlineContentGeneratorProps {
  subject: string;
  topic: string;
  apiKey: string | null;
  user: any;
  planId: string | null;
  plan: any;
  originalDate: string;
  blockIndex: number;
  selectedBanca: string | null;
  itemType: 'block' | 'revision';
  itemId?: string;
  block: any;
}

export default function InlineContentGenerator({
  subject, topic, apiKey, user, planId, plan: _plan,
  originalDate, blockIndex, selectedBanca,
  itemType, itemId, block,
}: InlineContentGeneratorProps) {
  const [mode, setMode] = useState<'idle' | 'options' | 'generating' | 'done'>('idle');
  const [showCustom, setShowCustom] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [lessonLevel, setLessonLevel] = useState('Intermediário');
  const [quizModel, setQuizModel] = useState(selectedBanca || 'IBAM');
  const [quizDifficulty, setQuizDifficulty] = useState('Médio');
  const [quizQuantity, setQuizQuantity] = useState(15);
  const [flashcardQuantity, setFlashcardQuantity] = useState(15);

  const existingLessons: string[] = itemType === 'revision'
    ? (block.contentLinks?.lessonIds || [])
    : (block.linkedLessonIds || []);
  const existingQuizzes: string[] = itemType === 'revision'
    ? (block.contentLinks?.quizIds || [])
    : (block.linkedQuizIds || []);
  const existingFlashcards: string[] = itemType === 'revision'
    ? (block.contentLinks?.flashcardIds || [])
    : (block.linkedFlashcardIds || []);
  const hasContent = existingLessons.length > 0 || existingQuizzes.length > 0 || existingFlashcards.length > 0;
  const navigate = useNavigate();

  const handleOpenContent = async (contentId: string, type: 'lesson' | 'quiz' | 'flashcard') => {
    if (!user) return;
    try {
      const collectionName = type === 'lesson' ? 'lessons' : type === 'quiz' ? 'quizzes' : 'flashcards';
      const contentRef = doc(db, 'users', user.uid, collectionName, contentId);
      const snap = await getDoc(contentRef);
      if (!snap.exists()) {
        const shouldUnlink = window.confirm('Este conteúdo foi excluído. Deseja remover o vínculo?');
        if (shouldUnlink) {
          await handleUnlinkContent(contentId, type);
        }
        return;
      }
      const data = { id: snap.id, ...snap.data() };
      navigate('/saved', { state: { autoOpen: data, autoOpenType: type } });
    } catch (err) {
      console.error('Erro ao abrir conteúdo:', err);
    }
  };

  const handleUnlinkContent = async (contentId: string, type: 'lesson' | 'quiz' | 'flashcard') => {
    if (!user) return;
    try {
      if (itemType === 'revision' && itemId) {
        const revRef = doc(db, 'users', user.uid, 'revisions', itemId);
        const revSnap = await getDoc(revRef);
        if (revSnap.exists()) {
          const links = revSnap.data().contentLinks || {};
          const key = type === 'lesson' ? 'lessonIds' : type === 'quiz' ? 'quizIds' : 'flashcardIds';
          const updated = (links[key] || []).filter((id: string) => id !== contentId);
          await setDoc(revRef, { contentLinks: { ...links, [key]: updated } }, { merge: true });
        }
      } else if (planId) {
        const planRef = doc(db, 'users', user.uid, 'studyPlans', planId);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const planData = planSnap.data();
          const newSchedule = [...planData.schedule];
          const dayIndex = newSchedule.findIndex((d: any) => d.date === originalDate);
          if (dayIndex !== -1 && newSchedule[dayIndex].blocks[blockIndex]) {
            const b = newSchedule[dayIndex].blocks[blockIndex];
            const key = type === 'lesson' ? 'linkedLessonIds' : type === 'quiz' ? 'linkedQuizIds' : 'linkedFlashcardIds';
            b[key] = (b[key] || []).filter((id: string) => id !== contentId);
            await updateDoc(planRef, { schedule: newSchedule });
          }
        }
      }
      window.dispatchEvent(new Event('study-plan-updated'));
    } catch (err) {
      console.error('Erro ao desvincular conteúdo:', err);
    }
  };

  const handleGenerate = async () => {
    if (!user || !apiKey) return;
    setMode('generating');
    setError('');
    const newLessonIds = [...existingLessons];
    const newQuizIds = [...existingQuizzes];
    const newFlashcardIds = [...existingFlashcards];

    try {
      const matchedFolderId = await findMatchingFolder(db, user.uid, subject);

      // 1. Generate Lesson
      setProgress(1);
      setProgressLabel('Gerando aula...');
      const lr = await generateContentFromGemini(
        { subject, topic, specificTopic: topic, model: 'Aula Explicativa', lessonLevel },
        apiKey
      );
      let lessonData = lr, lessonSubject = subject, lessonTopic = topic;
      if (lr.materia_identificada) {
        lessonSubject = lr.materia_identificada;
        lessonTopic = lr.topico_identificado || topic;
        lessonData = lr.conteudo;
      }
      const lDoc = await addDoc(collection(db, 'users', user.uid, 'lessons'), {
        subject: lessonSubject,
        topic: lessonTopic,
        lessonLevel,
        data: lessonData,
        userComment: '',
        folderId: matchedFolderId || null,
        createdAt: serverTimestamp(),
      });
      newLessonIds.push(lDoc.id);

      // 2. Generate Quiz
      setProgress(2);
      setProgressLabel('Gerando questões...');
      const qr = await generateContentFromGemini(
        { subject, topic, specificTopic: topic, model: quizModel, difficulty: quizDifficulty, quantity: quizQuantity, banca: quizModel },
        apiKey
      );
      let quizData = qr, quizSubject = subject, quizTopic = topic;
      if (qr.materia_identificada) {
        quizSubject = qr.materia_identificada;
        quizTopic = qr.topico_identificado || topic;
      }
      if (qr.conteudo) quizData = qr.conteudo;
      const qDoc = await addDoc(collection(db, 'users', user.uid, 'quizzes'), {
        subject: quizSubject,
        topic: quizTopic,
        difficulty: quizDifficulty,
        model: quizModel,
        data: quizData,
        userComment: '',
        folderId: matchedFolderId || null,
        createdAt: serverTimestamp(),
      });
      newQuizIds.push(qDoc.id);

      // 3. Generate Flashcards
      setProgress(3);
      setProgressLabel('Gerando flashcards...');
      const fr = await generateContentFromGemini(
        { subject, topic, specificTopic: topic, model: 'Flashcard', quantity: flashcardQuantity },
        apiKey
      );
      let flashData = fr, flashSubject = subject, flashTopic = topic;
      if (fr.materia_identificada) {
        flashSubject = fr.materia_identificada;
        flashTopic = fr.topico_identificado || topic;
      }
      if (fr.conteudo) flashData = fr.conteudo;
      const fDoc = await addDoc(collection(db, 'users', user.uid, 'flashcards'), {
        subject: flashSubject,
        topic: flashTopic,
        difficulty: 'Médio',
        model: 'Flashcard',
        data: flashData,
        userComment: '',
        folderId: matchedFolderId || null,
        createdAt: serverTimestamp(),
      });
      newFlashcardIds.push(fDoc.id);

      // 4. Link to block or revision
      if (itemType === 'revision' && itemId) {
        const revRef = doc(db, 'users', user.uid, 'revisions', itemId);
        await setDoc(revRef, {
          contentLinks: {
            lessonIds: newLessonIds,
            quizIds: newQuizIds,
            flashcardIds: newFlashcardIds,
          },
        }, { merge: true });
      } else if (planId) {
        const planRef = doc(db, 'users', user.uid, 'studyPlans', planId);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const planData = planSnap.data();
          const newSchedule = [...planData.schedule];
          const dayIndex = newSchedule.findIndex((d: any) => d.date === originalDate);
          if (dayIndex !== -1 && newSchedule[dayIndex].blocks[blockIndex]) {
            newSchedule[dayIndex].blocks[blockIndex] = {
              ...newSchedule[dayIndex].blocks[blockIndex],
              linkedLessonIds: newLessonIds,
              linkedQuizIds: newQuizIds,
              linkedFlashcardIds: newFlashcardIds,
            };
            await updateDoc(planRef, { schedule: newSchedule });
          }
        }
      }

      setMode('done');
      window.dispatchEvent(new Event('study-plan-updated'));
    } catch (err: any) {
      setError('Erro: ' + (err.message || 'Falha na geração'));
      setMode('options');
    }
  };

  // === RENDER: Content already linked (badges) ===
  if (mode === 'done' || (mode === 'idle' && hasContent)) {
    const ContentBadge = ({ ids, type, emoji, label, colorClasses }: { ids: string[]; type: 'lesson' | 'quiz' | 'flashcard'; emoji: string; label: string; colorClasses: string }) => {
      if (ids.length === 0) return null;
      if (ids.length === 1) {
        return (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleOpenContent(ids[0], type)}
              className={`text-[10px] px-1.5 py-0.5 ${colorClasses} rounded font-bold hover:opacity-80 transition-colors cursor-pointer`}
              title={`Abrir ${label}`}
            >
              {emoji} 1 {label}
            </button>
            <button
              onClick={async (e) => { e.stopPropagation(); if (window.confirm(`Desvincular este ${label}?`)) { await handleUnlinkContent(ids[0], type); } }}
              className="text-[10px] text-gray-400 hover:text-red-500 transition-colors px-0.5"
              title="Desvincular"
            >
              ✕
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-0.5">
          <span className={`text-[10px] font-bold ${colorClasses.replace(/bg-\S+/g, '').trim()} px-1`}>{emoji} {ids.length} {label}{ids.length > 1 ? (type === 'quiz' ? 'zes' : 's') : ''}</span>
          {ids.map((id, idx) => (
            <div key={id} className="flex items-center gap-0.5 ml-2">
              <button
                onClick={() => handleOpenContent(id, type)}
                className={`text-[9px] px-1.5 py-0.5 ${colorClasses} rounded font-semibold hover:opacity-80 transition-colors cursor-pointer truncate max-w-[180px]`}
                title={`Abrir ${label} ${idx + 1}`}
              >
                #{idx + 1}
              </button>
              <button
                onClick={async (e) => { e.stopPropagation(); if (window.confirm(`Desvincular ${label} #${idx + 1}?`)) { await handleUnlinkContent(id, type); } }}
                className="text-[9px] text-gray-400 hover:text-red-500 transition-colors px-0.5"
                title="Desvincular"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="mt-1.5 flex flex-wrap items-start gap-1.5">
        <ContentBadge ids={existingLessons} type="lesson" emoji="📘" label="Aula" colorClasses="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
        <ContentBadge ids={existingQuizzes} type="quiz" emoji="📝" label="Quiz" colorClasses="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
        <ContentBadge ids={existingFlashcards} type="flashcard" emoji="🧠" label="Flashcard" colorClasses="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
        <button
          onClick={() => { setMode('options'); setShowCustom(false); }}
          className="text-[10px] px-1.5 py-0.5 text-gray-400 hover:text-indigo-500 font-bold bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-200 dark:border-gray-700 transition-colors"
        >
          + Mais
        </button>
      </div>
    );
  }

  // === RENDER: Generating (progress bar) ===
  if (mode === 'generating') {
    return (
      <div className="mt-1.5 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            {progressLabel} ({progress}/3)
          </span>
        </div>
        <div className="mt-1.5 h-1 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(progress / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // === RENDER: Options panel (auto or custom) ===
  if (mode === 'options') {
    return (
      <div className="mt-1.5 p-2 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 animate-in fade-in">
        {error && (
          <p className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/30 p-1.5 rounded">{error}</p>
        )}
        {!showCustom ? (
          <>
            <div className="flex gap-1.5">
              <button
                onClick={handleGenerate}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Gerar Automático
              </button>
              <button
                onClick={() => setShowCustom(true)}
                className="px-2 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ⚙️
              </button>
              <button
                onClick={() => setMode('idle')}
                className="px-1.5 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">
              📘 Aula intermediária + 📝 15 questões {quizModel} + 🧠 15 flashcards
            </p>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              {/* Lesson Level */}
              <div>
                <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nível da Aula
                </label>
                <div className="flex gap-1 mt-0.5">
                  {['Básico', 'Intermediário', 'Avançado'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLessonLevel(l)}
                      className={`flex-1 px-1 py-1 text-[9px] rounded font-bold transition-colors ${
                        lessonLevel === l
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiz Settings */}
              <div>
                <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Questões
                </label>
                <div className="flex gap-1 mt-0.5">
                  <select
                    value={quizModel}
                    onChange={(e) => setQuizModel(e.target.value)}
                    className="flex-1 text-[9px] p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    {['IBAM', 'CESPE', 'FGV', 'CESGRANRIO', 'Enem'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <select
                    value={quizDifficulty}
                    onChange={(e) => setQuizDifficulty(e.target.value)}
                    className="text-[9px] p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    {['Fácil', 'Médio', 'Difícil'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={String(quizQuantity)}
                    onChange={(e) => setQuizQuantity(Number(e.target.value))}
                    className="text-[9px] p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 w-12"
                  >
                    {[5, 10, 15, 20, 25, 30].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Flashcard Settings */}
              <div>
                <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Flashcards
                </label>
                <select
                  value={String(flashcardQuantity)}
                  onChange={(e) => setFlashcardQuantity(Number(e.target.value))}
                  className="text-[9px] p-1 mt-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 w-12"
                >
                  {[5, 10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-1.5 mt-1">
              <button
                onClick={handleGenerate}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Gerar
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-2 py-1.5 text-gray-400 dark:text-gray-300 text-[10px] font-bold hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setMode('idle')}
                className="px-1.5 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // === RENDER: Idle, no content — show generate button ===
  return (
    <button
      onClick={() => { setMode('options'); setShowCustom(false); }}
      className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 font-bold w-fit bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-dashed border-gray-200 dark:border-gray-700 transition-colors"
    >
      <Sparkles className="w-3 h-3" /> Gerar Conteúdo
    </button>
  );
}


