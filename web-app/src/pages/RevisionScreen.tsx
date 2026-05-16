import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle, PlusCircle, Brain } from 'lucide-react';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LessonScreen from '../components/LessonScreen';
import QuizScreen from '../components/QuizScreen';

export default function RevisionScreen() {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContent, setActiveContent] = useState<any>(null);
  const [activeType, setActiveType] = useState<'lesson' | 'quiz' | 'flashcard' | null>(null);

  useEffect(() => {
    const fetchRevisions = async () => {
      if (!user) return;
      try {
        const revRef = collection(db, 'users', user.uid, 'revisions');
        const q = query(revRef, orderBy('scheduledDate', 'asc'));
        const snap = await getDocs(q);
        setRevisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erro ao buscar revisões:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRevisions();
  }, [user]);

  const handleStartRevision = async (rev: any, type: 'lesson' | 'quiz' | 'flashcard') => {
    const contentId = rev.contentLinks[`${type}Id`];
    if (!contentId || !user) {
      // Se não existe, vamos simular a ida para a criação com os dados do tópico
      alert(`Conteúdo de ${type} não encontrado. Você será levado para a tela de geração com este tópico pré-selecionado.`);
      return;
    }

    try {
      const contentRef = doc(db, 'users', user.uid, `${type}s`, contentId);
      const contentSnap = await getDoc(contentRef);
      if (contentSnap.exists()) {
        setActiveContent({ ...contentSnap.data(), id: contentSnap.id });
        setActiveType(type);
      } else {
        alert("Conteúdo original não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
    }
  };

  const renderContent = () => {
    if (activeType === 'lesson') {
      return <LessonScreen settings={activeContent} onBack={() => setActiveType(null)} savedData={activeContent.data} />;
    }
    if (activeType === 'quiz' || activeType === 'flashcard') {
      return <QuizScreen settings={activeContent} onBack={() => setActiveType(null)} savedData={activeContent.data} />;
    }
    return null;
  };

  if (activeType) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-grow p-4">{renderContent()}</main>
      </div>
    );
  }

  const today = startOfDay(new Date());

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
            <Calendar className="text-indigo-600 w-10 h-10" />
            Cronograma de Revisão
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Gerencie seu ciclo de aprendizagem e vença a curva do esquecimento.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Nenhuma revisão agendada</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Vá em "Meus Salvamentos" e escolha um conteúdo para iniciar seu ciclo de revisão.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Urgentes / Hoje
              </h2>
              <div className="space-y-4">
                {revisions
                  .filter(r => r.status === 'pending' && (isBefore(r.scheduledDate.toDate(), today) || isToday(r.scheduledDate.toDate())))
                  .map(rev => (
                    <RevisionCard key={rev.id} revision={rev} onAction={handleStartRevision} />
                  ))}
                {revisions.filter(r => r.status === 'pending' && (isBefore(r.scheduledDate.toDate(), today) || isToday(r.scheduledDate.toDate()))).length === 0 && (
                  <p className="text-gray-400 italic bg-gray-100 p-4 rounded-xl text-center">Tudo em dia por aqui! ✨</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-600">
                <Clock className="w-5 h-5" />
                Próximas Revisões
              </h2>
              <div className="space-y-4">
                {revisions
                  .filter(r => r.status === 'pending' && !isBefore(r.scheduledDate.toDate(), today) && !isToday(r.scheduledDate.toDate()))
                  .map(rev => (
                    <RevisionCard key={rev.id} revision={rev} onAction={handleStartRevision} />
                  ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function RevisionCard({ revision, onAction }: { revision: any, onAction: any }) {
  const date = revision.scheduledDate.toDate();
  const isOverdue = isBefore(date, startOfDay(new Date()));
  const isTodayDate = isToday(date);

  return (
    <div className={`p-6 rounded-2xl shadow-sm border-2 transition-all hover:shadow-md bg-white ${isOverdue ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isOverdue ? 'bg-red-100 text-red-700' : isTodayDate ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {isOverdue ? 'Atrasado' : isTodayDate ? 'Hoje' : format(date, "d 'de' MMMM", { locale: ptBR })}
          </span>
          <h3 className="text-xl font-bold text-gray-900 mt-2">{revision.subject}</h3>
          <p className="text-gray-600">{revision.topic}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6">
        <ActionButton 
          icon={<BookOpen className="w-4 h-4" />} 
          label="Aula" 
          active={!!revision.contentLinks.lessonId} 
          onClick={() => onAction(revision, 'lesson')}
        />
        <ActionButton 
          icon={<CheckCircle className="w-4 h-4" />} 
          label="Quiz" 
          active={!!revision.contentLinks.quizId} 
          onClick={() => onAction(revision, 'quiz')}
        />
        <ActionButton 
          icon={<Brain className="w-4 h-4" />} 
          label="Cards" 
          active={!!revision.contentLinks.flashcardId} 
          onClick={() => onAction(revision, 'flashcard')}
        />
      </div>
    </div>
  );
}

function ActionButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: any }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
        active 
          ? 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-300' 
          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
      }`}
    >
      {active ? icon : <PlusCircle className="w-4 h-4" />}
      <span className="text-xs font-bold">{active ? label : 'Gerar'}</span>
    </button>
  );
}
