import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { BookOpen, LogOut, CheckCircle, Trophy, StickyNote, Headphones, Pause, Play, Volume2, CloudRain, Waves } from 'lucide-react';

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  return isDark;
}

function Popup() {
  const isDark = useDarkMode();
  const theme = {
    bg: isDark ? '#111827' : '#f9fafb',
    panelBg: isDark ? '#1f2937' : 'white',
    textMain: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    inputBg: isDark ? '#374151' : 'white',
    postitBtnBg: isDark ? '#854d0e' : '#fef08a',
    postitBtnColor: isDark ? '#fef08a' : '#78350f',
    postitBtnBorder: isDark ? '#713f12' : '#fde047',
    flashcardBtnBg: isDark ? '#1e3a8a' : '#dbeafe',
    flashcardBtnColor: isDark ? '#bfdbfe' : '#1e40af',
    flashcardBtnBorder: isDark ? '#1e3a8a' : '#93c5fd',
    soundActiveBg: isDark ? '#064e3b' : '#ecfdf5',
    soundActiveColor: isDark ? '#34d399' : '#047857',
    soundHoverBg: isDark ? '#374151' : 'transparent',
    playBtnBg: isDark ? '#1e3a8a' : '#dbeafe',
    playBtnColor: isDark ? '#bfdbfe' : '#1d4ed8',
    playBtnInactiveBg: isDark ? '#374151' : '#f3f4f6',
    playBtnInactiveColor: isDark ? '#9ca3af' : '#4b5563',
    titleColor: isDark ? '#818cf8' : '#4f46e5',
    successBg: isDark ? '#064e3b' : '#ecfdf5',
    successColor: isDark ? '#34d399' : '#065f46',
    panelHeaderColor: isDark ? '#93c5fd' : '#1e3a8a',
    dangerColor: isDark ? '#f87171' : '#ef4444',
  };
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [points, setPoints] = useState(0);

  const [noteType, setNoteType] = useState<'postit' | 'flashcard'>('postit');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [backText, setBackText] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Audio State
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const sounds = [
    { id: 'white', name: 'Ruído Branco (Estático)', icon: CloudRain, type: 'ruido' },
    { id: 'pink', name: 'Ruído Rosa (Suave)', icon: CloudRain, type: 'ruido' },
    { id: 'brown', name: 'Ruído Marrom (Profundo)', icon: CloudRain, type: 'ruido' },
    { id: 'beta', name: 'Ondas Beta (Foco Intenso)', icon: Waves, type: 'binaural' },
    { id: 'alpha', name: 'Ondas Alpha (Estudo Relaxado)', icon: Waves, type: 'binaural' },
    { id: 'theta', name: 'Ondas Theta (Criatividade)', icon: Waves, type: 'binaural' }
  ];

  useEffect(() => {
    // Load saved audio state from local storage so it persists when popup opens
    chrome.storage.local.get(['currentSound', 'isPlaying', 'volume'], (result) => {
      if (result.currentSound) setCurrentSound(result.currentSound);
      if (result.isPlaying) setIsPlaying(result.isPlaying);
      if (result.volume !== undefined) setVolume(result.volume);
    });
  }, []);

  const playAudio = (id: string, startPlaying: boolean = true) => {
    chrome.runtime.sendMessage({ action: 'PLAY_AUDIO', type: id, volume });
    setCurrentSound(id);
    setIsPlaying(startPlaying);
    chrome.storage.local.set({ currentSound: id, isPlaying: startPlaying });
  };

  const togglePlay = () => {
    if (isPlaying) {
      chrome.runtime.sendMessage({ action: 'STOP_AUDIO' });
      setIsPlaying(false);
      chrome.storage.local.set({ isPlaying: false });
    } else {
      if (currentSound) {
        playAudio(currentSound, true);
      }
    }
  };

  const changeVolume = (newVol: number) => {
    setVolume(newVol);
    chrome.runtime.sendMessage({ action: 'SET_VOLUME', volume: newVol });
    chrome.storage.local.set({ volume: newVol });
  };

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
      title: noteTitle.trim(),
      text: noteText.trim(),
      backText: backText.trim(),
      isFlashcard: noteType === 'flashcard'
    }, (response) => {
      setNoteSaving(false);
      if (response?.success) {
        setNoteTitle('');
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

  if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif', background: theme.bg, color: theme.textMain, minHeight: '100%' }}>Carregando...</div>;

  return (
    <div style={{ padding: '20px', background: theme.bg, color: theme.textMain, minHeight: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: theme.titleColor }}>
        <BookOpen size={22} />
        <h2 style={{ margin: 0, fontSize: '16px' }}>Estudo Câmara Tracker</h2>
      </div>

      {!user ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 8px 0' }}>
            Faça login com a mesma conta do app principal para ganhar pontos.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid ' + theme.border, fontSize: '13px', background: theme.inputBg, color: theme.textMain }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid ' + theme.border, fontSize: '13px', background: theme.inputBg, color: theme.textMain }}
          />
          {error && <p style={{ color: theme.dangerColor, fontSize: '11px', margin: 0 }}>{error}</p>}
          <button type="submit" style={{ padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            Entrar
          </button>
        </form>
      ) : (
        <div>
          <div style={{ background: theme.successBg, color: theme.successColor, padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
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
                    flex: 1, background: theme.postitBtnBg, color: theme.postitBtnColor, border: '1px solid ' + theme.postitBtnBorder,
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    <StickyNote size={14} /> Post-it
                  </button>
                  <button onClick={() => { setNoteType('flashcard'); setIsAiMode(false); setShowNoteForm(true); }} style={{
                    flex: 1, background: theme.flashcardBtnBg, color: theme.flashcardBtnColor, border: '1px solid ' + theme.flashcardBtnBorder,
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
                    flex: 1, background: theme.postitBtnBg, color: theme.postitBtnColor, border: '1px solid ' + theme.postitBtnBorder,
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
                    flex: 1, background: theme.flashcardBtnBg, color: theme.flashcardBtnColor, border: '1px solid ' + theme.flashcardBtnBorder,
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    ✨ IA: Flashcard
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: theme.panelBg, padding: '10px', borderRadius: '8px', border: '1px solid ' + theme.border }}>
                {!isAiMode && (
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Título (Opcional)"
                    style={{
                      width: '100%', padding: '8px', borderRadius: '8px',
                      border: '1px solid ' + theme.border, fontSize: '12px',
                      fontFamily: 'sans-serif', boxSizing: 'border-box', marginBottom: '6px'
                    }}
                  />
                )}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={isAiMode ? "Cole o texto aqui para a IA gerar..." : (noteType === 'flashcard' ? 'Frente do flashcard (cole ou digite)...' : 'Conteúdo do post-it (cole ou digite)...')}
                  style={{
                    width: '100%', minHeight: '60px', padding: '8px', borderRadius: '8px',
                    border: '1px solid ' + theme.border, fontSize: '12px', resize: 'vertical',
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
                      border: '1px solid ' + theme.border, fontSize: '12px', resize: 'vertical',
                      fontFamily: 'sans-serif', boxSizing: 'border-box', marginTop: '6px'
                    }}
                  />
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button onClick={() => setShowNoteForm(false)} style={{
                    flex: 1, background: '#f3f4f6', color: theme.textMuted, border: 'none',
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

          <div style={{ background: theme.panelBg, border: '1px solid ' + theme.border, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.panelHeaderColor, fontWeight: 'bold', fontSize: '13px' }}>
                <Headphones size={16} /> Sons de Foco
              </div>
              <button 
                onClick={togglePlay}
                style={{ 
                  background: isPlaying ? theme.playBtnBg : theme.playBtnInactiveBg, 
                  color: isPlaying ? theme.playBtnColor : theme.playBtnInactiveColor, 
                  border: 'none', borderRadius: '50%', width: '32px', height: '32px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '6px' }}>Ruídos (Foco & Bloqueio)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              {sounds.filter(s => s.type === 'ruido').map(s => (
                <div 
                  key={s.id} 
                  onClick={() => playAudio(s.id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', 
                    borderRadius: '6px', cursor: 'pointer',
                    background: currentSound === s.id ? theme.soundActiveBg : theme.soundHoverBg,
                    color: currentSound === s.id ? theme.soundActiveColor : theme.textMain,
                    fontWeight: currentSound === s.id ? 'bold' : 'normal'
                  }}>
                  <s.icon size={14} /> <span style={{ fontSize: '12px' }}>{s.name}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 'bold', marginBottom: '6px' }}>Binaural (Ondas Cerebrais)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              {sounds.filter(s => s.type === 'binaural').map(s => (
                <div 
                  key={s.id} 
                  onClick={() => playAudio(s.id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', 
                    borderRadius: '6px', cursor: 'pointer',
                    background: currentSound === s.id ? theme.soundActiveBg : theme.soundHoverBg,
                    color: currentSound === s.id ? theme.soundActiveColor : theme.textMain,
                    fontWeight: currentSound === s.id ? 'bold' : 'normal'
                  }}>
                  <s.icon size={14} /> <span style={{ fontSize: '12px' }}>{s.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
              <Volume2 size={14} />
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={volume} 
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#4f46e5' }}
              />
            </div>
          </div>

          <p style={{ fontSize: '11px', color: theme.textMuted, margin: '0 0 12px 0', lineHeight: '1.4' }}>
            Abra o quiz no Gemini e clique em <strong>"Ganhar Pontos"</strong> ao responder questões.
          </p>

          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px', background: 'transparent', color: theme.dangerColor, border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
