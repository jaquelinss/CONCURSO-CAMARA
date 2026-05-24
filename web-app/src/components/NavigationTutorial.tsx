import { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  Database, 
  FolderHeart, 
  GraduationCap, 
  TrendingUp
} from 'lucide-react';

interface SlideData {
  title: string;
  icon: React.ReactNode;
  content: string;
  bullets: string[];
  color: string;
  badge: string;
}

export default function NavigationTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const handleOpen = () => {
      setActiveSlide(0);
      setIsOpen(true);
    };

    window.addEventListener('open-tutorial', handleOpen);
    return () => {
      window.removeEventListener('open-tutorial', handleOpen);
    };
  }, []);

  if (!isOpen) return null;

  const slides: SlideData[] = [
    {
      title: "Bem-vindo ao EduGenius! 🎓",
      badge: "Início",
      color: "from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500",
      icon: <GraduationCap className="w-16 h-16 text-white animate-bounce" />,
      content: "Parabéns por escolher o EduGenius, o seu ecossistema definitivo de estudos acelerado por Inteligência Artificial! Esta plataforma foi desenhada para automatizar o seu aprendizado através de métodos científicos ativos, ajudando você a conquistar a aprovação em concursos, vestibulares ou no ENEM de forma fluida.",
      bullets: [
        "Aulas explicativas, flashcards e simulados customizados.",
        "Assistente flutuante de professores especialistas em tempo real.",
        "Banco de questões local sem consumo de cota ou tokens.",
        "Método ativo integrado com revisões espaçadas programadas."
      ]
    },
    {
      title: "Geração de Conteúdo Inteligente ✍️",
      badge: "Dashboard",
      color: "from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500",
      icon: <Sparkles className="w-16 h-16 text-white animate-pulse" />,
      content: "Na tela principal (Gerar Conteúdo), você escolhe a matéria e o nível de dificuldade para gerar materiais de alta relevância pedagógica:",
      bullets: [
        "Aula Explicativa: Conteúdo teórico completo com marcação ativa de texto (marca-texto embutido) para fixação rápida da leitura.",
        "Quiz (Múltipla Escolha): Testes adaptativos simulando exames reais para avaliar seu entendimento em tempo real.",
        "Flashcards: Estudo com cartões de pergunta e resposta (Active Recall) para blindar sua memorização de longo prazo."
      ]
    },
    {
      title: "Salvamentos, PDFs e Pastas 📂",
      badge: "Organização",
      color: "from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500",
      icon: <FolderHeart className="w-16 h-16 text-white" />,
      content: "Mantenha toda a sua bagagem teórica perfeitamente catalogada e acessível a qualquer momento em 'Meus Salvamentos':",
      bullets: [
        "Organize em Pastas: Crie pastas personalizadas, renomeie e separe seus estudos por assunto, disciplina ou banca organizadora.",
        "Baixe em PDF: Exporte apostilas das aulas geradas pela IA ou suas listas de questões resolvidas para estudar onde e quando quiser.",
        "Revisão Automática: A partir de qualquer item salvo, você pode agendar uma revisão periódica inteligente com apenas um clique."
      ]
    },
    {
      title: "Personalizar Tópicos com IA 🎯",
      badge: "Progresso & Edital",
      color: "from-rose-600 to-pink-600 dark:from-rose-500 dark:to-pink-500",
      icon: <TrendingUp className="w-16 h-16 text-white animate-pulse" />,
      content: "Acelere seu progresso mapeando o edital da sua prova! Clique na opção ✨ Personalizar Tópicos na aba Progresso:",
      bullets: [
        "Estruture por IA: Cole o edital ou ementa da matéria e deixe a IA reordenar tudo em uma grade de tópicos de estudo lógica.",
        "Sincronização Automática: A árvore de tópicos personalizados substitui a grade padrão na aba de geração do Dashboard!",
        "Mapeamento Ativo: Acompanhe sua barra de progresso individual por matéria e marque tópicos concluídos conforme avança."
      ]
    },
    {
      title: "Cronograma e Revisão Espaçada 📅",
      badge: "Estudo Espaçado",
      color: "from-amber-600 to-orange-600 dark:from-amber-500 dark:to-orange-500",
      icon: <Calendar className="w-16 h-16 text-white" />,
      content: "Crie um roteiro diário estruturado e domine a curva do esquecimento com a nossa aba de Cronograma:",
      bullets: [
        "Gerar Plano de Estudos: Um wizard inteligente que formula o calendário semanal ideal baseado nos seus dias e horários livres.",
        "Algoritmo Espaçado: Ao terminar de revisar um assunto, avalie sua performance e a data da próxima revisão será agendada de forma matemática.",
        "Vídeo Aulas Flutuantes: Anexe links do YouTube a cada revisão programada e assista no player flutuante, arrastável e travável."
      ]
    },
    {
      title: "Banco de Questões Off-line 🗂️",
      badge: "Estudo Offline",
      color: "from-cyan-600 to-sky-600 dark:from-cyan-500 dark:to-sky-500",
      icon: <Database className="w-16 h-16 text-white" />,
      content: "Estude ativamente com 100% de economia de tokens! O Banco de Questões é a sua biblioteca local de treinamento intensivo:",
      bullets: [
        "Filtros de Performance: Separe questões respondidas, não respondidas, erros e acertos, e filtre por 4 níveis de dificuldade.",
        "Pastas Expansíveis: Barra lateral inteligente que permite navegar até o subtópico específico com facilidade.",
        "Vincular Vídeo Aula: Salve uma vídeo aula do YouTube no subtópico ativo para assistir de suporte direto na barra lateral."
      ]
    },
    {
      title: "Professores Virtuais & Post-its 👩‍🏫",
      badge: "Suporte 24h",
      color: "from-violet-600 to-purple-600 dark:from-violet-500 dark:to-purple-500",
      icon: <GraduationCap className="w-16 h-16 text-white" />,
      content: "Ganhe suporte extra flutuante para anotações rápidas e esclarecimento de dúvidas cruciais:",
      bullets: [
        "Chat com Professores IA: Clique no chapéu de formando flutuante para iniciar um chat com professores virtuais especialistas de cada disciplina.",
        "Histórico Salvo: Guarde suas discussões mais importantes para resgatar na nuvem sem precisar recomeçar o diálogo.",
        "Post-its Flutuantes: Clique no painel para abrir anotações coloridas (estilo sticky notes) que se organizam livremente pela tela."
      ]
    }
  ];

  const handleNext = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handlePrev = () => {
    if (activeSlide > 0) {
      setActiveSlide(activeSlide - 1);
    }
  };

  const current = slides[activeSlide];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 w-full max-w-2xl overflow-hidden flex flex-col justify-between max-h-[90vh] md:max-h-[85vh] animate-in zoom-in duration-300">
        
        {/* Header Slide color band */}
        <div className={`bg-gradient-to-r ${current.color} p-6 text-white flex items-center justify-between transition-all duration-500`}>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10">
              {current.badge}
            </span>
            <span className="text-xs text-white/80 font-semibold">
              Slide {activeSlide + 1} de {slides.length}
            </span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="Fechar Tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-grow p-6 md:p-8 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          
          {/* Visual Container */}
          <div className="flex justify-center py-4">
            <div className={`p-5 rounded-3xl bg-gradient-to-tr ${current.color} shadow-lg shadow-indigo-500/10 flex items-center justify-center`}>
              {current.icon}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white text-center">
              {current.title}
            </h2>
            
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 text-center md:px-4">
              {current.content}
            </p>

            {/* Checklist of actions */}
            <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-4 sm:p-5 border border-gray-150 dark:border-gray-800 space-y-3">
              {current.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                  <div className="mt-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold rounded-full w-4 h-4 text-[10px] flex items-center justify-center shrink-0">
                    ✓
                  </div>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Pular Tutorial
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx 
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-500' 
                    : 'w-2 bg-gray-200 dark:bg-gray-700'
                }`}
                title={`Ir para Slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {activeSlide > 0 && (
              <button
                onClick={handlePrev}
                className="p-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Slide Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {activeSlide === slides.length - 1 ? (
                <>Concluir ✓</>
              ) : (
                <>Avançar <ChevronRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
