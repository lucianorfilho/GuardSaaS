'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    api.get(`/api/password/validate/${token}`)
      .then(res => setValid(res.data.valid))
      .catch(() => setValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('As senhas não coincidem');
    if (password.length < 8) return setError('A senha deve ter no mínimo 8 caracteres');
    setLoading(true);
    setError('');
    try {
      await api.post('/api/password/reset', { token, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
      {valid === null && (
        <div className="flex items-center justify-center h-24">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {valid === false && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-2">Link inválido ou expirado</h2>
          <p className="text-gray-400 text-sm mb-6">Este link de recuperação não é válido ou já expirou.</p>
          <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">
            Solicitar novo link
          </Link>
        </div>
      )}
      {valid === true && !success && (
        <>
          <h2 className="text-xl font-semibold text-white mb-2">Nova senha</h2>
          <p className="text-gray-400 text-sm mb-6">Digite e confirme sua nova senha.</p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Nova senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" required minLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirmar nova senha</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha" required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-2.5 transition">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        </>
      )}
      {success && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-2">Senha redefinida!</h2>
          <p className="text-gray-400 text-sm">Redirecionando para o login...</p>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">DBGuard</h1>
          <p className="text-gray-400 mt-1">Redefinir senha</p>
        </div>
        <Suspense fallback={
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-gray-600 text-sm mt-6">DBGuard © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
