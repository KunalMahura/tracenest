import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState('demo@tracenest.dev');
  const [password, setPassword] = useState('secret123');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600/20 rounded-2xl border border-brand-500/30 mb-4">
            <Activity size={28} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">TraceNest</h1>
          <p className="text-slate-400 text-sm mt-1">Self-hosted observability platform</p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/60 border border-red-900 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
              <input
                id="login-email"
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
              <input
                id="login-password"
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            Demo credentials are pre-filled. Just click Sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
