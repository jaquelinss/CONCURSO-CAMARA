function LinkedContentManagerModal({
  isOpen, onClose, type, ids, user, db, onUnlink, onOpen
}: {
  isOpen: boolean; onClose: () => void; type: 'lesson' | 'quiz' | 'flashcard'; ids: string[]; user: any; db: any;
  onUnlink: (idToRemove: string) => Promise<void>;
  onOpen: (id: string, type: 'lesson' | 'quiz' | 'flashcard') => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchItems = async () => {
      setLoading(true);
      const collectionName = type === 'lesson' ? 'lessons' : type === 'quiz' ? 'quizzes' : 'flashcards';
      const fetched = [];
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid, collectionName, id));
          if (snap.exists()) {
            fetched.push({ id: snap.id, ...snap.data() });
          } else {
            fetched.push({ id, deleted: true });
          }
        } catch (e) {
          fetched.push({ id, deleted: true });
        }
      }
      if (isMounted) {
        setItems(fetched);
        setLoading(false);
      }
    };
    fetchItems();
    return () => { isMounted = false; };
  }, [isOpen, ids, type, user, db]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-200">
            {type === 'lesson' ? 'Aulas Vinculadas' : type === 'quiz' ? 'Quizzes Vinculados' : 'Flashcards Vinculados'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-indigo-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">Nenhum conteúdo vinculado.</p>
          ) : (
            items.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div className="flex-1 min-w-0 pr-3">
                  {item.deleted ? (
                    <div className="flex items-center gap-1.5 text-red-500">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-semibold truncate">Conteúdo excluído</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold truncate">
                          {item.customTitle || (type === 'lesson' ? item.data?.titulo : undefined) || \\ - \\}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pt-BR') : 'Data desc.'}
                        </div>
                        {type !== 'lesson' && (
                          <div className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-bold">
                            {item.data?.length || 0} {type === 'quiz' ? 'questões' : 'cards'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!item.deleted && (
                    <button
                      onClick={() => onOpen(item.id, type)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Abrir conteúdo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      setUnlinkingId(item.id);
                      await onUnlink(item.id);
                      setUnlinkingId(null);
                      if (items.length === 1) onClose();
                    }}
                    disabled={unlinkingId === item.id}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Desvincular"
                  >
                    {unlinkingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
