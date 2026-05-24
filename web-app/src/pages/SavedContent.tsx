import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import QuizScreen from '../components/QuizScreen';
import LessonScreen from '../components/LessonScreen';
import ScheduleRevisionModal from '../components/ScheduleRevisionModal';
import { CalendarClock, MessageSquare, Check, X, Trash2, FolderPlus, Plus, FolderOpen, XCircle, Pencil } from 'lucide-react';

function CommentBadge({ item, collectionName, userId }: { item: any, collectionName: string, userId: string }) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(item.userComment || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, 'users', userId, collectionName, item.id);
      await updateDoc(ref, { userComment: comment });
      item.userComment = comment;
      setEditing(false);
    } catch (err) {
      console.error('Erro ao salvar comentário:', err);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ex: Revisão sobre verbos irregulares"
          className="flex-grow text-sm p-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setComment(item.userComment || ''); setEditing(false); }}}
        />
        <button onClick={handleSave} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setComment(item.userComment || ''); setEditing(false); }} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
      title="Adicionar/editar comentário"
    >
      <MessageSquare className="w-3 h-3" />
      {item.userComment ? (
        <span className="italic text-indigo-500 dark:text-indigo-400">{item.userComment}</span>
      ) : (
        <span>Adicionar comentário</span>
      )}
    </button>
  );
}

