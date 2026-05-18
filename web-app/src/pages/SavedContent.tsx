import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import QuizScreen from '../components/QuizScreen';
import LessonScreen from '../components/LessonScreen';
import ScheduleRevisionModal from '../components/ScheduleRevisionModal';
import { CalendarClock, MessageSquare, Check, X } from 'lucide-react';

function CommentBadge({ item, collectionName, userId }: { item: any, collectionName: string, userId: string }) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(item.userComment || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, 'users', userId, collectionName, item.id);
      await updateDoc(ref, { userComment: comment });
      item.userComment = comment;
      setEditing(false);
    } catch (err) {
      console.error('Erro ao salvar comentário:', err);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ex: Revisão sobre verbos irregulares"
          className="flex-grow text-sm p-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setComment(item.userComment || ''); setEditing(false); }}}
        />
        <button onClick={handleSave} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setComment(item.userComment || ''); setEditing(false); }} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
      title="Adicionar/editar comentário"
    >
      <MessageSquare className="w-3 h-3" />
      {item.userComment ? (
        <span className="italic text-indigo-500 dark:text-indigo-400">{item.userComment}</span>
      ) : (
        <span>Adicionar comentário</span>
      )}
    </button>
  );
}

export default function SavedContent() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingContent, setViewingContent] = useState<any>(null);
  const [viewingType, setViewingType] = useState<'lesson' | 'quiz' | 'flashcard' | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<{item: any, type: 'lesson' | 'quiz' | 'flashcard'} | null>(null);

  useEffect(() => {
    const fetchSavedContent = async () => {
      if (!user) return;
      try {
        const lessonsRef = collection(db, 'users', user.uid, 'lessons');
        const qLessons = query(lessonsRef, orderBy('createdAt', 'desc'));
        const lessonSnap = await getDocs(qLessons);
        setLessons(lessonSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const quizzesRef = collection(db, 'users', user.uid, 'quizzes');
        const qQuizzes = query(quizzesRef, orderBy('createdAt', 'desc'));
        const quizSnap = await getDocs(qQuizzes);
        setQuizzes(quizSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const flashcardsRef = collection(db, 'users', user.uid, 'flashcards');
        const qFlashcards = query(flashcardsRef, orderBy('createdAt', 'desc'));
        const flashcardsSnap = await getDocs(qFlashcards);
        setFlashcards(flashcardsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erro ao buscar conteúdos salvos", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedContent();
  }, [user]);

  const handleBack = () => {
    setViewingContent(null);
    setViewingType(null);
  };

  if (viewingContent && viewingType) {
    if (viewingType === 'lesson') {
      const lessonSettings = {
        subject: viewingContent.subject,
        topic: viewingContent.topic,
        lessonLevel: viewingContent.lessonLevel || 'Introdutória',
      };
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow p-4">
            <LessonScreen
              settings={lessonSettings}
              onBack={handleBack}
              savedData={viewingContent.data}
            />
          </main>
        </div>
      );
    }

    if (viewingType === 'quiz') {
      const quizSettings = {
        subject: viewingContent.subject,
        topic: viewingContent.topic,
        difficulty: viewingContent.difficulty || 'Médio',
        model: 'Questões',
      };
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow p-4">
            <QuizScreen
              settings={quizSettings}
              onBack={handleBack}
              savedData={viewingContent.data}
            />
          </main>
        </div>
      );
    }

    if (viewingType === 'flashcard') {
      const flashSettings = {
        subject: viewingContent.subject,
        topic: viewingContent.topic,
        difficulty: viewingContent.difficulty || 'Médio',
        model: 'Flashcard',
      };
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow p-4">
            <QuizScreen
              settings={flashSettings}
              onBack={handleBack}
              savedData={viewingContent.data}
            />
          </main>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow p-4 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8">Meu Conteúdo Salvo</h1>
        
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Aulas Explicativas</h2>
              {lessons.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma aula salva.</p>
              ) : (
                <div className="space-y-4">
                  {lessons.map(lesson => (
                    <div 
                      key={lesson.id} 
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-blue-500 flex justify-between items-start"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(lesson); setViewingType('lesson'); }}>
                        <h3 className="font-bold">{lesson.data?.titulo || lesson.subject}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Salvo em: {lesson.createdAt?.toDate().toLocaleDateString()}</p>
                        <CommentBadge item={lesson} collectionName="lessons" userId={user!.uid} />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSchedulingItem({item: lesson, type: 'lesson'}); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Agendar Revisão"
                      >
                        <CalendarClock className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Quizzes e Questões</h2>
              {quizzes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhum quiz salva.</p>
              ) : (
                <div className="space-y-4">
                  {quizzes.map(quiz => (
                    <div 
                      key={quiz.id} 
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-green-500 flex justify-between items-start"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(quiz); setViewingType('quiz'); }}>
                        <h3 className="font-bold">{quiz.subject} - {quiz.topic}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{quiz.data?.length || 0} questões</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Salvo em: {quiz.createdAt?.toDate().toLocaleDateString()}</p>
                        <CommentBadge item={quiz} collectionName="quizzes" userId={user!.uid} />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSchedulingItem({item: quiz, type: 'quiz'}); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Agendar Revisão"
                      >
                        <CalendarClock className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-2xl font-semibold mb-4 border-b pb-2 mt-8">Flashcards</h2>
              {flashcards.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhum flashcard salvo.</p>
              ) : (
                <div className="space-y-4">
                  {flashcards.map(flash => (
                    <div 
                      key={flash.id} 
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-indigo-500 flex justify-between items-start"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(flash); setViewingType('flashcard'); }}>
                        <h3 className="font-bold">{flash.subject} - {flash.topic}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{flash.data?.length || 0} flashcards</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Salvo em: {flash.createdAt?.toDate().toLocaleDateString()}</p>
                        <CommentBadge item={flash} collectionName="flashcards" userId={user!.uid} />
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSchedulingItem({item: flash, type: 'flashcard'}); }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Agendar Revisão"
                      >
                        <CalendarClock className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {schedulingItem && (
          <ScheduleRevisionModal 
            user={user} 
            item={schedulingItem.item} 
            type={schedulingItem.type} 
            onClose={() => setSchedulingItem(null)} 
            onScheduled={() => {
              setSchedulingItem(null);
              alert("Revisão agendada com sucesso! Confira na aba Cronograma.");
            }} 
          />
        )}
      </main>
    </div>
  );
}
