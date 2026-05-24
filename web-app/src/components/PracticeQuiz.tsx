import { useState } from 'react';

interface PracticeQuizProps {
  questions: any[];
  theme: any;
  onClose: () => void;
  quizTitle?: string;
}

export default function PracticeQuiz({ questions, theme, onClose, quizTitle = "Quiz de Treino" }: PracticeQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const correct = option === currentQuestion.correta;
    setIsCorrect(correct);
    if (correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setShowResults(false);
  };

  if (showResults) {
    return (
      <div className="w-full text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6 text-gray-900 dark:text-gray-100">
        <h3 className="text-2xl font-bold mb-4">{quizTitle} - Finalizado!</h3>
        <p className="text-xl mb-6">Sua pontuação: <span className={`font-bold ${theme.accent}`}>{score}</span> de {questions.length}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={handleRestart} className={`py-2 px-5 font-bold rounded-lg ${theme.button}`}>
            Tentar Novamente
          </button>
          <button onClick={onClose} className={`py-2 px-5 font-bold rounded-lg bg-gray-500 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 text-white`}>
            Fechar Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6 text-gray-900 dark:text-gray-100">
      <h3 className="text-2xl font-bold mb-4 text-center">{quizTitle}</h3>
      <p className="text-sm font-semibold mb-2 opacity-70">Questão {currentIndex + 1} de {questions.length}</p>
      <p className="text-lg font-semibold my-4">{currentQuestion.pergunta}</p>
      <div className="space-y-3">
        {currentQuestion.opcoes.map((option: string, index: number) => {
          const isSelected = selectedAnswer === option;
          const isCorrectOption = currentQuestion.correta === option;
          let buttonClass = theme.option;

          if (isSelected) {
            buttonClass = isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
          } else if (selectedAnswer !== null && isCorrectOption) {
            buttonClass = 'bg-green-500 text-white';
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={selectedAnswer !== null}
              className={`w-full text-left p-3 rounded-lg transition-all duration-300 border-2 ${theme.border} ${buttonClass} disabled:cursor-not-allowed`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {selectedAnswer && (
        <div className="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-800 dark:text-gray-200">{currentQuestion.explicacao}</p>
          <button onClick={handleNext} className={`w-full mt-4 py-2 font-bold rounded-lg text-white ${theme.button}`}>
            {currentIndex < questions.length - 1 ? 'Próxima' : 'Ver Resultados'}
          </button>
        </div>
      )}
    </div>
  );
}
