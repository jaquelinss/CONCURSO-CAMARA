import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import QuizScreen from '../components/QuizScreen';
import LessonScreen from '../components/LessonScreen';
import ScheduleRevisionModal from '../components/ScheduleRevisionModal';
import { CalendarClock } from 'lucide-react';

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
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:bg-gray-900 transition border-l-4 border-blue-500 flex justify-between items-center"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(lesson); setViewingType('lesson'); }}>
                        <h3 className="font-bold">{lesson.data?.titulo || lesson.subject}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Salvo em: {lesson.createdAt?.toDate().toLocaleDateString()}</p>
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
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:bg-gray-900 transition border-l-4 border-green-500 flex justify-between items-center"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(quiz); setViewingType('quiz'); }}>
                        <h3 className="font-bold">{quiz.subject} - {quiz.topic}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{quiz.data?.length || 0} questões</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Salvo em: {quiz.createdAt?.toDate().toLocaleDateString()}</p>
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
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:bg-gray-900 transition border-l-4 border-indigo-500 flex justify-between items-center"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(flash); setViewingType('flashcard'); }}>
                        <h3 className="font-bold">{flash.subject} - {flash.topic}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{flash.data?.length || 0} flashcards</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Salvo em: {flash.createdAt?.toDate().toLocaleDateString()}</p>
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
