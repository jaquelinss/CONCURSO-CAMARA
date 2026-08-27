import { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { StickyNote, BookOpen, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

// ==================== AUTO TRACKER ====================
let lastAwardedAt = 0;
const COOLDOWN_MS = 15000; // 15s cooldown between awards
let lastSeenText = ''; // Track what we already detected

function tryAwardPoints() {
  chrome.runtime.sendMessage({ action: 'AWARD_POINTS', amount: 10 }, (response) => {
    if (response?.success) {
      showToast('🎉 +10 Pontos de esforço!');
    }
  });
}

function checkForAnswers(text: string) {
  const lower = text.toLowerCase();
  const answerPatterns = [
    'resposta incorreta', 'resposta correta',
    'correta!', 'incorreta!',
    'acertou', 'parabéns',
    'a resposta era', 'a alternativa correta',
    'correct', 'incorrect',
    'you got it', 'try again'
  ];
  return answerPatterns.some(p => lower.includes(p));
}

// Method 1: MutationObserver (catches new DOM nodes)
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const text = node.textContent || '';
          if (checkForAnswers(text) && text !== lastSeenText && Date.now() - lastAwardedAt > COOLDOWN_MS) {
            lastAwardedAt = Date.now();
            lastSeenText = text;
            tryAwardPoints();
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Method 2: Periodic DOM scanner (catches content shown/hidden via CSS)
function setupPeriodicScanner() {
  setInterval(() => {
    const allText = document.body.innerText;
    if (checkForAnswers(allText) && allText !== lastSeenText && Date.now() - lastAwardedAt > COOLDOWN_MS) {
      lastAwardedAt = Date.now();
      lastSeenText = allText;
      tryAwardPoints();
    }
  }, 3000); // scan every 3 seconds
}

// Start both detection methods
setupMutationObserver();
setupPeriodicScanner();

// ==================== TOAST ====================
function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '9999999',
    background: '#10b981', color: 'white', padding: '12px 20px',
    borderRadius: '10px', fontFamily: 'sans-serif', fontWeight: 'bold',
    fontSize: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    transition: 'opacity 0.5s', opacity: '1'
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

// ==================== FLOATING WIDGET (notes only, no hack button) ====================
// Only render the full widget on the main frame, not inside iframes
const isMainFrame = window === window.top;

function FloatingTracker() {
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'postit' | 'flashcard'>('postit');
  const [noteSaving, setNoteSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Fetch points on mount
  useState(() => {
    chrome.runtime.sendMessage({ action: 'GET_POINTS' }, (response) => {
      if (response?.success) setTotalPoints(response.points);
    });
  });

  // Listen for point updates from iframes
  const refreshPoints = useCallback(() => {
    chrome.runtime.sendMessage({ action: 'GET_POINTS' }, (response) => {
      if (response?.success) setTotalPoints(response.points);
    });
  }, []);

  // Refresh every 5s
  useState(() => {
    const interval = setInterval(refreshPoints, 5000);
    return () => clearInterval(interval);
  });

  const saveNote = useCallback(() => {
    const text = noteText.trim() || window.getSelection()?.toString()?.trim() || '';
    if (!text) return;
    setNoteSaving(true);
    chrome.runtime.sendMessage({
      action: 'CREATE_NOTE', text, isFlashcard: noteType === 'flashcard'
    }, (response) => {
      setNoteSaving(false);
      if (response?.success) {
        setNoteText('');
        setShowNoteForm(false);
        showToast(noteType === 'flashcard' ? '📋 Flashcard salvo!' : '📝 Post-it salvo!');
      } else {
        showToast('❌ Erro: ' + (response?.error || 'desconhecido'));
      }
    });
  }, [noteText, noteType]);

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999,
          background: '#4f46e5', color: 'white', width: '48px', height: '48px',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
          fontFamily: 'sans-serif', fontSize: '20px'
        }}
        title="Abrir Estudo Tracker"
      >📚</div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999,
      background: 'white', borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)', fontFamily: 'sans-serif',
      border: '1px solid #e5e7eb', width: '260px', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white',
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer'
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={16} />
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Estudo Câmara</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalPoints !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '12px' }}>
              <Trophy size={12} />
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{totalPoints}</span>
            </div>
          )}
          {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          <button onClick={(e) => { e.stopPropagation(); setMinimized(true); }} style={{
            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer',
            fontSize: '16px', lineHeight: 1, padding: 0
          }}>−</button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '10px' }}>
          <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 8px 0', textAlign: 'center' }}>
            ⚡ Pontos automáticos ao responder questões
          </p>

          {!showNoteForm ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { setNoteType('postit'); setShowNoteForm(true); setNoteText(window.getSelection()?.toString() || ''); }} style={{
                flex: 1, background: '#fef08a', color: '#78350f', border: '1px solid #fde047',
                padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <StickyNote size={14} /> Post-it
              </button>
              <button onClick={() => { setNoteType('flashcard'); setShowNoteForm(true); setNoteText(window.getSelection()?.toString() || ''); }} style={{
                flex: 1, background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd',
                padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <BookOpen size={14} /> Flashcard
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={noteType === 'flashcard' ? 'Frente do flashcard...' : 'Conteúdo do post-it...'}
                style={{
                  width: '100%', minHeight: '60px', padding: '8px', borderRadius: '8px',
                  border: '1px solid #d1d5db', fontSize: '12px', resize: 'vertical',
                  fontFamily: 'sans-serif', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button onClick={() => setShowNoteForm(false)} style={{
                  flex: 1, background: '#f3f4f6', color: '#6b7280', border: 'none',
                  padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                }}>Cancelar</button>
                <button onClick={saveNote} disabled={noteSaving} style={{
                  flex: 1, background: '#4f46e5', color: 'white', border: 'none',
                  padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                }}>{noteSaving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== INJECT ====================
// Only show the widget UI on the main frame (not inside each iframe)
if (isMainFrame) {
  const container = document.createElement('div');
  container.id = 'estudo-camara-tracker-root';
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<FloatingTracker />);
}
