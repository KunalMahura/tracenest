import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';

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
      navigate('/overview');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4EF] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient aesthetic blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-[#CADFD5]/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-[#B58859]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#508167]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#508167]/15 rounded-2xl border border-[#508167]/30 mb-4 shadow-sm text-[#508167]">
            <Activity size={28} />
          </div>
          <h1 className="text-3xl font-bold text-[#1D2621] font-display-hero tracking-tight">TraceNest</h1>
          <p className="text-[#67786E] text-xs mt-1.5 font-medium">Self-hosted observability and APM platform</p>
        </div>

        {/* Card */}
        <div className="card shadow-xl shadow-stone-900/5 bg-white border border-[#E2DAD0] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1D2621]">Sign In</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#CADFD5]/60 text-[#2C493A] font-bold">
              v2.4
            </span>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#67786E] mb-1.5 font-semibold">Email address</label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                />
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A69E]" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#67786E] mb-1.5 font-semibold">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  className="input pl-9"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A69E]" />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-60 cursor-pointer shadow-md"
            >
              <span>{loading ? 'Authenticating…' : 'Sign In to Console'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <p className="text-center text-xs text-[#67786E] mt-5 font-medium">
            Demo credentials are pre-filled for sandbox preview.
          </p>

          <div className="mt-5 pt-4 border-t border-[#E2DAD0] text-center">
            <Link to="/landing" className="text-xs text-[#508167] hover:text-[#3D6550] font-semibold transition-colors">
              ← Return to TraceNest Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
