import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell, { Field, FormError } from '../components/AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
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
    <AuthShell
      title={<>Welcome <span className="italic">back.</span></>}
      subtitle="Sign in to see what your apps have been up to."
      footer={<>New to TraceNest? <Link to="/register" className="text-ink font-semibold underline decoration-vermilion-500 decoration-2 underline-offset-4">Create a free account</Link></>}
    >
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="login-email" label="Email" type="email" icon={Mail} value={email}
          onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" autoComplete="email" />
        <Field id="login-password" label="Password" type="password" icon={Lock} value={password}
          onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password" />
        <button id="login-submit" type="submit" disabled={loading} className="btn-primary w-full !py-3 mt-2 cursor-pointer">
          {loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={15} />
        </button>
      </form>
    </AuthShell>
  );
}
