import React, { useState, useRef } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadString, deleteObject } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { X, Upload, FileText, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Use unpkg for the worker to avoid Vite build issues with the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export interface KnowledgeMaterial {
  id: string;
  title: string;
  fileName: string;
  storagePath: string;
  createdAt: number;
}

export default function KnowledgeBaseManager() {
  const { user } = useAuth();
  const { materials, setMaterials, showManager, setShowManager } = useKnowledgeBase();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        let fullText = '';
        
        for (let i = 1; i <= totalPages; i++) {
          setProgress({ current: i, total: totalPages, status: 'Extraindo texto...' });
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione apenas arquivos PDF.');
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: 0, status: 'Iniciando leitura do PDF...' });

    try {
      // 1. Extract text
      const extractedText = await extractTextFromPDF(file);
      
      setProgress({ current: 0, total: 0, status: 'Salvando na nuvem...' });
      
      // 2. Upload text to Storage
      const storagePath = `users/${user.uid}/materials/${Date.now()}_${file.name}.txt`;
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, extractedText);

      // 3. Save metadata to Firestore
      const newMaterial = {
        userId: user.uid,
        title: file.name.replace('.pdf', ''),
        fileName: file.name,
        storagePath: storagePath,
        createdAt: Date.now()
      };
      
      const docRef = await addDoc(collection(db, 'user_materials'), newMaterial);
      
      // 4. Update UI
      const materialWithId = { id: docRef.id, ...newMaterial };
      const newMaterialsList = [materialWithId, ...materials];
      setMaterials(newMaterialsList);
      
    } catch (error) {
      console.error("Error uploading material:", error);
      alert('Erro ao processar o arquivo. ' + error);
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0, status: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (material: KnowledgeMaterial) => {
    if (!user || !confirm(`Tem certeza que deseja excluir "${material.title}"? A IA não poderá mais consultá-lo.`)) return;
    
    try {
      // Delete from Storage
      const storageRef = ref(storage, material.storagePath);
      await deleteObject(storageRef).catch(console.error); // Ignore if already deleted
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'user_materials', material.id));
      
      // Update UI
      const updated = materials.filter(m => m.id !== material.id);
      setMaterials(updated);
    } catch (error) {
      console.error("Error deleting material:", error);
      alert('Erro ao excluir material.');
    }
  };

  if (!showManager) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Meus Materiais de Estudo (Base da IA)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Faça upload de PDFs para que os Professores de IA possam consultá-los nas respostas.
            </p>
          </div>
          <button onClick={() => setShowManager(false)} className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${uploading ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-gray-700/50'}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="font-medium text-blue-800 dark:text-blue-300">{progress.status}</p>
                {progress.total > 0 && (
                  <div className="w-full max-w-xs mt-2">
                    <div className="h-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-center">
                      Página {progress.current} de {progress.total}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Adicionar novo PDF</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                  O texto será extraído e salvo no seu banco de dados para a IA consultar. O arquivo PDF original não precisa ser salvo.
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                  id="pdf-upload"
                />
                <label 
                  htmlFor="pdf-upload"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium cursor-pointer inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4" /> Selecionar Arquivo
                </label>
              </>
            )}
          </div>

          {/* List of Materials */}
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> Materiais Disponíveis ({materials.length})
            </h3>
            
            {materials.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum material adicionado ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map(mat => (
                  <div key={mat.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 truncate">{mat.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Adicionado em {new Date(mat.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(mat)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2 flex-shrink-0"
                      title="Excluir material"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
