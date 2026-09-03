import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { BookOpen, LogOut, CheckCircle, Trophy, StickyNote } from 'lucide-react';

function Popup() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [points, setPoints] = useState(0);

  const [noteType, setNoteType] = useState<'postit' | 'flashcard'>('postit');
  const [noteText, setNoteText] = useState('');
  const [backText, setBackText] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Listen to points in real-time when logged in
  useEffect(() => {
    if (!user) { setPoints(0); return; }
    const docRef = doc(db, 'users', user.uid, 'settings', 'rewards');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setPoints(snap.data().effortPoints || 0);
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (showNoteForm) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || ''
          }, (results) => {
            if (results && results[0] && results[0].result) {
              setNoteText(results[0].result);
            }
          });
        }
      });
    }
  }, [showNoteForm]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao fazer login.');
      setLoading(false);
    }
  };

  const saveNote = () => {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    chrome.runtime.sendMessage({
      action: 'CREATE_NOTE',
      text: noteText.trim(),
      backText: backText.trim(),
      isFlashcard: noteType === 'flashcard'
    }, (response) => {
      setNoteSaving(false);
      if (response?.success) {
        setNoteText('');
        setBackText('');
        setShowNoteForm(false);
        setSaveMessage(noteType === 'flashcard' ? 'Flashcard salvo!' : 'Post-it salvo!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Erro: ' + (response?.error || 'desconhecido'));
        setTimeout(() => setSaveMessage(''), 3000);
      }
    });
  };

  if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Carregando...</div>;

  return (
    <div style={{ padding: '20px', background: '#f9fafb', minHeight: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#4f46e5' }}>
        <BookOpen size={22} />
        <h2 style={{ margin: 0, fontSize: '16px' }}>Estudo Câmara Tracker</h2>
      </div>

      {!user ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>
            Faça login com a mesma conta do app principal para ganhar pontos.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '11px', margin: 0 }}>{error}</p>}
          <button type="submit" style={{ padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            Entrar
          </button>
        </form>
      ) : (
        <div>
          <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <CheckCircle size={18} />
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px' }}>Conectado!</p>
              <p style={{ margin: 0, fontSize: '11px', opacity: 0.7 }}>{user.email}</p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '16px', borderRadius: '10px', marginBottom: '12px', textAlign: 'center' }}>
            <Trophy size={28} style={{ marginBottom: '6px' }} />
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{points}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Pontos de Esforço</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            {!showNoteForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { setNoteType('postit'); setIsAiMode(false); setShowNoteForm(true); }} style={{
                    flex: 1, background: '#fef08a', color: '#78350f', border: '1px solid #fde047',
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    <StickyNote size={14} /> Post-it
                  </button>
                  <button onClick={() => { setNoteType('flashcard'); setIsAiMode(false); setShowNoteForm(true); }} style={{
                    flex: 1, background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd',
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    <BookOpen size={14} /> Flashcard
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                      const tab = tabs[0];
                      if (tab && tab.id) {
                        chrome.scripting.executeScript({
                          target: { tabId: tab.id },
                          func: () => window.getSelection()?.toString() || ''
                        }, (results) => {
                          const text = results?.[0]?.result || '';
                          if (text) {
                            setNoteSaving(true);
                            setSaveMessage('Gerando Post-it...');
                            chrome.runtime.sendMessage({
                              action: 'GENERATE_NOTE_WITH_AI',
                              text: text,
                              isFlashcard: false
                            }, (response) => {
                              setNoteSaving(false);
                              if (response?.success) {
                                setSaveMessage('✨ Post-it gerado e salvo!');
                                setTimeout(() => setSaveMessage(''), 3000);
                              } else {
                                setSaveMessage('❌ Erro: ' + (response?.error || 'Desconhecido'));
                                setTimeout(() => setSaveMessage(''), 3000);
                              }
                            });
                          } else {
                            // Fallback: open form for paste
                            setNoteType('postit');
                            setIsAiMode(true);
                            setNoteText('');
                            setShowNoteForm(true);
                          }
                        });
                      } else {
                        setNoteType('postit');
                        setIsAiMode(true);
                        setNoteText('');
                        setShowNoteForm(true);
                      }
                    });
                  }} disabled={noteSaving} style={{
                    flex: 1, background: '#fef08a', color: '#78350f', border: '1px solid #fde047',
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    ✨ IA: Post-it
                  </button>
                  <button onClick={() => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                      const tab = tabs[0];
                      if (tab && tab.id) {
                        chrome.scripting.executeScript({
                          target: { tabId: tab.id },
                          func: () => window.getSelection()?.toString() || ''
                        }, (results) => {
                          const text = results?.[0]?.result || '';
                          if (text) {
                            setNoteSaving(true);
                            setSaveMessage('Gerando Flashcard...');
                            chrome.runtime.sendMessage({
                              action: 'GENERATE_NOTE_WITH_AI',
                              text: text,
                              isFlashcard: true
                            }, (response) => {
                              setNoteSaving(false);
                              if (response?.success) {
                                setSaveMessage('✨ Flashcard gerado e salvo!');
                                setTimeout(() => setSaveMessage(''), 3000);
                              } else {
                                setSaveMessage('❌ Erro: ' + (response?.error || 'Desconhecido'));
                                setTimeout(() => setSaveMessage(''), 3000);
                              }
                            });
                          } else {
                            // Fallback: open form for paste
                            setNoteType('flashcard');
                            setIsAiMode(true);
                            setNoteText('');
                            setShowNoteForm(true);
                          }
                        });
                      } else {
                        setNoteType('flashcard');
                        setIsAiMode(true);
                        setNoteText('');
                        setShowNoteForm(true);
                      }
                    });
                  }} disabled={noteSaving} style={{
                    flex: 1, background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd',
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    ✨ IA: Flashcard
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={isAiMode ? "Cole o texto aqui para a IA gerar..." : (noteType === 'flashcard' ? 'Frente do flashcard (cole ou digite)...' : 'Conteúdo do post-it (cole ou digite)...')}
                  style={{
                    width: '100%', minHeight: '60px', padding: '8px', borderRadius: '8px',
                    border: '1px solid #d1d5db', fontSize: '12px', resize: 'vertical',
                    fontFamily: 'sans-serif', boxSizing: 'border-box'
                  }}
                />
                {!isAiMode && noteType === 'flashcard' && (
                  <textarea
                    value={backText}
                    onChange={(e) => setBackText(e.target.value)}
                    placeholder="Verso do flashcard (opcional)..."
                    style={{
                      width: '100%', minHeight: '60px', padding: '8px', borderRadius: '8px',
                      border: '1px solid #d1d5db', fontSize: '12px', resize: 'vertical',
                      fontFamily: 'sans-serif', boxSizing: 'border-box', marginTop: '6px'
                    }}
                  />
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button onClick={() => setShowNoteForm(false)} style={{
                    flex: 1, background: '#f3f4f6', color: '#6b7280', border: 'none',
                    padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                  }}>Cancelar</button>
                  <button onClick={() => {
                    if (isAiMode) {
                      if (!noteText.trim()) {
                         setSaveMessage('⚠️ Cole um texto primeiro!');
                         setTimeout(() => setSaveMessage(''), 3000);
                         return;
                      }
                      setNoteSaving(true);
                      setSaveMessage('Gerando...');
                      chrome.runtime.sendMessage({
                        action: 'GENERATE_NOTE_WITH_AI',
                        text: noteText.trim(),
                        isFlashcard: noteType === 'flashcard'
                      }, (response) => {
                        setNoteSaving(false);
                        if (response?.success) {
                          setNoteText('');
                          setBackText('');
                          setShowNoteForm(false);
                          setSaveMessage(`✨ ${noteType === 'flashcard' ? 'Flashcard' : 'Post-it'} gerado e salvo!`);
                          setTimeout(() => setSaveMessage(''), 3000);
                        } else {
                          setSaveMessage('❌ Erro: ' + (response?.error || 'Desconhecido'));
                          setTimeout(() => setSaveMessage(''), 3000);
                        }
                      });
                    } else {
                      saveNote();
                    }
                  }} disabled={noteSaving} style={{
                    flex: 1, background: '#4f46e5', color: 'white', border: 'none',
                    padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                  }}>{noteSaving ? 'Salvando...' : (isAiMode ? '✨ Gerar com IA' : 'Salvar')}</button>
                </div>
              </div>
            )}
            {saveMessage && <p style={{ fontSize: '12px', color: '#10b981', textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>{saveMessage}</p>}
          </div>

          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 12px 0', lineHeight: '1.4' }}>
            Abra o quiz no Gemini e clique em <strong>"Ganhar Pontos"</strong> ao responder questões.
          </p>

          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px', background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
