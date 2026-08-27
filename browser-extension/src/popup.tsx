import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { BookOpen, LogOut, CheckCircle, Trophy } from 'lucide-react';

function Popup() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [points, setPoints] = useState(0);

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
