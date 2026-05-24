import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Bug, ChevronDown, ChevronUp, CheckCircle, Clock, BookOpen } from 'lucide-react';
import DocumentationModal from '../components/DocumentationModal';

// Email da conta admin que pode ver os reportes
const ADMIN_EMAILS = ['quelinalins@gmail.com'];

export default function ConfigScreen() {
  const { apiKey, saveApiKey, user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showDocs, setShowDocs] = useState(false);
  const navigate = useNavigate();

  // Admin: reportes de erro
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey);
    }
  }, [apiKey]);

  const fetchReports = async () => {
    if (!isAdmin) return;
    setLoadingReports(true);
    try {
      const ref = collection(db, 'error_reports');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao buscar reportes:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const markAsResolved = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'error_reports', reportId), { status: 'resolved' });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

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
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-800">
      <Navigation />
      <main className="flex-grow p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">Configurações</h1>
        
        {/* Documentação */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6" />
              Conheça todas as ferramentas
            </h2>
            <p className="text-indigo-100 text-sm">
              Descubra como extrair o máximo do EduGenius. Veja o manual completo com todos os recursos e atalhos.
            </p>
          </div>
          <button
            onClick={() => setShowDocs(true)}
            className="px-6 py-2.5 bg-white text-indigo-600 font-bold rounded-lg shadow-md hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            Abrir Manual
          </button>
        </div>

        <DocumentationModal isOpen={showDocs} onClose={() => setShowDocs(false)} />

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Chave da API do Google (Gemini)</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
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
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sua Chave API (AIza...)</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Cole sua chave aqui..."
                className="w-full p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
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
                  onClick={() => navigate('/')} 
                  className="px-6 py-3 text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                >
                  Voltar para o Dashboard
                </button>
              )}
            </div>
          </div>
        </div>



        {/* Painel de Admin - Reportes de Erro */}
        {isAdmin && (
          <div className="mt-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-red-700 flex items-center gap-2">
                <Bug className="w-6 h-6" />
                Reportes de Erro
                {reports.filter(r => r.status === 'new').length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {reports.filter(r => r.status === 'new').length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => { setShowReports(!showReports); if (!showReports && reports.length === 0) fetchReports(); }}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
              >
                {showReports ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showReports ? 'Ocultar' : 'Ver reportes'}
              </button>
            </div>

            {showReports && (
              <div className="mt-6 space-y-4">
                {loadingReports ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                  </div>
                ) : reports.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nenhum reporte recebido ainda. 🎉</p>
                ) : (
                  reports.map(report => (
                    <div 
                      key={report.id} 
                      className={`border-2 rounded-xl overflow-hidden transition-all ${report.status === 'resolved' ? 'border-green-100 bg-green-50/30' : 'border-red-100'}`}
                    >
                      {/* Cabeçalho do reporte */}
                      <button
                        onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            {report.status === 'resolved' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {report.userEmail}
                            </span>
                            <span className="text-xs text-gray-400">
                              {report.createdAt?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">
                            {report.description || report.errorMessage || 'Sem descrição'}
                          </p>
                        </div>
                        {expandedReport === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Detalhes expandidos */}
                      {expandedReport === report.id && (
                        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 space-y-3">
                          {report.description && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Descrição do Usuário</p>
                              <p className="text-sm text-gray-800 dark:text-gray-200">{report.description}</p>
                            </div>
                          )}
                          {report.errorMessage && (
                            <div>
                              <p className="text-xs font-bold text-red-500 uppercase">Erro Técnico</p>
                              <p className="text-sm text-red-800 font-mono bg-red-50 p-2 rounded">{report.errorMessage}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <p><strong>URL:</strong> {report.url}</p>
                            <p><strong>Tela:</strong> {report.screenSize}</p>
                            <p className="col-span-2"><strong>Navegador:</strong> {report.userAgent?.substring(0, 80)}...</p>
                          </div>
                          {report.screenshot && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Captura de Tela</p>
                              <img src={report.screenshot} alt="Screenshot" className="w-full rounded-lg border shadow-sm" />
                            </div>
                          )}
                          {report.status !== 'resolved' && (
                            <button
                              onClick={() => markAsResolved(report.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                            >
                              ✓ Marcar como Resolvido
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