function TitleEditor({ item, collectionName, userId, currentTitle, onUpdate }: { item: any, collectionName: string, userId: string, currentTitle: string, onUpdate: (newTitle: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const ref = doc(db, 'users', userId, collectionName, item.id);
      if (collectionName === 'lessons') {
        await updateDoc(ref, { 'data.titulo': title.trim() });
        if (item.data) item.data.titulo = title.trim();
      } else {
        await updateDoc(ref, { customTitle: title.trim() });
        item.customTitle = title.trim();
      }
      onUpdate(title.trim());
      setEditing(false);
    } catch (err) {
      console.error('Erro ao salvar título:', err);
      alert('Erro ao salvar título.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do conteúdo"
          className="flex-grow text-sm font-bold p-1.5 rounded-md border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setTitle(currentTitle); setEditing(false); }}}
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors shrink-0">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setTitle(currentTitle); setEditing(false); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group/title">
      <h3 className="font-bold">{currentTitle}</h3>
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 opacity-0 group-hover/title:opacity-100 transition-all"
        title="Editar nome"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SavedContent() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingContent, setViewingContent] = useState<any>(null);
  const [viewingType, setViewingType] = useState<'lesson' | 'quiz' | 'flashcard' | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<{item: any, type: 'lesson' | 'quiz' | 'flashcard'} | null>(null);

  // Folder system
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('none'); // Default to 'none' (Sem Pasta) to keep the landing page clean
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingItem, setMovingItem] = useState<{id: string, type: 'lessons' | 'quizzes' | 'flashcards'} | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const saveFolderName = async (folderId: string) => {
    if (!user || !editFolderName.trim()) return;
    try {
      const folderRef = doc(db, 'users', user.uid, 'folders', folderId);
      await updateDoc(folderRef, { name: editFolderName.trim() });
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: editFolderName.trim() } : f));
      setEditingFolderId(null);
    } catch (err) {
      console.error('Erro ao renomear pasta:', err);
      alert('Erro ao renomear pasta.');
    }
  };

  useEffect(() => {
    const fetchSavedContent = async () => {
      if (!user) return;
      try {
        const lessonsRef = collection(db, 'users', user.uid, 'lessons');
        const qLessons = query(lessonsRef, orderBy('createdAt', 'desc'));
        const lessonSnap = await getDocs(qLessons);
        setLessons(lessonSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const quizzesRef = collection(db, 'users', user.uid, 'quizzes');
        const qQuizzes = query(quizzesRef, orderBy('createdAt', 'desc'));
        const quizSnap = await getDocs(qQuizzes);
        setQuizzes(quizSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const flashcardsRef = collection(db, 'users', user.uid, 'flashcards');
        const qFlashcards = query(flashcardsRef, orderBy('createdAt', 'desc'));
        const flashcardsSnap = await getDocs(qFlashcards);
        setFlashcards(flashcardsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch folders
        const foldersRef = collection(db, 'users', user.uid, 'folders');
        const qFolders = query(foldersRef, orderBy('createdAt', 'asc'));
        const foldersSnap = await getDocs(qFolders);
        setFolders(foldersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erro ao buscar conteúdos salvos", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedContent();
  }, [user]);

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try {
      const foldersRef = collection(db, 'users', user.uid, 'folders');
      const newDoc = await addDoc(foldersRef, {
        name: newFolderName.trim(),
        createdAt: serverTimestamp(),
      });
      setFolders(prev => [...prev, { id: newDoc.id, name: newFolderName.trim() }]);
      setNewFolderName('');
      setCreatingFolder(false);
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
      alert('Erro ao criar pasta.');
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!user) return;
    if (!window.confirm('Excluir esta pasta? Os conteúdos dentro dela NÃO serão apagados.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'folders', folderId));
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (activeFolder === folderId) setActiveFolder('all');
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
    }
  };

  const moveToFolder = async (itemId: string, type: 'lessons' | 'quizzes' | 'flashcards', folderId: string | null) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, type, itemId);
      await updateDoc(ref, { folderId: folderId || null });
      const updateState = (prev: any[]) => prev.map(item => item.id === itemId ? { ...item, folderId: folderId || null } : item);
      if (type === 'lessons') setLessons(updateState);
      if (type === 'quizzes') setQuizzes(updateState);
      if (type === 'flashcards') setFlashcards(updateState);
      setMovingItem(null);
    } catch (err) {
      console.error('Erro ao mover:', err);
      alert('Erro ao mover conteúdo.');
    }
  };

  const filterByFolder = (items: any[]) => {
    const existingFolderIds = folders.map(f => f.id);
    if (activeFolder === 'all') return items;
    if (activeFolder === 'none') {
      return items.filter(i => !i.folderId || !existingFolderIds.includes(i.folderId));
    }
    return items.filter(i => i.folderId === activeFolder);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, type: 'lessons' | 'quizzes' | 'flashcards') => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja excluir este conteúdo?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, type, id));
      if (type === 'lessons') setLessons(prev => prev.filter(item => item.id !== id));
      if (type === 'quizzes') setQuizzes(prev => prev.filter(item => item.id !== id));
      if (type === 'flashcards') setFlashcards(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert('Erro ao excluir conteúdo.');
    }
  };

  const handleBack = () => {
    setViewingContent(null);
    setViewingType(null);
  };

  if (viewingContent && viewingType) {
    if (viewingType === 'lesson') {
      const lessonSettings = {
        subject: viewingContent.subject,
        topic: viewingContent.topic,
        lessonLevel: viewingContent.lessonLevel || 'Introdutória',
      };
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow p-4">
            <LessonScreen
              settings={lessonSettings}
              onBack={handleBack}
              savedData={viewingContent.data}
            />
          </main>
        </div>
      );
    }

    if (viewingType === 'quiz') {
      const quizSettings = {
        subject: viewingContent.subject,
        topic: viewingContent.topic,
        difficulty: viewingContent.difficulty || 'Médio',
        model: 'Questões',
      };
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow p-4">
            <QuizScreen
              settings={quizSettings}
              onBack={handleBack}
              savedData={viewingContent.data}
            />
          </main>
        </div>
      );
    }

    if (viewingType === 'flashcard') {
      const flashSettings = {
        subject: viewingContent.subject,
        topic: viewingContent.topic,
        difficulty: viewingContent.difficulty || 'Médio',
        model: 'Flashcard',
      };
      return (
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-grow p-4">
            <QuizScreen
              settings={flashSettings}
              onBack={handleBack}
              savedData={viewingContent.data}
            />
          </main>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow p-4 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-4">Meu Conteúdo Salvo</h1>

        {/* Folder Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveFolder('all')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeFolder === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveFolder('none')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeFolder === 'none' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            Sem Pasta
          </button>
          {folders.map(folder => (
            <div key={folder.id} className="relative group flex items-center">
              {editingFolderId === folder.id ? (
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full px-3 py-1 border border-indigo-400">
                  <input
                    type="text"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    className="bg-transparent border-none text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none w-28"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveFolderName(folder.id);
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                  />
                  <button
                    onClick={() => saveFolderName(folder.id)}
                    className="text-green-600 hover:text-green-700 p-0.5"
                    title="Confirmar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingFolderId(null)}
                    className="text-gray-400 hover:text-gray-500 p-0.5"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setActiveFolder(folder.id)}
                    onDoubleClick={() => {
                      setEditingFolderId(folder.id);
                      setEditFolderName(folder.name);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${activeFolder === folder.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    title="Dê duplo clique para renomear"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {folder.name}
                  </button>
                  <div className="flex items-center ml-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolderId(folder.id);
                        setEditFolderName(folder.name);
                      }}
                      className="p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                      title="Renomear pasta"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir pasta"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {creatingFolder ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome da pasta"
                className="px-3 py-2 rounded-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }}}
              />
              <button onClick={createFolder} className="p-1.5 text-green-600 hover:bg-green-50 rounded-full"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Pasta
            </button>
          )}
        </div>
        
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Aulas Explicativas</h2>
              {filterByFolder(lessons).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma aula nesta visualização.</p>
              ) : (
                <div className="space-y-4">
                  {filterByFolder(lessons).map(lesson => (
                    <div 
                      key={lesson.id} 
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-blue-500 flex justify-between items-start"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(lesson); setViewingType('lesson'); }}>
                        <TitleEditor
                          item={lesson}
                          collectionName="lessons"
                          userId={user!.uid}
                          currentTitle={lesson.data?.titulo || lesson.subject}
                          onUpdate={(newTitle) => setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, data: { ...l.data, titulo: newTitle } } : l))}
                        />
                        <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span>Salvo em: {lesson.createdAt?.toDate().toLocaleDateString()}</span>
                          {lesson.folderId && folders.find(f => f.id === lesson.folderId) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              <FolderOpen className="w-3 h-3" />
                              {folders.find(f => f.id === lesson.folderId)?.name}
                            </span>
                          )}
                        </div>
                        <CommentBadge item={lesson} collectionName="lessons" userId={user!.uid} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSchedulingItem({item: lesson, type: 'lesson'}); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Agendar Revisão"
                        >
                          <CalendarClock className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, lesson.id, 'lessons')}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMovingItem({id: lesson.id, type: 'lessons'}); }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Mover para pasta"
                        >
                          <FolderPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Quizzes e Questões</h2>
              {filterByFolder(quizzes).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhum quiz nesta visualização.</p>
              ) : (
                <div className="space-y-4">
                  {filterByFolder(quizzes).map(quiz => (
                    <div 
                      key={quiz.id} 
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-green-500 flex justify-between items-start"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(quiz); setViewingType('quiz'); }}>
                        <TitleEditor
                          item={quiz}
                          collectionName="quizzes"
                          userId={user!.uid}
                          currentTitle={quiz.customTitle || `${quiz.subject} - ${quiz.topic}`}
                          onUpdate={(newTitle) => setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, customTitle: newTitle } : q))}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{quiz.data?.length || 0} questões</p>
                        <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span>Salvo em: {quiz.createdAt?.toDate().toLocaleDateString()}</span>
                          {quiz.folderId && folders.find(f => f.id === quiz.folderId) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              <FolderOpen className="w-3 h-3" />
                              {folders.find(f => f.id === quiz.folderId)?.name}
                            </span>
                          )}
                        </div>
                        <CommentBadge item={quiz} collectionName="quizzes" userId={user!.uid} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSchedulingItem({item: quiz, type: 'quiz'}); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Agendar Revisão"
                        >
                          <CalendarClock className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, quiz.id, 'quizzes')}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMovingItem({id: quiz.id, type: 'quizzes'}); }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Mover para pasta"
                        >
                          <FolderPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-2xl font-semibold mb-4 border-b pb-2 mt-8">Flashcards</h2>
              {filterByFolder(flashcards).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhum flashcard nesta visualização.</p>
              ) : (
                <div className="space-y-4">
                  {filterByFolder(flashcards).map(flash => (
                    <div 
                      key={flash.id} 
                      className="group relative p-4 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-indigo-500 flex justify-between items-start"
                    >
                      <div className="cursor-pointer flex-grow" onClick={() => { setViewingContent(flash); setViewingType('flashcard'); }}>
                        <TitleEditor
                          item={flash}
                          collectionName="flashcards"
                          userId={user!.uid}
                          currentTitle={flash.customTitle || `${flash.subject} - ${flash.topic}`}
                          onUpdate={(newTitle) => setFlashcards(prev => prev.map(f => f.id === flash.id ? { ...f, customTitle: newTitle } : f))}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{flash.data?.length || 0} flashcards</p>
                        <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span>Salvo em: {flash.createdAt?.toDate().toLocaleDateString()}</span>
                          {flash.folderId && folders.find(f => f.id === flash.folderId) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              <FolderOpen className="w-3 h-3" />
                              {folders.find(f => f.id === flash.folderId)?.name}
                            </span>
                          )}
                        </div>
                        <CommentBadge item={flash} collectionName="flashcards" userId={user!.uid} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSchedulingItem({item: flash, type: 'flashcard'}); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Agendar Revisão"
                        >
                          <CalendarClock className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, flash.id, 'flashcards')}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMovingItem({id: flash.id, type: 'flashcards'}); }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Mover para pasta"
                        >
                          <FolderPlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Move to Folder Modal */}
        {movingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setMovingItem(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-purple-600" />
                Mover para Pasta
              </h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                <button
                  onClick={() => moveToFolder(movingItem.id, movingItem.type, null)}
                  className="w-full text-left p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-yellow-300 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  ✖ Remover da pasta atual
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => moveToFolder(movingItem.id, movingItem.type, folder.id)}
                    className="w-full text-left p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{folder.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMovingItem(null)}
                className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {schedulingItem && (
          <ScheduleRevisionModal 
            user={user} 
            item={schedulingItem.item} 
            type={schedulingItem.type} 
            onClose={() => setSchedulingItem(null)} 
            onScheduled={() => {
              setSchedulingItem(null);
              alert("Revisão agendada com sucesso! Confira na aba Cronograma.");
            }} 
          />
        )}
      </main>
    </div>
  );
}
