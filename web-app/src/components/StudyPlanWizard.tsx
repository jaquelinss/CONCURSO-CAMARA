import { useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { extractTopicsFromDoc, generateStudyPlan } from '../lib/gemini';
import { useCustomSubjects } from '../contexts/CustomSubjectsContext';
import { EXAM_DATES, getSubjectsByMode } from '../lib/constants';
import { Upload, FileText, ListChecks, Sparkles, ChevronRight, ChevronLeft, X, Plus, Trash2, Database, Loader2, CheckCircle2 } from 'lucide-react';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { ref, getDownloadURL } from 'firebase/storage';
import mammoth from 'mammoth';

interface StudyPlanWizardProps {
  onPlanCreated: () => void;
  onClose: () => void;
}

const weekDays = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
];

export default function StudyPlanWizard({ onPlanCreated, onClose }: StudyPlanWizardProps) {
  const { user, apiKey } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1 — Source
  const [sourceType, setSourceType] = useState<'file' | 'manual' | 'cloud' | null>(null);
  const [subjects, setSubjects] = useState<{ name: string; topics: string[] }[]>([]);
  const { getAllSubjectsByMode } = useCustomSubjects();
  const [planMode, setPlanMode] = useState<'Concurso' | 'Auditor Fiscal' | 'Assistente UFPE' | 'Combinado'>('Concurso');
  const [combinedModes, setCombinedModes] = useState<Set<string>>(new Set(['Auditor Fiscal', 'Assistente UFPE']));

  const allAvailableSubjects = useMemo(() => {
    if (planMode === 'Combinado') {
      const merged = new Set<string>();
      combinedModes.forEach(m => getSubjectsByMode(m as any).forEach(s => merged.add(s)));
      return Array.from(merged);
    }
    return getAllSubjectsByMode(planMode as any);
  }, [planMode, combinedModes, getAllSubjectsByMode]);
  
  // Cloud mode
  const { materials } = useKnowledgeBase();
  const [selectedCloudMaterials, setSelectedCloudMaterials] = useState<Set<string>>(new Set());
  const [cloudExtracting, setCloudExtracting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual mode
  const [manualSubject, setManualSubject] = useState('');
  const [manualTopics, setManualTopics] = useState('');

  // Step 2 — Schedule config
  const [title, setTitle] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [studyDays, setStudyDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [examDate, setExamDate] = useState(EXAM_DATES['Auditor Fiscal'] || '');


  // Step 3 — Generation
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !apiKey) return;

    setExtracting(true);
    setExtractError('');
    setFileName(file.name);

    try {
      let text = '';
      if (file.name.endsWith('.txt')) {
        text = await file.text();
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        setExtractError('Formato não suportado. Use .docx ou .txt');
        setExtracting(false);
        return;
      }

      if (!text.trim()) {
        setExtractError('O arquivo está vazio ou não foi possível ler o conteúdo.');
        setExtracting(false);
        return;
      }

      const result = await extractTopicsFromDoc(text, apiKey);
      if (result.subjects && result.subjects.length > 0) {
        setSubjects(result.subjects);
      } else {
        setExtractError('Não foi possível extrair tópicos do arquivo.');
      }
    } catch (err: any) {
      setExtractError('Erro ao processar arquivo: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const addManualSubject = () => {
    if (!manualSubject.trim()) return;
    const topics = manualTopics.split('\n').map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) {
      topics.push('Geral');
    }
    setSubjects(prev => [...prev, { name: manualSubject.trim(), topics }]);
    setManualSubject('');
    setManualTopics('');
  };

  const removeSubject = (index: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const addPresetSubject = (name: string) => {
    if (subjects.find(s => s.name === name)) return;
    setSubjects(prev => [...prev, { name, topics: ['Todos os tópicos'] }]);
  };

  const toggleDay = (day: string) => {
    setStudyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCloudExtraction = async () => {
    if (!apiKey) return;
    setCloudExtracting(true);
    setExtractError('');
    try {
      let combinedText = '';
      const selectedMats = materials.filter(m => selectedCloudMaterials.has(m.id));
      
      for (const mat of selectedMats) {
        const url = await getDownloadURL(ref(storage, mat.storagePath));
        const response = await fetch(url);
        const text = await response.text();
        combinedText += `\n--- MATERIAL: ${mat.title} ---\n${text}\n\n`;
      }

      if (!combinedText.trim()) {
        setExtractError('Nenhum texto encontrado nos materiais selecionados.');
        setCloudExtracting(false);
        return;
      }

      const result = await extractTopicsFromDoc(combinedText, apiKey);
      if (result.subjects && result.subjects.length > 0) {
        setSubjects(result.subjects);
      } else {
        setExtractError('Não foi possível extrair tópicos dos materiais.');
      }
    } catch (err: any) {
      setExtractError('Erro ao processar materiais da nuvem: ' + err.message);
    } finally {
      setCloudExtracting(false);
    }
  };

  const canProceedStep1 = subjects.length > 0;
  const canProceedStep2 = title.trim() && examDate && studyDays.length > 0 && hoursPerDay > 0;

  const handleGenerate = async () => {
    if (!user || !apiKey) return;
    setGenerating(true);
    setGenError('');

    try {
      const today = new Date();
      const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      let subjectExamDates: Record<string, string> | undefined = undefined;
      if (planMode === 'Combinado') {
        subjectExamDates = {};
        combinedModes.forEach(mode => {
          const m = mode as keyof typeof EXAM_DATES;
          const date = EXAM_DATES[m];
          if (date) {
            getSubjectsByMode(m as any).forEach(s => {
              if (subjectExamDates) subjectExamDates[s] = date;
            });
          }
        });
      }

      const result = await generateStudyPlan({
        subjects,
        hoursPerDay,
        studyDays,
        examDate,
        startDate,
        subjectExamDates,
      }, apiKey);

      if (!result.schedule || result.schedule.length === 0) {
        setGenError('A IA não conseguiu gerar o plano. Tente novamente.');
        setGenerating(false);
        return;
      }

      // Add unique IDs and status to each block
      const schedule = result.schedule.map((day: any) => ({
        ...day,
        blocks: day.blocks.map((block: any, idx: number) => ({
          ...block,
          id: `${day.date}-${idx}`,
          status: 'pending',
        })),
      }));

      const planRef = collection(db, 'users', user.uid, 'studyPlans');
      await addDoc(planRef, {
        title,
        hoursPerDay,
        studyDays,
        examDate,
        subjects,
        schedule,
        sourceType: sourceType || 'manual',
        planMode,
        ...(planMode === 'Combinado' ? { combinedModes: Array.from(combinedModes) } : {}),
        createdAt: serverTimestamp(),
      });

      onPlanCreated();
    } catch (err: any) {
      setGenError('Erro ao gerar plano: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Criar Plano de Estudos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Passo {step} de 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* STEP 1 — Source */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">De onde vêm as matérias?</h3>
              
              {/* Mode selector */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
                  {(['Concurso', 'Auditor Fiscal', 'Assistente UFPE', 'Combinado'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setPlanMode(m);
                        setSubjects([]);
                        if (m !== 'Combinado') {
                          const ed = EXAM_DATES[m as keyof typeof EXAM_DATES];
                          if (ed) setExamDate(ed);
                        }
                      }}
                      className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${planMode === m ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      {m === 'Concurso' ? '🏛️ Câmara' : m === 'Auditor Fiscal' ? '📊 Auditor' : m === 'Assistente UFPE' ? '🎓 UFPE' : '🔗 Combinado'}
                    </button>
                  ))}
                </div>

                {/* Combined mode: select which concursos to merge */}
                {planMode === 'Combinado' && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">🔗 Selecione os concursos para combinar:</p>
                    <div className="flex flex-wrap gap-2">
                      {(['Concurso', 'Auditor Fiscal', 'Assistente UFPE'] as const).map(m => {
                        const isSelected = combinedModes.has(m);
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              const next = new Set(combinedModes);
                              if (isSelected && next.size > 1) next.delete(m);
                              else next.add(m);
                              setCombinedModes(next);
                              setSubjects([]);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                            }`}
                          >
                            {isSelected ? '✅ ' : ''}{m === 'Concurso' ? 'Câmara' : m === 'Auditor Fiscal' ? 'Auditor Fiscal' : 'Assist. UFPE'}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      📌 Matérias comuns serão estudadas uma única vez
                    </p>
                  </div>
                )}
              </div>

              {/* Source selection */}
              {!sourceType && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => setSourceType('cloud')}
                    className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-center group"
                  >
                    <Database className="w-10 h-10 mx-auto mb-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Meus Materiais</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Usar PDFs salvos</p>
                  </button>
                  <button
                    onClick={() => setSourceType('file')}
                    className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all text-center group"
                  >
                    <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Enviar Arquivo</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">.docx ou .txt</p>
                  </button>
                  <button
                    onClick={() => setSourceType('manual')}
                    className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all text-center group"
                  >
                    <ListChecks className="w-10 h-10 mx-auto mb-3 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Selecionar Manualmente</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Escolha as matérias</p>
                  </button>
                </div>
              )}

              {/* Cloud Materials */}
              {sourceType === 'cloud' && (
                <div className="space-y-4">
                  <button onClick={() => setSourceType(null)} className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  
                  {materials.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Você ainda não enviou nenhum material para a Base da IA.</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">Vá no Chat da IA e clique no botão de Base de Dados para adicionar PDFs.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Selecione os materiais que deseja usar para gerar o plano:</p>
                      {materials.map(mat => {
                        const isSelected = selectedCloudMaterials.has(mat.id);
                        return (
                          <div 
                            key={mat.id} 
                            onClick={() => {
                              const newSelected = new Set(selectedCloudMaterials);
                              if (isSelected) newSelected.delete(mat.id);
                              else newSelected.add(mat.id);
                              setSelectedCloudMaterials(newSelected);
                            }}
                            className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700' 
                                : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                              {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 truncate">
                              <h4 className={`font-medium text-sm truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>{mat.title}</h4>
                            </div>
                          </div>
                        );
                      })}
                      
                      {selectedCloudMaterials.size > 0 && (
                        <button
                          onClick={handleCloudExtraction}
                          disabled={cloudExtracting}
                          className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          {cloudExtracting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Lendo materiais selecionados...
                            </>
                          ) : (
                            <>
                              <Database className="w-5 h-5" />
                              Extrair Tópicos dos Materiais ({selectedCloudMaterials.size})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {extractError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{extractError}</p>}
                </div>
              )}

              {/* File upload */}
              {sourceType === 'file' && (
                <div className="space-y-4">
                  <button onClick={() => setSourceType(null)} className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-indigo-400 transition-colors cursor-pointer text-center"
                  >
                    {extracting ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-dashed border-indigo-500 rounded-full animate-spin" />
                        <p className="text-gray-600 dark:text-gray-300">Extraindo tópicos de <strong>{fileName}</strong>...</p>
                      </div>
                    ) : fileName ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-green-500" />
                        <p className="font-semibold text-gray-700 dark:text-gray-200">{fileName}</p>
                        <p className="text-sm text-gray-500">Clique para trocar o arquivo</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-10 h-10 text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-300">Clique para selecionar um arquivo .docx ou .txt</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".docx,.doc,.txt" onChange={handleFileUpload} className="hidden" />
                  {extractError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{extractError}</p>}
                </div>
              )}

              {/* Manual selection */}
              {sourceType === 'manual' && (
                <div className="space-y-4">
                  <button onClick={() => setSourceType(null)} className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>

                  {/* Quick add from presets */}
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Adicionar rapidamente:</p>
                    <div className="flex flex-wrap gap-2">
                      {allAvailableSubjects.map(s => (
                        <button
                          key={s}
                          onClick={() => addPresetSubject(s)}
                          disabled={!!subjects.find(sub => sub.name === s)}
                          className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-all ${
                            subjects.find(sub => sub.name === s)
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/30'
                          }`}
                        >
                          {subjects.find(sub => sub.name === s) ? '✓ ' : '+ '}{s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom subject */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Ou adicione uma matéria personalizada:</p>
                    <input
                      type="text"
                      value={manualSubject}
                      onChange={e => setManualSubject(e.target.value)}
                      placeholder="Nome da matéria"
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                    />
                    <textarea
                      value={manualTopics}
                      onChange={e => setManualTopics(e.target.value)}
                      placeholder="Tópicos (um por linha):&#10;Ex: Fonética&#10;Morfologia&#10;Sintaxe"
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm resize-none"
                    />
                    <button onClick={addManualSubject} className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Adicionar Matéria
                    </button>
                  </div>
                </div>
              )}

              {/* Current subjects list */}
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Matérias selecionadas ({subjects.length}):</p>
                  {subjects.map((s, i) => (
                    <div key={i} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.topics.join(' • ')}</p>
                      </div>
                      <button onClick={() => removeSubject(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Config */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configure seu cronograma</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Título do plano</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={planMode === 'Auditor Fiscal' ? "Ex: Auditor Fiscal Caruaru 2026" : planMode === 'Assistente UFPE' ? "Ex: Assistente UFPE 2027" : planMode === 'Combinado' ? "Ex: Plano Combinado 2026" : "Ex: Concurso Câmara 2026"}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Horas de estudo por dia: <span className="text-indigo-600 dark:text-indigo-400">{hoursPerDay}h</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={e => setHoursPerDay(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1h</span><span>6h</span><span>12h</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dias de estudo</label>
                <div className="flex gap-2 flex-wrap">
                  {weekDays.map(d => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(d.key)}
                      className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                        studyDays.includes(d.key)
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Data da prova</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          {/* STEP 3 — Generate */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <Sparkles className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tudo pronto!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  A IA vai criar um cronograma personalizado com <strong>{subjects.length} matérias</strong>,
                  estudando <strong>{hoursPerDay}h por dia</strong>, <strong>{studyDays.length} dias por semana</strong>.
                </p>
              </div>

              <div className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>📋 Plano:</strong> {title}</p>
                <p><strong>📅 Data da prova:</strong> {new Date(examDate + 'T12:00').toLocaleDateString('pt-BR')}</p>
                <p><strong>📚 Matérias:</strong> {subjects.map(s => s.name).join(', ')}</p>
              </div>

              {genError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{genError}</p>}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando cronograma...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Plano de Estudos
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="px-6 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
