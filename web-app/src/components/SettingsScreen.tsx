import React, { useMemo } from 'react';
import { getSubjectsByMode, getModelsByMode, themes, defaultTheme, difficulties, lessonLevels, topicsBySubject } from '../lib/constants';

interface SettingsProps {
  settings: any;
  setSettings: (s: any) => void;
  onStart: () => void;
}

const CustomSelect = ({ label, value, onChange, options, theme, disabled = false }: any) => (
  <div className="w-full">
    <label className={`block text-sm font-medium mb-1 ${theme.text} ${disabled ? 'opacity-50' : ''}`}>{label}</label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full p-3 rounded-lg bg-white dark:bg-gray-800 ${theme.text} ${theme.border} border-2 focus:outline-none focus:ring-2 ${theme.ring} transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {options.map((opt: string) => <option key={opt} value={opt} className="text-black dark:text-white">{opt}</option>)}
    </select>
  </div>
);

const CustomInput = ({ label, value, onChange, theme, type = "text", disabled = false, placeholder = "" }: any) => (
  <div className="w-full">
    <label className={`block text-sm font-medium mb-1 ${theme.text} ${disabled ? 'opacity-50' : ''}`}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      min="1"
      max="50"
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full p-3 rounded-lg bg-white dark:bg-gray-800 ${theme.text} ${theme.border} border-2 focus:outline-none focus:ring-2 ${theme.ring} transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
    />
  </div>
);

export default function SettingsScreen({ settings, setSettings, onStart }: SettingsProps) {
  const theme = useMemo(() => themes[settings.subject] || defaultTheme, [settings.subject]);
  const isAula = settings.model === 'Aula Explicativa';
  
  const currentSubjects = getSubjectsByMode(settings.mode);
  const currentModels = getModelsByMode(settings.mode);
  
  const currentTopicsMap = topicsBySubject[settings.subject] || { 'Geral': [] };
  const availableTopics = ['Todos', ...Object.keys(currentTopicsMap)];
  const availableSubTopics = settings.topic !== 'Todos' && currentTopicsMap[settings.topic] && currentTopicsMap[settings.topic].length > 0
        ? ['Todos', ...currentTopicsMap[settings.topic]]
        : [];

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'Geral' | 'ENEM' | 'Concurso';
    const newSubjects = getSubjectsByMode(newMode);
    const newModels = getModelsByMode(newMode);
    setSettings({
      ...settings,
      mode: newMode,
      subject: newSubjects[0],
      model: newModels.includes(settings.model) ? settings.model : newModels[0],
      topic: 'Todos',
      subTopic: 'Todos',
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-2 text-gray-800 dark:text-gray-100">EduGenius</h1>
      <p className="text-center mb-8 text-lg text-gray-600 dark:text-gray-300">Personalize seus estudos</p>
      
      <div className={`space-y-6 ${theme.bg} p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800`}>
        <div className="flex justify-center mb-4 space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
          {['Concurso', 'ENEM', 'Geral'].map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange({ target: { value: m } } as any)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition ${settings.mode === m ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <CustomSelect 
          label="Matéria" 
          value={settings.subject} 
          onChange={(e: any) => setSettings({...settings, subject: e.target.value, topic: 'Todos', subTopic: 'Todos'})} 
          options={currentSubjects} 
          theme={theme} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CustomSelect 
            label="Modelo" 
            value={settings.model} 
            onChange={(e: any) => setSettings({...settings, model: e.target.value})} 
            options={currentModels} 
            theme={theme} 
          />
          {isAula ? (
            <CustomSelect 
              label="Nível da Aula" 
              value={settings.lessonLevel} 
              onChange={(e: any) => setSettings({...settings, lessonLevel: e.target.value})} 
              options={lessonLevels} 
              theme={theme} 
            />
          ) : (
            <CustomSelect 
              label="Dificuldade" 
              value={settings.difficulty} 
              onChange={(e: any) => setSettings({...settings, difficulty: e.target.value})} 
              options={difficulties} 
              theme={theme} 
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CustomSelect 
            label="Tópico" 
            value={settings.topic} 
            onChange={(e: any) => setSettings({...settings, topic: e.target.value, subTopic: 'Todos'})} 
            options={availableTopics} 
            theme={theme} 
          />
          <CustomSelect 
            label="Subtópico" 
            value={settings.subTopic} 
            onChange={(e: any) => setSettings({...settings, subTopic: e.target.value})} 
            options={availableSubTopics.length > 0 ? availableSubTopics : ['Todos']} 
            theme={theme}
            disabled={availableSubTopics.length === 0}
          />
        </div>

        <CustomInput 
          label="Quer ser mais específico? Digite o assunto aqui"
          value={settings.specificTopic}
          onChange={(e: any) => setSettings({...settings, specificTopic: e.target.value})}
          theme={theme}
          placeholder="Ex: Características dos glicerídios"
        />

        {!isAula && (
          <CustomInput 
            label={settings.model === 'Flashcard' ? "Quantidade de Flashcards" : "Quantidade de Questões"} 
            value={settings.quantity} 
            onChange={(e: any) => setSettings({ ...settings, quantity: e.target.value })} 
            theme={theme}
            type="number"
          />
        )}

        <button
          onClick={onStart}
          className={`w-full py-4 text-lg font-bold ${theme.button} rounded-lg shadow-md transform hover:scale-105 transition-all duration-300`}
        >
          {isAula ? 'Gerar Aula Explicativa' : 'Gerar Questões'}
        </button>
      </div>
    </div>
  );
}
