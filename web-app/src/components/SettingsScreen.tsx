import React, { useMemo, useEffect, useState } from 'react';
import { getModelsByMode, themes, defaultTheme, difficulties, lessonLevels, topicsBySubject, isLawSubject } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useCustomSubjects } from '../contexts/CustomSubjectsContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  const { getAllSubjectsByMode } = useCustomSubjects();
  
  const currentSubjects = getAllSubjectsByMode(settings.mode);
  const currentModels = settings.subject === 'Redação'
    ? ['Enem', 'Corrigir Redação Pronta', 'Flashcard']
    : getModelsByMode(settings.mode);

  const [activeTopicsMap, setActiveTopicsMap] = useState<Record<string, string[]>>({ 'Geral': [] });
  const { user, selectedBanca, saveBanca } = useAuth();

  useEffect(() => {
    const fetchCustomTopics = async () => {
      let defaultMap = topicsBySubject[settings.subject] || { 'Geral': [] };
      if (settings.subject === 'Redação') {
        if (settings.model === 'Enem') {
          defaultMap = { 'Eixos Temáticos': topicsBySubject.Redação['Eixos Temáticos'] || [] };
        } else if (settings.model === 'Flashcard') {
          defaultMap = {
            'Técnicas de Escrita': topicsBySubject.Redação['Técnicas de Escrita'] || [],
            'Repertório Sociocultural': topicsBySubject.Redação['Repertório Sociocultural'] || [],
          };
        } else {
          defaultMap = { 'Geral': [] };
        }
      }

      if (!user) {
        setActiveTopicsMap(defaultMap);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid, 'studyProgress', settings.subject);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const savedItems = data.items || [];
          const isAiPlan = data.isAiGenerated || (savedItems.length > 0 && savedItems.every((item: any) => item.isCustom));
          
          const newMap: Record<string, string[]> = {};
          
          if (isAiPlan) {
            savedItems.forEach((item: any) => {
              if (!newMap[item.topic]) newMap[item.topic] = [];
              if (!newMap[item.topic].includes(item.subTopic)) newMap[item.topic].push(item.subTopic);
            });
            setActiveTopicsMap(newMap);
          } else {
            // Mistura padrão com customizados manuais
            Object.keys(defaultMap).forEach(k => newMap[k] = [...defaultMap[k]]);
            savedItems.filter((i: any) => i.isCustom).forEach((item: any) => {
              if (!newMap[item.topic]) newMap[item.topic] = [];
              if (!newMap[item.topic].includes(item.subTopic)) newMap[item.topic].push(item.subTopic);
            });
            setActiveTopicsMap(newMap);
          }
        } else {
          setActiveTopicsMap(defaultMap);
        }
      } catch (err) {
        console.error('Erro ao buscar tópicos customizados:', err);
        setActiveTopicsMap(defaultMap);
      }
    };

    fetchCustomTopics();
  }, [user, settings.subject, settings.model]);

  const availableTopics = settings.subject === 'Redação' && settings.model === 'Corrigir Redação Pronta'
    ? ['Todos']
    : ['Todos', ...Object.keys(activeTopicsMap)];

  const availableSubTopics = settings.topic !== 'Todos' && activeTopicsMap[settings.topic] && activeTopicsMap[settings.topic].length > 0
        ? ['Todos', ...activeTopicsMap[settings.topic]]
        : [];

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'Geral' | 'ENEM' | 'Concurso';
    const newSubjects = getAllSubjectsByMode(newMode);
    const newModels = newSubjects[0] === 'Redação'
      ? ['Enem', 'Corrigir Redação Pronta', 'Flashcard']
      : getModelsByMode(newMode);

    setSettings({
      ...settings,
      mode: newMode,
      subject: newSubjects[0],
      model: newModels.includes(settings.model) ? settings.model : newModels[0],
      topic: 'Todos',
      subTopic: 'Todos',
    });
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSubject = e.target.value;
    let nextModel = settings.model;
    if (nextSubject === 'Redação') {
      nextModel = 'Enem';
    } else if (settings.model === 'Enem' || settings.model === 'Corrigir Redação Pronta') {
      const nextModels = getModelsByMode(settings.mode);
      nextModel = nextModels[0];
    }

    setSettings({
      ...settings,
      subject: nextSubject,
      model: nextModel,
      topic: 'Todos',
      subTopic: 'Todos',
      specificTopic: ''
    });
  };

  const getButtonLabel = () => {
    if (settings.subject === 'Redação') {
      if (settings.model === 'Enem') return 'Gerar Proposta de Redação';
      if (settings.model === 'Corrigir Redação Pronta') return 'Entrar no Módulo de Redação';
      if (settings.model === 'Flashcard') return 'Gerar Flashcards';
    }
    return isAula ? 'Gerar Aula Explicativa' : 'Gerar Questões';
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

        {settings.mode === 'Concurso' && (
          <div className="flex justify-center mb-6 space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
            {['IBAM', 'CESPE', 'FGV', 'CESGRANRIO'].map((b) => (
              <button
                key={b}
                onClick={() => saveBanca(b)}
                className={`flex-1 py-1 px-2 text-sm rounded-md font-medium transition ${selectedBanca === b ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        <CustomSelect 
          label="Matéria" 
          value={settings.subject} 
          onChange={handleSubjectChange} 
          options={currentSubjects} 
          theme={theme} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CustomSelect 
            label="Modelo" 
            value={settings.model} 
            onChange={(e: any) => setSettings({...settings, model: e.target.value, topic: 'Todos', subTopic: 'Todos'})} 
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
              disabled={settings.subject === 'Redação' && settings.model === 'Corrigir Redação Pronta'}
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
            disabled={settings.subject === 'Redação' && settings.model === 'Corrigir Redação Pronta'}
          />
          <CustomSelect 
            label="Subtópico" 
            value={settings.subTopic} 
            onChange={(e: any) => setSettings({...settings, subTopic: e.target.value})} 
            options={availableSubTopics.length > 0 ? availableSubTopics : ['Todos']} 
            theme={theme}
            disabled={availableSubTopics.length === 0 || (settings.subject === 'Redação' && settings.model === 'Corrigir Redação Pronta')}
          />
        </div>

        <CustomInput 
          label="Quer ser mais específico? Digite o assunto aqui"
          value={settings.specificTopic}
          onChange={(e: any) => setSettings({...settings, specificTopic: e.target.value})}
          theme={theme}
          placeholder="Ex: Características dos glicerídios"
          disabled={settings.subject === 'Redação' && settings.model === 'Corrigir Redação Pronta'}
        />

        {!isAula && settings.model !== 'Corrigir Redação Pronta' && (
          <CustomInput 
            label={settings.model === 'Flashcard' ? "Quantidade de Flashcards" : "Quantidade de Questões"} 
            value={settings.quantity} 
            onChange={(e: any) => setSettings({ ...settings, quantity: e.target.value })} 
            theme={theme}
            type="number"
          />
        )}

        {isLawSubject(settings.subject) && (
          <div className="flex items-center space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg transition-colors">
            <input
              type="checkbox"
              id="leiSecaToggle"
              checked={settings.leiSecaEnabled}
              onChange={(e) => setSettings({ ...settings, leiSecaEnabled: e.target.checked })}
              className={`w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500`}
            />
            <div className="flex-1">
              <label htmlFor="leiSecaToggle" className="font-semibold text-amber-900 dark:text-amber-100 cursor-pointer">
                Modo Lei Seca
              </label>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Incluir texto literal da legislação nas explicações geradas pela IA.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onStart}
          className={`w-full py-4 text-lg font-bold ${theme.button} rounded-lg shadow-md transform hover:scale-105 transition-all duration-300`}
        >
          {getButtonLabel()}
        </button>
      </div>
    </div>
  );
}
