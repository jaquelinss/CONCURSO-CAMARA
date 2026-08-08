import React, { useState, useEffect } from 'react';
import { concursosData } from '../lib/concursosData';
import Navigation from '../components/Navigation';
import {
  Calendar,
  Building,
  Users,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Award,
  Briefcase,
  Info,
  Banknote,
  Target
} from 'lucide-react';

const ConcursosScreen: React.FC = () => {
  const [selectedId, setSelectedId] = useState(concursosData[0].id);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number }>({ days: 0, hours: 0 });
  const [isJobDescOpen, setIsJobDescOpen] = useState(false);

  const selectedConcurso = concursosData.find((c) => c.id === selectedId) || concursosData[0];

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(selectedConcurso.examDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0 });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000 * 60 * 60);
    return () => clearInterval(timer);
  }, [selectedConcurso.examDate]);

  // Dynamic icon component for timeline
  const renderIcon = (IconComponent: any) => {
    if (!IconComponent) return <Info className="w-5 h-5 text-gray-500" />;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 font-sans">
      <Navigation />
      <div className="p-4 md:p-8 flex-grow">
        <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header / Title */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Painel de Concursos
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Acompanhe seus próximos desafios e editais.
            </p>
          </div>
        </header>

        {/* Tab System */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-200/50 backdrop-blur-md rounded-2xl w-fit">
          {concursosData.map((concurso) => (
            <button
              key={concurso.id}
              onClick={() => setSelectedId(concurso.id)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                selectedId === concurso.id
                  ? 'bg-white text-indigo-700 shadow-md ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {concurso.shortName}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Card */}
            <div className={`relative overflow-hidden rounded-3xl shadow-xl shadow-${selectedConcurso.themeColor.split(' ')[0].replace('from-', '')}/10 bg-white border border-slate-100`}>
              {/* Gradient Banner */}
              <div className={`h-32 bg-gradient-to-r ${selectedConcurso.themeColor} opacity-90`} />
              
              <div className="px-6 md:px-10 pb-10 pt-8 relative -mt-16">
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 mb-8 inline-block">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mb-2">
                    <Building className="w-4 h-4" />
                    <span>Banca: <span className="text-slate-800">{selectedConcurso.banca}</span></span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                    {selectedConcurso.title}
                  </h2>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Remuneração</p>
                      <p className="text-slate-900 font-semibold">{selectedConcurso.salary}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Taxa de Inscrição</p>
                      <p className="text-slate-900 font-semibold">{selectedConcurso.registrationFee}</p>
                    </div>
                  </div>
                </div>

                {/* Job Description Accordion */}
                <div className="mt-6 border border-slate-100 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setIsJobDescOpen(!isJobDescOpen)}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-slate-500" />
                      <span className="font-semibold text-slate-800">Atribuições do Cargo</span>
                    </div>
                    {isJobDescOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </button>
                  {isJobDescOpen && (
                    <div className="p-5 bg-white text-slate-600 leading-relaxed border-t border-slate-100 text-sm md:text-base">
                      {selectedConcurso.jobDescription}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Exam Structure */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <FileQuestion className="w-6 h-6 text-indigo-500" />
                <h3 className="text-xl font-bold text-slate-900">Estrutura da Prova</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {selectedConcurso.examStructure.objective.subjects.map((subject, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800 mb-2">{subject.name}</p>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>{subject.questions} questões</span>
                      <span>Peso {subject.weight}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedConcurso.examStructure.discursive && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 mb-6">
                  <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold">
                    <FileQuestion className="w-5 h-5" />
                    Prova Discursiva
                  </div>
                  <p className="text-amber-900 text-sm mb-1">{selectedConcurso.examStructure.discursive.description}</p>
                  <p className="text-amber-700 text-sm font-medium">Valor: {selectedConcurso.examStructure.discursive.weight} pontos</p>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600">
                <Award className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-800">Critério de Aprovação: </strong> 
                  {selectedConcurso.examStructure.minScore}
                </p>
              </div>
            </div>

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Countdown Widget */}
            <div className={`p-8 rounded-3xl bg-gradient-to-br ${selectedConcurso.themeColor} text-white shadow-lg relative overflow-hidden`}>
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <Clock className="w-10 h-10 mb-4 text-white/80" />
                <h3 className="text-lg font-medium text-white/90 mb-1">Faltam para a prova</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{timeLeft.days}</span>
                  <span className="text-xl font-medium text-white/80">dias</span>
                </div>
                {timeLeft.hours > 0 && (
                  <p className="text-white/70 text-sm mt-2">e {timeLeft.hours} horas</p>
                )}
                
                {selectedConcurso.registrationUrl && (
                  <a
                    href={selectedConcurso.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 w-full py-3 px-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    Inscrever-se
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                  </a>
                )}
              </div>
            </div>

            {/* Vacancies */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900">Vagas</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                  <p className="text-2xl font-black text-slate-800">{selectedConcurso.vacancies.ampla}</p>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Ampla</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                  <p className="text-2xl font-black text-slate-800">{selectedConcurso.vacancies.cotas}</p>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Cotas</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-center">
                  <p className="text-2xl font-black text-slate-800">{selectedConcurso.vacancies.pcd}</p>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">PcD</p>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
                  <p className="text-2xl font-black text-indigo-700">{selectedConcurso.vacancies.total}</p>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-wide mt-1">Total</p>
                </div>
              </div>
            </div>

            {/* Important Dates Timeline */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900">Datas Importantes</h3>
              </div>
              
              <div className="space-y-6">
                {selectedConcurso.importantDates.map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    {/* Line connection */}
                    {idx !== selectedConcurso.importantDates.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-slate-100"></div>
                    )}
                    
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white ${
                      item.status === 'past' ? 'bg-slate-200 text-slate-500' :
                      item.status === 'current' ? 'bg-indigo-100 text-indigo-600 shadow-sm' :
                      'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      {renderIcon(item.icon)}
                    </div>
                    <div className="pt-2">
                      <p className={`font-semibold ${item.status === 'past' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                        {item.label}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ConcursosScreen;
