
import { X, BookOpen, Brain, Sparkles, Crosshair, Target, CheckSquare, PencilLine, History } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  if (!isOpen) return null;

  const sections = [
    {
      title: "Gerar Conteúdo",
      icon: <Brain className="w-5 h-5 text-indigo-500" />,
      content: "Aqui você cria seus materiais de estudo. A IA analisa o tema que você pediu e gera Aulas Explicativas, Mapas Mentais ou Flashcards detalhados."
    },
    {
      title: "Meus Salvamentos",
      icon: <CheckSquare className="w-5 h-5 text-green-500" />,
      content: "Todo o conteúdo gerado que você salva fica armazenado aqui. Você pode revisar, ler novamente as aulas, ou treinar com os flashcards gerados anteriormente."
    },
    {
      title: "Cronograma e Progresso",
      icon: <History className="w-5 h-5 text-orange-500" />,
      content: "Ferramentas para acompanhar sua evolução. O cronograma mostra o que você estudou em cada dia, e o Progresso exibe gráficos do seu rendimento e frequência."
    },
    {
      title: "Dúvidas com IA",
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      content: "O ícone flutuante no canto inferior direito abre um chat com professores virtuais de diferentes matérias. Você pode fazer perguntas em tempo real e até clicar em 'Criar Post-it' nas respostas para transformá-las em resumos na tela."
    },
    {
      title: "Post-its (Resumos Visuais)",
      icon: <PencilLine className="w-5 h-5 text-yellow-500" />,
      content: "Você pode selecionar qualquer texto na tela e clicar em 'Criar Post-it' para que a IA resuma a informação. Além disso, você pode criar manualmente usando o atalho de fixar. Os post-its possuem atalhos de digitação: digite '- ' (hífen + espaço) para criar tópicos, e '->' para fazer setas."
    },
    {
      title: "Laser de Leitura",
      icon: <Crosshair className="w-5 h-5 text-red-500" />,
      content: "Um guia de leitura que segue o mouse para te ajudar a manter o foco em textos longos. Você pode ativá-lo pelo ícone flutuante e arrastar o menu para onde preferir."
    },
    {
      title: "Simulados e Questões",
      icon: <Target className="w-5 h-5 text-blue-500" />,
      content: "Você pode gerar quizzes e simulados na aba Gerar Conteúdo para testar seus conhecimentos e fixar a matéria."
    }
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative border border-gray-200 dark:border-gray-800 animate-slide-up">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800 dark:text-gray-100">
            <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Manual do App
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-grow">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            Bem-vindo ao manual completo de funcionalidades. Aqui você encontra tudo o que o aplicativo tem a oferecer para acelerar o seu estudo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                    {section.icon}
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">{section.title}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
