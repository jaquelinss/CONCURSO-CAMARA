import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ConfigScreen() {
  const { apiKey, saveApiKey } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey);
    }
  }, [apiKey]);

  const handleSave = async () => {
    if (!inputValue.trim()) {
      alert("Por favor, insira uma chave válida.");
      return;
    }
    setSaving(true);
    try {
      await saveApiKey(inputValue.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert("Erro ao salvar a chave.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navigation />
      <main className="flex-grow p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Configurações</h1>
        
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Chave da API do Google (Gemini)</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Para gerar as aulas explicativas, quizzes e flashcards, o EduGenius utiliza a inteligência artificial do Google (Gemini).
            Para garantir que o serviço seja gratuito e rápido para você, é necessário configurar a sua própria chave de acesso.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
            <h3 className="font-bold text-blue-800 mb-2">Como obter sua chave gratuitamente:</h3>
            <ol className="list-decimal list-inside text-blue-900 space-y-2">
              <li>Acesse o <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-blue-600">Google AI Studio</a> e faça login com sua conta Google.</li>
              <li>Clique no botão azul <strong>"Create API key"</strong>.</li>
              <li>Copie a chave gerada (geralmente começa com <code>AIza...</code>).</li>
              <li>Cole a chave no campo abaixo e clique em Salvar.</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Sua Chave API (AIza...)</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Cole sua chave aqui..."
                className="w-full p-4 rounded-lg bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleSave} 
                disabled={saving || saved}
                className={`px-8 py-3 text-white rounded-lg font-bold shadow-md transform hover:scale-105 transition-all ${saved ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {saving ? 'Salvando...' : (saved ? 'Salvo com sucesso!' : 'Salvar Chave')}
              </button>
              {saved && (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  Voltar para os Estudos
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
