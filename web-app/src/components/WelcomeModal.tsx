import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function WelcomeModal() {
  const navigate = useNavigate();
  const { markWelcomeAsSeen } = useAuth();

  const handleSetupNow = async () => {
    await markWelcomeAsSeen();
    navigate('/config');
  };

  const handleSkip = async () => {
    await markWelcomeAsSeen();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
        <div className="bg-indigo-600 p-6 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo ao EduGenius! 🎉</h2>
          <p className="text-indigo-100">Seu assistente de estudos com Inteligência Artificial.</p>
        </div>
        
        <div className="p-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Uma etapa importante antes de começar...</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Para gerar conteúdos personalizados (como aulas e questões), o aplicativo precisa se conectar à Inteligência Artificial do Google (Gemini).
          </p>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Como este é um serviço gratuito e pessoal, <strong>cada aluno precisa usar a sua própria chave de acesso gratuita</strong> do Google. Isso garante que a plataforma continue funcionando rápido e sem limites para você!
          </p>
          
          <div className="flex flex-col gap-3 mt-8">
            <button 
              onClick={handleSetupNow}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-md"
            >
              Configurar Minha Chave Agora
            </button>
            <button 
              onClick={handleSkip}
              className="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Pular e Configurar Depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
