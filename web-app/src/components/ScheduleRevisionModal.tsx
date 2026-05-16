import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getRevisionSuggestions } from '../lib/revision.service';
import { Calendar, Brain, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduleRevisionModalProps {
  user: any;
  item: any;
  type: 'lesson' | 'quiz' | 'flashcard';
  onClose: () => void;
  onScheduled: () => void;
}

export default function ScheduleRevisionModal({ user, item, type, onClose, onScheduled }: ScheduleRevisionModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(getRevisionSuggestions(item.performance || 100)[0].date, 'yyyy-MM-dd')
  );
  const [suggestion] = useState(getRevisionSuggestions(item.performance || 100)[0]);

  const handleSchedule = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Usamos uma chave composta por subject e topic para agrupar conteúdos relacionados
      const revisionId = `${item.subject}_${item.topic}`.replace(/[^a-zA-Z0-9]/g, '_');
      const revisionRef = doc(db, 'users', user.uid, 'revisions', revisionId);
      
      const contentLinks: any = {};
      if (type === 'lesson') contentLinks.lessonId = item.id;
      if (type === 'quiz') contentLinks.quizId = item.id;
      if (type === 'flashcard') contentLinks.flashcardId = item.id;

      await setDoc(revisionRef, {
        subject: item.subject,
        topic: item.topic,
        scheduledDate: Timestamp.fromDate(new Date(selectedDate + 'T12:00:00')),
        status: 'pending',
        performance: item.performance || null,
        contentLinks,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      onScheduled();
    } catch (error) {
      console.error("Erro ao agendar revisão:", error);
      alert("Erro ao agendar revisão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-indigo-600" />
            Agendar Revisão
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-sm text-indigo-700 font-medium mb-1">Assunto selecionado:</p>
            <p className="text-lg font-bold text-indigo-900">{item.subject}</p>
            <p className="text-sm text-indigo-600">{item.topic}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Escolha a data:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors"
            />
          </div>

          <button 
            onClick={() => setSelectedDate(format(suggestion.date, 'yyyy-MM-dd'))}
            className="w-full p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-200 rounded-xl text-left hover:border-indigo-400 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Brain className="text-indigo-500 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Sugestão da IA</p>
                <p className="text-sm text-gray-700">{suggestion.label}</p>
                <p className="text-sm font-bold text-indigo-900">
                  {format(suggestion.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          </button>

          <button 
            onClick={handleSchedule}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
          >
            {loading ? "Agendando..." : (
              <>
                <Check className="w-5 h-5" />
                Confirmar Agendamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
