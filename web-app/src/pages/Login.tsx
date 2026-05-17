import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu email no campo acima para redefinir a senha.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de redefinição.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-indigo-600 mb-6">
          {isRegistering ? 'Criar Conta' : 'Entrar no EduGenius'}
        </h2>
        {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded">{error}</div>}
        {message && <div className="mb-4 text-sm text-green-700 bg-green-100 p-3 rounded">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none"
          >
            {isRegistering ? 'Registrar' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
          {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-indigo-600 hover:underline focus:outline-none"
          >
            {isRegistering ? 'Faça login' : 'Crie uma'}
          </button>
        </p>
      </div>
    </div>
  );
}
